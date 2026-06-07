// @cohbit/tlt-atlas — TLT Summary Generator (v9.2)
// Evidence-aware, mode-filtered summary generator.
// Layers audience-appropriate filtering on top of the v9.0–v9.1
// voice pipeline. Produces internal, public, technical, LinkedIn,
// and reviewer-safe summaries from TLT graph state.
//
// Operating law:
//   Voice may explain graph state.
//   Voice may not upgrade graph state.
//   Public language must inherit evidence limits from the graph.
//
// Summary modes:
//   internal  — full data, no filtering, all evidence levels
//   public    — rewritten terms, downgraded claims, limitations included
//   technical — domain terms allowed, evidence gaps flagged
//   linkedin  — strong downgrade, no claim verbs above evidence,
//               humble tone, peer-inviting posture
//   reviewer  — all flags preserved, proof debt explicit, file/line refs

import type { TltGraphNode, TltGraphEdge, TltTransformResult } from './T_tlt_transformer.js';
import type { VoiceStatement, VoiceResult } from './T_tlt_voice.js';
import { renderGraphToVoice, renderExecutiveSummary, resetVoiceCounter } from './T_tlt_voice.js';
import { checkClaimStrength, assessNodeStrength, downgradeClaimLanguage, type EvidenceStrength, type ClaimStrengthViolation } from './T_claim_guard.js';
import { checkPublicBoundary, isPublicFacing, rewriteForPublic, detectInternalTermLeaks } from './T_public_internal_boundary.js';
import { MEANING_INVARIANTS, type MeaningInvariant } from './L5_meaning_invariant.js';
import { detectPhilosophyOverclaim } from './philosophy/philosophy_guards.js';

// ─── Summary Types ───────────────────────────────────────────────

export type SummaryMode = 'internal' | 'public' | 'technical' | 'linkedin' | 'reviewer';

export interface SummarySection {
    header: string;
    body: string;
    limitations: string[];
    evidenceLevel: EvidenceStrength | 'none';
    receiptRequired: boolean;
    nodeCount: number;
    downgradedVerbs: string[];
}

export interface ModeConfig {
    mode: SummaryMode;
    label: string;
    internalTermsPolicy: 'allowed' | 'rewritten' | 'removed';
    claimStrengthPolicy: 'preserved' | 'flagged' | 'downgraded';
    toneTarget: string;
    includeLimitations: boolean;
    maxClaimStrength: EvidenceStrength;  // cap: claims above this are downgraded
}

export interface EvidenceAwareSummary {
    mode: SummaryMode;
    modeLabel: string;
    sections: SummarySection[];
    totalWarnings: number;
    downgradeCount: number;
    limitationCount: number;
    canonSafe: boolean;
    generatedAt: string;
}

// ─── Mode Configurations ────────────────────────────────────────

const MODE_CONFIGS: Record<SummaryMode, ModeConfig> = {
    internal: {
        mode: 'internal',
        label: 'Internal Technical Summary',
        internalTermsPolicy: 'allowed',
        claimStrengthPolicy: 'flagged',
        toneTarget: 'technical/neutral',
        includeLimitations: false,
        maxClaimStrength: 'release_approved',
    },
    public: {
        mode: 'public',
        label: 'Public-Facing Summary',
        internalTermsPolicy: 'rewritten',
        claimStrengthPolicy: 'downgraded',
        toneTarget: 'professional, no internal jargon',
        includeLimitations: true,
        maxClaimStrength: 'receipt_available',
    },
    technical: {
        mode: 'technical',
        label: 'Technical Domain Summary',
        internalTermsPolicy: 'allowed',
        claimStrengthPolicy: 'flagged',
        toneTarget: 'domain-specific precision',
        includeLimitations: true,
        maxClaimStrength: 'ctrl_verified',
    },
    linkedin: {
        mode: 'linkedin',
        label: 'LinkedIn-Safe Summary',
        internalTermsPolicy: 'removed',
        claimStrengthPolicy: 'downgraded',
        toneTarget: 'humble, peer-inviting, accessible',
        includeLimitations: true,
        maxClaimStrength: 'needs_evidence',
    },
    reviewer: {
        mode: 'reviewer',
        label: 'Reviewer-Facing Summary',
        internalTermsPolicy: 'allowed',
        claimStrengthPolicy: 'flagged',
        toneTarget: 'structured, evidence-linked',
        includeLimitations: true,
        maxClaimStrength: 'release_approved',
    },
};

