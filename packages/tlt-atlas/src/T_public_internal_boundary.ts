// @cohbit/tlt-atlas — TLT Public/Internal Boundary Gate (v9.1)
// Prevents internal terminology from leaking into public-facing context
// and enforces language register boundaries in voice output.
//
// Operating law:
//   This boundary gate flags internal terminology in public context.
//   It does not censor, authorize publication, or verify claims.
//   All boundary warnings are advisory.

import { DOMAIN_PROFILES, type DomainProfile } from './L7_domain_context.js';
import type { TltGraphNode } from './T_tlt_transformer.js';
import { detectPhilosophyOverclaim } from './philosophy/philosophy_guards.js';

// ─── DOM ID bridge (shared with voice module) ────────────────────

const TRANSFORMER_DOM_TO_L7: Record<string, string> = {
    DOM_001: 'DOMAIN_CODING',
    DOM_002: 'DOMAIN_FORMAL',
    DOM_003: 'DOMAIN_MAINTENANCE',
    DOM_004: 'DOMAIN_PUBLIC',
};

function getDomainProfiles(domIds: string[]): DomainProfile[] {
    return domIds
        .map(id => TRANSFORMER_DOM_TO_L7[id] || id)
        .map(id => DOMAIN_PROFILES.get(id))
        .filter(Boolean) as DomainProfile[];
}

// ─── Internal Terminology Registry ───────────────────────────────

/**
 * Terms that should not appear in public-facing context without
 * explicit framing and definition. These are Noetican Labs internal
 * terminology and system names.
 */
export const INTERNAL_TERM_PATTERNS: { term: string; regex: RegExp; category: string; severity: 'high' | 'medium' }[] = [
    { term: 'CohBit', regex: /\bCohBit\b/i, category: 'system_name', severity: 'high' },
    { term: 'Coh-GMI', regex: /\bCoh[- ]GMI\b/i, category: 'system_name', severity: 'high' },
    { term: 'CTRL', regex: /\bCTRL\b/i, category: 'verifier_system', severity: 'high' },
    { term: 'PhaseLoom', regex: /\bPhaseLoom\b/i, category: 'system_name', severity: 'high' },
    { term: 'Cohbit-Copilot', regex: /\bCohbit[- ]Copilot\b/i, category: 'system_name', severity: 'medium' },
    { term: 'Noetican', regex: /\bNoetican\b/i, category: 'org_name', severity: 'medium' },
    { term: 'admissible computation', regex: /\badmissible computation\b/i, category: 'concept', severity: 'medium' },
    { term: 'verifier-native', regex: /\bverifier[- ]native\b/i, category: 'concept', severity: 'medium' },
    { term: 'Coh primitive', regex: /\bCoh primitive\b/i, category: 'concept', severity: 'high' },
    { term: 'APT', regex: /\bAPT\b(?!\.ts)/i, category: 'concept', severity: 'medium' }, // not file extension
    { term: 'UPT', regex: /\bUPT\b/i, category: 'concept', severity: 'medium' },
];

// ─── Boundary Types ──────────────────────────────────────────────

export interface TermLeakViolation {
    violationId: string;
    nodeId: string;
    term: string;
    category: string;
    severity: 'high' | 'medium';
    sourceFile: string;
    sourceLine: number;
    message: string;
    suggestedRewrite: string;
}

export interface PublicBoundaryAssessment {
    nodeId: string;
    isPublicFacing: boolean;
    termLeaks: TermLeakViolation[];
    passes: boolean;
    requiresRewrite: boolean;
}

export interface PublicBoundaryReport {
    assessments: PublicBoundaryAssessment[];
    summary: {
        totalPublicNodes: number;
        cleanNodes: number;
        totalLeaks: number;
        highSeverityLeaks: number;
        mediumSeverityLeaks: number;
        requiresRewrite: number;
    };
}

let leakCounter = 0;
function nextLeakId(): string {
    leakCounter++;
    return `LEAK_${String(leakCounter).padStart(5, '0')}`;
}

// ─── Term Detection ──────────────────────────────────────────────

/**
 * Check whether a node's domain context includes public-facing.
 */