// ─── Strength comparison helpers ─────────────────────────────────

const STRENGTH_RANK: Record<EvidenceStrength, number> = {
    surface_detected: 0,
    needs_evidence: 1,
    receipt_available: 2,
    ctrl_verified: 3,
    release_approved: 4,
};

function exceedsMaxStrength(actual: EvidenceStrength, max: EvidenceStrength): boolean {
    return STRENGTH_RANK[actual] > STRENGTH_RANK[max];
}

// ─── Mode-aware filtering ────────────────────────────────────────

/**
 * Apply mode-specific claim strength policy to a node's source text.
 * Returns the (possibly downgraded) text safe for the target audience.
 */
function applyStrengthPolicy(text: string, node: TltGraphNode, config: ModeConfig): { text: string; downgraded: boolean; downgradedVerbs: string[] } {
    if (config.claimStrengthPolicy === 'preserved') {
        return { text, downgraded: false, downgradedVerbs: [] };
    }

    const assessment = checkClaimStrength(node);

    if (config.claimStrengthPolicy === 'flagged' && !assessment.isHonest) {
        // Flag but don't rewrite — append advisory marker
        // Note: flagged is NOT a downgrade; it preserves the original text with a flag
        const verbList = assessment.sourceVerbs.join(', ');
        return {
            text: `${text} [⚠ claim verbs (${verbList}) at evidence level ${assessment.actualStrength}]`,
            downgraded: false,  // flagging ≠ downgrading
            downgradedVerbs: [],
        };
    }

    if (config.claimStrengthPolicy === 'downgraded' && !assessment.isHonest) {
        // Actively downgrade
        const downgraded = downgradeClaimLanguage(text, node);
        return {
            text: downgraded,
            downgraded: true,
            downgradedVerbs: assessment.sourceVerbs,
        };
    }

    return { text, downgraded: false, downgradedVerbs: [] };
}

/**
 * Apply mode-specific internal terminology policy.
 */
function applyTermsPolicy(text: string, node: TltGraphNode, config: ModeConfig): string {
    if (config.internalTermsPolicy === 'allowed') return text;

    const leaks = detectInternalTermLeaks(text);
    if (leaks.length === 0) return text;

    if (config.internalTermsPolicy === 'rewritten') {
        return rewriteForPublic(text, leaks);
    }

    // 'removed' — replace internal terms with generic placeholders
    let result = text;
    for (const leak of leaks) {
        const termRegex = new RegExp(`\\b${leak.term.replace(/[- ]/g, '[- ]')}\\b`, 'gi');
        result = result.replace(termRegex, '[technical system]');
    }
    return result;
}

// ─── Limitation extraction ───────────────────────────────────────

/**
 * Extract limitations from graph state based on:
 * - receipted_by edges (nodes requiring verification)
 * - proof debt voice statements
 * - overclaim warnings
 * - receipt-required meaning invariants
 */
function extractLimitations(result: TltTransformResult): string[] {
    const limitations: string[] = [];
    const seen = new Set<string>();

    // Receipt-required invariants on nodes
    for (const node of result.nodes) {
        const minvs = node.matchedInvariants
            .map(id => MEANING_INVARIANTS.get(id))
            .filter(Boolean) as MeaningInvariant[];
        const receiptMinvs = minvs.filter(m => m.receiptRequired);
        for (const minv of receiptMinvs) {
            const key = `receipt:${minv.id}`;
            if (!seen.has(key)) {
                seen.add(key);
                limitations.push(`Receipt required for invariant ${minv.name} (${minv.id}): ${minv.failureModes.join(', ')}`);
            }
        }
    }

    // Evidence level limitations
    for (const node of result.nodes) {
        if (node.evidenceLevel === 'surface_detected' && (node.nodeType === 'claim' || node.nodeType === 'risk')) {
            const key = `surface:${node.sourceFile}:${node.lineApprox}`;
            if (!seen.has(key)) {
                seen.add(key);
                limitations.push(`Surface-detected claim at ${node.sourceFile}:${node.lineApprox} — not AST-verified or receipted.`);
            }
        }
    }

    // Overclaim risks
    const publicFacingClaims = result.nodes.filter(n =>
        n.nodeType === 'claim' &&
        n.matchedDomainContexts.includes('DOM_004') &&
        !n.matchedInvariants.some(id => MEANING_INVARIANTS.get(id)?.receiptRequired)
    );
    if (publicFacingClaims.length > 0 && !seen.has('overclaim')) {
        seen.add('overclaim');
        limitations.push(`${publicFacingClaims.length} public-facing claims lack receipt requirements — potential overclaim risk.`);
    }

    return limitations;
}

// ─── Section building ───────────────────────────────────────────

/**
 * Build summary sections from voice output, filtered by mode.
 */
function buildSections(
    result: TltTransformResult,
    voiceResult: VoiceResult,
    config: ModeConfig,
): SummarySection[] {
    const sections: SummarySection[] = [];

    // Group voice statements by category
    const byCategory = new Map<string, VoiceStatement[]>();
    for (const stmt of voiceResult.statements) {
        if (stmt.category === 'graph_summary' || stmt.category === 'dependency_notice') continue;
        const group = byCategory.get(stmt.category) || [];
        group.push(stmt);
        byCategory.set(stmt.category, group);
    }

    for (const [category, stmts] of byCategory) {
        if (stmts.length === 0) continue;

        // Apply mode filtering
        const filtered = stmts.filter(stmt => {
            // LinkedIn mode: suppress internal-specific and mismatch categories
            if (config.mode === 'linkedin' &&
                (category === 'public_term_leak' || category === 'claim_strength_mismatch')) return false;
            // Public mode: keep term leaks as warnings
            if (config.mode === 'public' && category === 'public_term_leak') return true;
            return true;
        });
        // LinkedIn mode: suppress claim strength mismatch entirely (diagnostic only)
        if (config.mode === 'linkedin' && category === 'claim_strength_mismatch') continue;

        if (filtered.length === 0) continue;

        const header = formatSectionHeader(category, filtered.length);
        const bodyLines: string[] = [];
        const downgradedVerbs: string[] = [];
        let evidenceLevel: EvidenceStrength | 'none' = 'none';
        let receiptRequired = false;

        for (const stmt of filtered) {
            // Find the source node for strength assessment
            const sourceNode = result.nodes.find(n => n.nodeId === stmt.sourceNodeId);
            let displayText = stmt.text;

            if (sourceNode) {
                const strengthResult = applyStrengthPolicy(stmt.text, sourceNode, config);
                displayText = strengthResult.text;
                if (strengthResult.downgraded) {
                    downgradedVerbs.push(...strengthResult.downgradedVerbs);
                }
            }

            // Apply term policy
            if (sourceNode) {
                displayText = applyTermsPolicy(displayText, sourceNode, config);
            }

            bodyLines.push(`  • ${displayText}`);
            if (stmt.receiptRequired) receiptRequired = true;
            if (stmt.confidence === 'high') evidenceLevel = 'needs_evidence';
        }

        sections.push({
            header: `${header} (${filtered.length})`,
            body: bodyLines.join('\n'),
            limitations: [],
            evidenceLevel,
            receiptRequired,
            nodeCount: filtered.length,
            downgradedVerbs: [...new Set(downgradedVerbs)],
        });
    }

    return sections;
}

function formatSectionHeader(category: string, count: number): string {
    const labels: Record<string, string> = {
        claim_annotation: 'Claims',
        risk_advisory: 'Risks',
        definition_clarification: 'Definitions',
        proof_debt: 'Proof Debt Warnings',
        overclaim_warning: 'Overclaim Warnings',
        claim_strength_mismatch: 'Claim Strength Mismatches',
        public_term_leak: 'Public/Internal Boundary Issues',
        next_step_advisory: 'Next Steps',
        domain_context_note: 'Domain Context',
        ambiguity_warning: 'Ambiguity Flags',
    };
    return labels[category] || category;
}