export function isPublicFacing(node: TltGraphNode): boolean {
    const doms = getDomainProfiles(node.matchedDomainContexts);
    return doms.some(d => d.domainId === 'DOMAIN_PUBLIC');
}

/**
 * Detect internal terminology in text that should not appear
 * in public-facing context.
 */
export function detectInternalTermLeaks(text: string): { term: string; category: string; severity: 'high' | 'medium' }[] {
    const leaks: { term: string; category: string; severity: 'high' | 'medium' }[] = [];
    const found = new Set<string>();

    for (const pattern of INTERNAL_TERM_PATTERNS) {
        if (pattern.regex.test(text) && !found.has(pattern.term)) {
            found.add(pattern.term);
            leaks.push({
                term: pattern.term,
                category: pattern.category,
                severity: pattern.severity,
            });
        }
    }

    return leaks;
}

/**
 * Generate a suggested rewrite replacing internal terminology
 * with public-facing equivalents.
 */
export function rewriteForPublic(text: string, leaks: { term: string }[]): string {
    const rewriteMap: Record<string, string> = {
        'CohBit': 'governed transition primitive',
        'Coh-GMI': 'governed model interface',
        'CTRL': 'the verifier subsystem',
        'PhaseLoom': 'the memory trajectory layer',
        'Cohbit-Copilot': 'the governed copilot system',
        'Coh primitive': 'governed state-transition primitive',
    };

    let result = text;
    for (const leak of leaks) {
        const replacement = rewriteMap[leak.term] || `[internal term: ${leak.term}]`;
        const termRegex = new RegExp(`\\b${leak.term.replace(/[- ]/g, '[- ]')}\\b`, 'gi');
        result = result.replace(termRegex, replacement);
    }

    return result;
}

// ─── Boundary Check ──────────────────────────────────────────────

/**
 * Check a single TLT node for public/internal boundary violations.
 */
export function checkPublicBoundary(node: TltGraphNode): PublicBoundaryAssessment {
    const publicFacing = isPublicFacing(node);

    if (!publicFacing) {
        return {
            nodeId: node.nodeId,
            isPublicFacing: false,
            termLeaks: [],
            passes: true,
            requiresRewrite: false,
        };
    }

    const rawLeaks = detectInternalTermLeaks(node.matchedText);
    const termLeaks: TermLeakViolation[] = rawLeaks.map(leak => ({
        violationId: nextLeakId(),
        nodeId: node.nodeId,
        term: leak.term,
        category: leak.category,
        severity: leak.severity,
        sourceFile: node.sourceFile,
        sourceLine: node.lineApprox,
        message: `Internal term '${leak.term}' (category: ${leak.category}) appears in public-facing context at ${node.sourceFile}:${node.lineApprox}.`,
        suggestedRewrite: rewriteForPublic(node.matchedText, [leak]),
    }));

    const hasHighSeverity = termLeaks.some(l => l.severity === 'high');

    return {
        nodeId: node.nodeId,
        isPublicFacing: true,
        termLeaks,
        passes: termLeaks.length === 0,
        requiresRewrite: hasHighSeverity,
    };
}

// ─── Batch Reporting ─────────────────────────────────────────────

/**
 * Run public/internal boundary check over a batch of nodes.
 */
export function assessAllBoundaries(nodes: TltGraphNode[]): PublicBoundaryReport {
    const publicNodes = nodes.filter(n => isPublicFacing(n));
    const assessments = publicNodes.map(n => checkPublicBoundary(n));

    return {
        assessments,
        summary: {
            totalPublicNodes: publicNodes.length,
            cleanNodes: assessments.filter(a => a.passes).length,
            totalLeaks: assessments.reduce((sum, a) => sum + a.termLeaks.length, 0),
            highSeverityLeaks: assessments.reduce((sum, a) => sum + a.termLeaks.filter(l => l.severity === 'high').length, 0),
            mediumSeverityLeaks: assessments.reduce((sum, a) => sum + a.termLeaks.filter(l => l.severity === 'medium').length, 0),
            requiresRewrite: assessments.filter(a => a.requiresRewrite).length,
        },
    };
}

/** Reset the leak counter (for testing). */
export function resetLeakCounter(): void {
    leakCounter = 0;
}