// ─── Canon safety validation ─────────────────────────────────────

/**
 * Validate that a generated summary is canon-safe:
 * - No canon_approved language leaked from feed
 * - All claims respect evidence limits
 * - No internal terms in public-facing modes
 */
function validateCanonSafety(summary: EvidenceAwareSummary, config: ModeConfig): { passes: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check: LinkedIn sections must not contain strong claim verbs in body text
    // Excludes: hyphenated compounds (AST-verified), quoted diagnostics ('verified'),
    // metadata lines (Downgraded: verified), Limitations section (auto-generated)
    if (config.mode === 'linkedin') {
        const quotedRegex = /'verified'|'proven'|'guaranteed'|'production-ready'/gi;
        // Match standalone words only — not hyphenated compounds
        const strongClaimRegex = /\b(?<![\w-])(verified|proven|guaranteed|production-ready)(?![\w-])\b/i;
        for (const section of summary.sections) {
            // Skip Limitations section — auto-generated metadata
            if (section.header.includes('Limitations')) continue;
            const cleanBody = section.body
                .replace(/^  \w+:.+$/gm, '')   // strip metadata lines
                .replace(quotedRegex, '[verb]');
            if (strongClaimRegex.test(cleanBody)) {
                violations.push(`LinkedIn summary section "${section.header}" contains strong claim verb despite downgrade policy.`);
            }
        }
    }

    // Check: public/linkedin modes should not contain internal terms
    if (config.internalTermsPolicy === 'rewritten' || config.internalTermsPolicy === 'removed') {
        const internalTerms = ['CohBit', 'CTRL', 'PhaseLoom', 'Coh-GMI', 'Coh primitive'];
        for (const term of internalTerms) {
            for (const section of summary.sections) {
                if (section.body.includes(term)) {
                    violations.push(`Internal term "${term}" found in ${config.mode} summary despite term policy.`);
                }
            }
        }
    }

    return { passes: violations.length === 0, violations };
}

// ─── Main pipeline ───────────────────────────────────────────────

/**
 * Generate an evidence-aware, mode-filtered summary from TLT graph state.
 * This is the primary entry point for v9.2 — takes raw graph output
 * and produces audience-appropriate summaries.
 *
 * @param result - The TLT transform result (nodes + edges + summary)
 * @param mode - Target audience mode
 * @returns An evidence-aware summary with sections, warnings, and safety validation
 */
export function generateSummary(result: TltTransformResult, mode: SummaryMode): EvidenceAwareSummary {
    const config = MODE_CONFIGS[mode];

    // Generate base voice output
    resetVoiceCounter();
    const voiceResult = renderGraphToVoice(result);

    // Build mode-filtered sections
    const sections = buildSections(result, voiceResult, config);

    // Extract limitations (all modes except internal)
    const limitations = config.includeLimitations ? extractLimitations(result) : [];
    if (limitations.length > 0) {
        sections.push({
            header: `Limitations (${limitations.length})`,
            body: limitations.map(l => `  • ${l}`).join('\n'),
            limitations,
            evidenceLevel: 'surface_detected',
            receiptRequired: false,
            nodeCount: limitations.length,
            downgradedVerbs: [],
        });
    }

    // Count warnings and downgrades
    const totalWarnings = sections.reduce((sum, s) => {
        if (s.header.includes('Warning') || s.header.includes('Mismatch') || s.header.includes('Debt')) {
            return sum + s.nodeCount;
        }
        return sum;
    }, 0);

    const downgradeCount = sections.reduce((sum, s) => sum + s.downgradedVerbs.length, 0);

    const summary: EvidenceAwareSummary = {
        mode,
        modeLabel: config.label,
        sections,
        totalWarnings,
        downgradeCount,
        limitationCount: limitations.length,
        canonSafe: false, // filled below
        generatedAt: new Date().toISOString(),
    };

    // Validate canon safety
    const safetyCheck = validateCanonSafety(summary, config);
    summary.canonSafe = safetyCheck.passes;

    return summary;
}

/**
 * Generate summaries for all five modes and return as a record.
 */
export function generateAllSummaries(result: TltTransformResult): Record<SummaryMode, EvidenceAwareSummary> {
    return {
        internal: generateSummary(result, 'internal'),
        public: generateSummary(result, 'public'),
        technical: generateSummary(result, 'technical'),
        linkedin: generateSummary(result, 'linkedin'),
        reviewer: generateSummary(result, 'reviewer'),
    };
}

/**
 * Render an evidence-aware summary to a human-readable text block.
 */
export function renderSummaryToText(summary: EvidenceAwareSummary): string {
    const lines: string[] = [];
    lines.push(`=== ${summary.modeLabel} ===`);
    lines.push(`Generated: ${summary.generatedAt}`);
    lines.push(`Warnings: ${summary.totalWarnings} | Downgrades: ${summary.downgradeCount} | Limitations: ${summary.limitationCount} | Canon-safe: ${summary.canonSafe ? 'yes' : 'NO'}`);
    lines.push('');

    for (const section of summary.sections) {
        lines.push(`## ${section.header}`);
        if (section.evidenceLevel !== 'none') {
            lines.push(`  Evidence: ${section.evidenceLevel} | Receipt required: ${section.receiptRequired ? 'yes' : 'no'}`);
        }
        if (section.downgradedVerbs.length > 0) {
            lines.push(`  Downgraded: ${section.downgradedVerbs.join(', ')}`);
        }
        lines.push(section.body);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Check whether a summary is safe for a given audience.
 * Returns false if claim strength exceeds evidence or internal terms leak.
 */
export function isSummarySafeForAudience(summary: EvidenceAwareSummary, mode: SummaryMode): boolean {
    if (!summary.canonSafe) return false;

    const config = MODE_CONFIGS[mode];

    // LinkedIn/Public modes: no strong claim verbs without evidence
    // Skip Limitations section and exclude hyphenated compounds,
    // quoted diagnostics, metadata lines, and limitation-language phrases.
    if (config.claimStrengthPolicy === 'downgraded') {
        const quotedRegex = /'verified'|'proven'|'guaranteed'|'certified'|'production-ready'/gi;
        const strongClaimRegex = /\b(?<![\w-])(verified|proven|guaranteed|certified|production-ready)(?![\w-])\b/i;
        // Limitation-language patterns: these are NOT declarative claims
        const limitationPhraseRegex = /\b(not\s+(?:yet\s+)?(?:AST-)?(?:verified|proven|guaranteed|certified)|requires?\s+(?:AST-)?(?:verif|proof|guarantee)|lack(?:s|ing|ed)?\s+verif|without\s+verif|no\s+(?:formal\s+)?(?:verif|proof|guarantee)|pending\s+verif|absence\s+of\s+verif|has\s+not\s+been\s+(?:verified|proven|guaranteed))\b/i;
        for (const section of summary.sections) {
            if (section.header.includes('Limitations')) continue;
            // Strip metadata lines (e.g., "  Evidence: surface_detected")
            let cleanBody = section.body.replace(/^  \w+:.+$/gm, '');
            // Strip quoted diagnostic strings
            cleanBody = cleanBody.replace(quotedRegex, '[verb]');
            // Strip limitation-language phrases before testing for declarative strong claims
            cleanBody = cleanBody.replace(limitationPhraseRegex, '[limitation]');
            if (strongClaimRegex.test(cleanBody)) return false;
        }
    }

    return true;
}

// ─── Allowed audience verbs per mode ─────────────────────────────

/**
 * Return the set of claim verbs allowed in a given mode without downgrade.
 */
export function allowedVerbsForMode(mode: SummaryMode): string[] {
    const config = MODE_CONFIGS[mode];
    if (config.claimStrengthPolicy === 'preserved') return [];

    const { allowedVerbs } = require('./T_claim_guard.js');
    return allowedVerbs(config.maxClaimStrength);
}