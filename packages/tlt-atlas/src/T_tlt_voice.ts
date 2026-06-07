// @cohbit/tlt-atlas — TLT Voice (v0.3 / v9.0)
// Graph → Language projection layer.
// Renders TLT graph nodes and edges back into disciplined advisory language.
//
// Operating law:
//   TLT Voice renders graph-state into structured language advisory.
//   It does not certify truth, verify claims, mutate source text, or
//   authorize repairs. All voice output is explicitly advisory.
//   The Copilot remains the orchestrator and final speaker.
//
// Architecture boundary:
//   TLT Transformer  = language → graph (ears)
//   TLT Voice        = graph → language (structured voice)
//   TLT Atlas        = structural reference map both consult
//   Copilot          = orchestrator / user-facing intelligence

import { MEANING_INVARIANTS, type MeaningInvariant } from './L5_meaning_invariant.js';
import { TONE_PROFILES, type ToneProfile } from './L6_tone_register.js';
import { AMBIGUITY_RISKS, type AmbiguityRisk } from './L9_ambiguity_risk.js';
import { DOMAIN_PROFILES, type DomainProfile } from './L7_domain_context.js';
import type { TltGraphNode, TltGraphEdge, TltTransformResult } from './T_tlt_transformer.js';
import { checkClaimStrength, type ClaimStrengthViolation } from './T_claim_guard.js';
import { checkPublicBoundary } from './T_public_internal_boundary.js';

// ─── DOM ID compatibility bridge ────────────────────────────────
// The transformer produces DOM_001-DOM_004 shorthand IDs.
// The L7 registry uses DOMAIN_CODING, DOMAIN_FORMAL, etc.
// This bridge maps between them.

const TRANSFORMER_DOM_TO_L7: Record<string, string> = {
    DOM_001: 'DOMAIN_CODING',
    DOM_002: 'DOMAIN_FORMAL',
    DOM_003: 'DOMAIN_MAINTENANCE',   // closest L7 match for "documentation"
    DOM_004: 'DOMAIN_PUBLIC',
};

// ─── Voice Statement Types ──────────────────────────────────────

export type VoiceStatementCategory =
    | 'claim_annotation'
    | 'risk_advisory'
    | 'definition_clarification'
    | 'assumption_disclosure'
    | 'dependency_notice'
    | 'tone_observation'
    | 'ambiguity_warning'
    | 'domain_context_note'
    | 'proof_debt'
    | 'overclaim_warning'
    | 'claim_strength_mismatch'
    | 'public_term_leak'
    | 'next_step_advisory'
    | 'graph_summary';

export interface VoiceStatement {
    statementId: string;
    category: VoiceStatementCategory;
    sourceNodeId: string;
    text: string;
    confidence: 'high' | 'medium' | 'low';
    evidenceBasis: string;
    receiptRequired: boolean;
    suggestion: string;
}

export interface VoiceResult {
    statements: VoiceStatement[];
    summary: {
        totalStatements: number;
        claimAnnotations: number;
        riskAdvisories: number;
        proofDebtFlags: number;
        overclaimWarnings: number;
        nextStepAdvisories: number;
    };
}

// ─── Context helpers ────────────────────────────────────────────

function getMeaningInvariants(ids: string[]): MeaningInvariant[] {
    return ids.map(id => MEANING_INVARIANTS.get(id)).filter(Boolean) as MeaningInvariant[];
}

function getToneProfiles(ids: string[]): ToneProfile[] {
    return ids.map(id => TONE_PROFILES.get(id)).filter(Boolean) as ToneProfile[];
}

function getAmbiguityRisks(ids: string[]): AmbiguityRisk[] {
    return ids.map(id => AMBIGUITY_RISKS.get(id)).filter(Boolean) as AmbiguityRisk[];
}

/**
 * Resolve transformer DOM IDs to L7 domain profiles.
 * Handles both DOM_001-DOM_004 (transformer format) and DOMAIN_xxx (L7 format).
 */
function getDomainProfiles(domIds: string[]): DomainProfile[] {
    return domIds
        .map(id => {
            const l7Id = TRANSFORMER_DOM_TO_L7[id] || id;
            return DOMAIN_PROFILES.get(l7Id);
        })
        .filter(Boolean) as DomainProfile[];
}

// ─── Individual node voice renderers ────────────────────────────

let statementCounter = 0;
function nextStmtId(): string {
    statementCounter++;
    return `V_STMT_${String(statementCounter).padStart(5, '0')}`;
}

/**
 * Render a claim-type node as a disciplined claim annotation.
 */
function renderClaimAnnotation(node: TltGraphNode): VoiceStatement {
    const minvs = getMeaningInvariants(node.matchedInvariants);
    const tones = getToneProfiles(node.matchedToneRegisters);
    const ambs = getAmbiguityRisks(node.matchedAmbiguityRisks);
    const doms = getDomainProfiles(node.matchedDomainContexts);

    const minvNames = minvs.map(m => m.name).join(', ');
    const receiptRequired = minvs.some(m => m.receiptRequired);
    const domainNames = doms.map(d => d.name).join(', ') || 'unspecified domain';

    let text = `Claim detected in ${domainNames} context`;
    if (minvNames) text += ` — matches meaning invariant${minvs.length > 1 ? 's' : ''}: ${minvNames}`;

    const evidenceBasis = `Surface pattern match (confidence: ${node.confidence}). Source: ${node.sourceFile}:${node.lineApprox}.`;
    let suggestion = 'Review claim strength and ensure evidence is linked.';

    if (receiptRequired) {
        text += '. This claim type requires a verification receipt.';
        suggestion = 'Provide a verifier receipt or downgrade claim strength. Receipt required per Atlas meaning invariant.';
    }

    if (ambs.length > 0) {
        const ambList = ambs.map(a => a.name).join(', ');
        text += `. Ambiguity risk detected: ${ambList}.`;
        suggestion += ` Address ambiguity: ${ambList}.`;
    }

    if (tones.length > 0) {
        const toneList = tones.map(t => t.name).join(', ');
        text += `. Tone register: ${toneList}.`;
    }

    // Overclaim risk: public-facing claim that requires receipt
    const isPublicFacing = doms.some(d => d.domainId === 'DOMAIN_PUBLIC');
    if (isPublicFacing && receiptRequired) {
        text += ' ⚠ This is a public-facing claim that requires a receipt. Risk of overclaim.';
    }

    return {
        statementId: nextStmtId(),
        category: 'claim_annotation',
        sourceNodeId: node.nodeId,
        text,
        confidence: node.confidence,
        evidenceBasis,
        receiptRequired,
        suggestion,
    };
}

/**
 * Render a risk-type node as a disciplined risk advisory.
 */
function renderRiskAdvisory(node: TltGraphNode): VoiceStatement {
    const minvs = getMeaningInvariants(node.matchedInvariants);
    const ambs = getAmbiguityRisks(node.matchedAmbiguityRisks);

    const minvNames = minvs.map(m => m.name).join(', ');
    const riskNames = minvs.filter(m => m.receiptRequired).map(m => m.name);

    let text = `Risk signal detected`;
    if (minvNames) text += ` — matched invariants: ${minvNames}`;
    if (riskNames.length > 0) text += `. High-severity pattern: ${riskNames.join(', ')}. Receipt required.`;

    const evidenceBasis = `Pattern match (confidence: ${node.confidence}). Source: ${node.sourceFile}:${node.lineApprox}.`;
    let suggestion = 'Review risk context and verify whether the risk is mitigated.';

    if (ambs.length > 0) {
        const ambList = ambs.map(a => `${a.name}: severity ${a.severity}`).join('; ');
        text += `. Ambiguity concerns: ${ambList}.`;
        suggestion += ` Resolve ambiguity: ${ambList}.`;
    }

    if (node.confidence === 'high') {
        text += ' ⚠ High-confidence risk detection.';
        suggestion = 'Immediate review recommended. Do not defer without a receipt.';
    }

    return {
        statementId: nextStmtId(),
        category: 'risk_advisory',
        sourceNodeId: node.nodeId,
        text,
        confidence: node.confidence,
        evidenceBasis,
        receiptRequired: minvs.some(m => m.receiptRequired),
        suggestion,
    };
}

/**
 * Render a definition-type node as a clarification notice.
 */
function renderDefinitionClarification(node: TltGraphNode): VoiceStatement {
    const doms = getDomainProfiles(node.matchedDomainContexts);

    const domainStr = doms.map(d => d.name).join(', ') || 'unspecified domain';
    const text = `Definition detected in ${domainStr} context — reference: ${node.matchedText.substring(0, 100)}.`;

    return {
        statementId: nextStmtId(),
        category: 'definition_clarification',
        sourceNodeId: node.nodeId,
        text,
        confidence: node.confidence,
        evidenceBasis: `Surface pattern match. Source: ${node.sourceFile}:${node.lineApprox}.`,
        receiptRequired: false,
        suggestion: 'Ensure the definition is consistent across the document and linked dependencies.',
    };
}

/**
 * Render proof debt: a node that carries a receipt-required invariant but lacks evidence.
 */
function renderProofDebt(node: TltGraphNode): VoiceStatement | null {
    const minvs = getMeaningInvariants(node.matchedInvariants);
    const requiresReceipt = minvs.filter(m => m.receiptRequired);

    if (requiresReceipt.length === 0) return null;

    const names = requiresReceipt.map(m => m.name).join(', ');
    const text = `Proof debt: this statement carries a receipt-required invariant (${names}) but no verification receipt is linked.`;

    return {
        statementId: nextStmtId(),
        category: 'proof_debt',
        sourceNodeId: node.nodeId,
        text,
        confidence: 'high',
        evidenceBasis: `Atlas receipt-required flag set for ${names}. Source: ${node.sourceFile}:${node.lineApprox}.`,
        receiptRequired: true,
        suggestion: `Provide verification evidence for ${names} or downgrade the claim strength to remove the receipt requirement.`,
    };
}

/**
 * Render an overclaim warning for claims that appear public-facing without adequate evidence.
 */
function renderOverclaimWarning(node: TltGraphNode): VoiceStatement | null {
    const doms = getDomainProfiles(node.matchedDomainContexts);
    const isPublicFacing = doms.some(d => d.domainId === 'DOMAIN_PUBLIC');
    const minvs = getMeaningInvariants(node.matchedInvariants);
    const hasReceiptRequirement = minvs.some(m => m.receiptRequired && m.id !== 'MINV_012');

    if (!isPublicFacing || hasReceiptRequirement) return null;

    const text = `Potential overclaim risk: public-facing statement detected without a linked verification receipt. This may overstate confidence to external audiences.`;

    return {
        statementId: nextStmtId(),
        category: 'overclaim_warning',
        sourceNodeId: node.nodeId,
        text,
        confidence: 'medium',
        evidenceBasis: `Public-facing domain (DOMAIN_PUBLIC) detected. Source: ${node.sourceFile}:${node.lineApprox}. No receipt-required invariant matched.`,
        receiptRequired: false,
        suggestion: 'Verify that the public-facing claim does not overstate certainty. Consider adding a claim limitation or linking evidence.',
    };
}

/**
 * Render a next-step advisory for actionable patterns.
 */
function renderNextStepAdvisory(node: TltGraphNode): VoiceStatement | null {
    const minvs = getMeaningInvariants(node.matchedInvariants);
    const ambs = getAmbiguityRisks(node.matchedAmbiguityRisks);

    const actionableMinvs = minvs.filter(m =>
        m.id === 'MINV_001' || m.id === 'MINV_002' || m.id === 'MINV_015' || m.id === 'MINV_016'
    );

    if (actionableMinvs.length === 0) return null;

    const names = actionableMinvs.map(m => m.name).join(', ');
    let suggestedAction = 'Review and plan next action.';

    if (actionableMinvs.some(m => m.id === 'MINV_001')) suggestedAction = 'Respond to the direct request with the requested action, information, or decision.';
    if (actionableMinvs.some(m => m.id === 'MINV_002')) suggestedAction = 'Provide the requested clarification or precision.';
    if (actionableMinvs.some(m => m.id === 'MINV_015')) suggestedAction = 'Execute the repair instruction per the documented procedure.';
    if (actionableMinvs.some(m => m.id === 'MINV_016')) suggestedAction = 'Follow the step-by-step procedure as specified.';

    if (ambs.length > 0) {
        suggestedAction += ` Resolve ambiguity first: ${ambs.map(a => a.name).join(', ')}.`;
    }

    const text = `Actionable pattern detected: ${names}. Next step: ${suggestedAction}`;

    return {
        statementId: nextStmtId(),
        category: 'next_step_advisory',
        sourceNodeId: node.nodeId,
        text,
        confidence: node.confidence,
        evidenceBasis: `Actionable invariant match (${names}). Source: ${node.sourceFile}:${node.lineApprox}.`,
        receiptRequired: false,
        suggestion: suggestedAction,
    };
}

/**
 * Render a domain context note.
 */
function renderDomainContextNote(node: TltGraphNode): VoiceStatement | null {
    const doms = getDomainProfiles(node.matchedDomainContexts);
    if (doms.length === 0) return null;

    const domainList = doms.map(d => d.name).join(', ');
    const text = `Domain context detected: ${domainList}. Source text appears to be in ${domainList} register.`;

    return {
        statementId: nextStmtId(),
        category: 'domain_context_note',
        sourceNodeId: node.nodeId,
        text,
        confidence: node.confidence,
        evidenceBasis: `Domain pattern match. Source: ${node.sourceFile}:${node.lineApprox}.`,
        receiptRequired: false,
        suggestion: 'Verify that the language register is appropriate for the intended audience.',
    };
}

// ─── v9.1: Claim Strength Guard rendering ───────────────────────

/**
 * Render claim strength mismatches for a node.
 * Checks whether source language verbs (e.g., "verified", "proven")
 * are backed by graph evidence. Produces claim_strength_mismatch
 * statements for each violation found.
 *
 * Voice never upgrades graph status. If the node's evidence is only
 * surface_detected, the voice output reflects that downgrade explicitly.
 */
function renderClaimStrengthMismatches(node: TltGraphNode): VoiceStatement[] {
    const result = checkClaimStrength(node);
    if (result.isHonest) return [];

    return result.violations.map(v => ({
        statementId: nextStmtId(),
        category: 'claim_strength_mismatch' as VoiceStatementCategory,
        sourceNodeId: node.nodeId,
        text: `⚠ Claim strength mismatch: ${v.message} Suggested: "${v.suggestedDowngrade}".`,
        confidence: v.severity === 'high' ? 'high' : 'medium',
        evidenceBasis: `Source used '${v.sourceVerb}' (requires ${v.sourceStrength}) but node evidence is at ${v.actualStrength}. Source: ${node.sourceFile}:${node.lineApprox}.`,
        receiptRequired: v.severity === 'high',
        suggestion: `Downgrade language from '${v.sourceVerb}' to evidence-appropriate phrasing. ${v.suggestedDowngrade}`,
    }));
}

// ─── v9.1: Public/Internal Boundary rendering ────────────────────

/**
 * Render public/internal boundary violations for a node.
 * Checks whether internal Noetican terminology appears in
 * public-facing context. Produces public_term_leak statements.
 */
function renderPublicTermLeaks(node: TltGraphNode): VoiceStatement[] {
    const boundary = checkPublicBoundary(node);
    if (boundary.passes) return [];

    return boundary.termLeaks.map(leak => ({
        statementId: nextStmtId(),
        category: 'public_term_leak' as VoiceStatementCategory,
        sourceNodeId: node.nodeId,
        text: `⚠ Public/internal boundary violation: ${leak.message}`,
        confidence: leak.severity === 'high' ? 'high' : 'medium',
        evidenceBasis: `Internal term '${leak.term}' (${leak.category}) in public-facing context. Source: ${node.sourceFile}:${node.lineApprox}.`,
        receiptRequired: leak.severity === 'high',
        suggestion: `Replace '${leak.term}' with public-facing equivalent or move to internal documentation. Suggested: "${leak.suggestedRewrite}".`,
    }));
}

// ─── Graph-level voice renderers ────────────────────────────────

/**
 * Render a single TLT graph node into 0+ voice statements.
 */
export function renderNodeToVoice(node: TltGraphNode): VoiceStatement[] {
    const statements: VoiceStatement[] = [];

    switch (node.nodeType) {
        case 'claim':
            statements.push(renderClaimAnnotation(node));
            break;
        case 'risk':
            statements.push(renderRiskAdvisory(node));
            break;
        case 'definition':
            statements.push(renderDefinitionClarification(node));
            break;
        case 'assumption':
        case 'dependency':
        case 'tone_marker':
        case 'ambiguity':
        case 'domain_context': {
            const dcNote = renderDomainContextNote(node);
            if (dcNote) statements.push(dcNote);
            break;
        }
    }

    // Cross-cutting checks
    const proofDebt = renderProofDebt(node);
    if (proofDebt) statements.push(proofDebt);

    const overclaim = renderOverclaimWarning(node);
    if (overclaim) statements.push(overclaim);

    const nextStep = renderNextStepAdvisory(node);
    if (nextStep) statements.push(nextStep);

    // v9.1: Claim strength guard — prevent voice from upgrading graph status
    const strengthResult = renderClaimStrengthMismatches(node);
    for (const s of strengthResult) statements.push(s);

    // v9.1: Public/internal boundary gate
    const boundaryResult = renderPublicTermLeaks(node);
    for (const s of boundaryResult) statements.push(s);

    return statements;
}

/**
 * Render an edge as a relation advisory statement.
 */
export function renderEdgeToVoice(edge: TltGraphEdge): VoiceStatement | null {
    const edgeLabels: Record<string, string> = {
        depends_on: 'depends on',
        supports: 'supports',
        contradicts: 'contradicts',
        refines: 'refines',
        contextualizes: 'contextualizes',
        receipted_by: 'is receipted by',
    };

    const label = edgeLabels[edge.edgeType] ?? edge.edgeType;
    const text = `Graph relation: ${edge.from} ${label} ${edge.to}. ${edge.reason}`;

    return {
        statementId: nextStmtId(),
        category: 'dependency_notice',
        sourceNodeId: edge.from,
        text,
        confidence: 'medium',
        evidenceBasis: `Proximity-based edge inference. Source: ${edge.reason}.`,
        receiptRequired: false,
        suggestion: 'Verify that the inferred relation is semantically correct.',
    };
}

// ─── Full graph → voice transformation ──────────────────────────

/**
 * Transform a complete TLT graph result (nodes + edges) into voice statements.
 */
export function renderGraphToVoice(result: TltTransformResult): VoiceResult {
    statementCounter = 0;
    const statements: VoiceStatement[] = [];

    for (const node of result.nodes) {
        statements.push(...renderNodeToVoice(node));
    }

    for (const edge of result.edges) {
        const stmt = renderEdgeToVoice(edge);
        if (stmt) statements.push(stmt);
    }

    const summaryStmt: VoiceStatement = {
        statementId: nextStmtId(),
        category: 'graph_summary',
        sourceNodeId: 'TLT_GRAPH',
        text: `TLT graph contains ${result.summary.totalNodes} nodes (${result.summary.claims} claims, ${result.summary.risks} risks, ${result.summary.definitions} definitions) and ${result.edges.length} edges across ${result.artifactsProcessed} artifacts.`,
        confidence: 'high',
        evidenceBasis: `TLT transform result summary. ${result.artifactsProcessed} artifacts processed.`,
        receiptRequired: false,
        suggestion: 'Review graph structure for completeness and consistency.',
    };
    statements.push(summaryStmt);

    const summary = {
        totalStatements: statements.length,
        claimAnnotations: statements.filter(s => s.category === 'claim_annotation').length,
        riskAdvisories: statements.filter(s => s.category === 'risk_advisory').length,
        proofDebtFlags: statements.filter(s => s.category === 'proof_debt').length,
        overclaimWarnings: statements.filter(s => s.category === 'overclaim_warning').length,
        nextStepAdvisories: statements.filter(s => s.category === 'next_step_advisory').length,
    };

    return { statements, summary };
}

/**
 * Render a compact executive summary from graph state.
 */
export function renderExecutiveSummary(result: TltTransformResult): string {
    const lines: string[] = [];
    lines.push('=== TLT Graph Executive Summary ===');
    lines.push(`Nodes: ${result.summary.totalNodes} total`);
    lines.push(`  Claims: ${result.summary.claims}`);
    lines.push(`  Risks: ${result.summary.risks}`);
    lines.push(`  Definitions: ${result.summary.definitions}`);
    lines.push(`  Ambiguity markers: ${result.summary.ambiguityNodes}`);
    lines.push(`  Tone markers: ${result.summary.toneMarkers}`);
    lines.push(`  Domain contexts: ${result.summary.domainContexts}`);
    lines.push(`Edges: ${result.edges.length}`);
    lines.push(`Artifacts processed: ${result.artifactsProcessed}`);

    const receiptRequiredNodes = result.nodes.filter(n =>
        n.matchedInvariants.some(id => MEANING_INVARIANTS.get(id)?.receiptRequired)
    );
    if (receiptRequiredNodes.length > 0) {
        lines.push(`Receipt-required nodes: ${receiptRequiredNodes.length}`);
        for (const n of receiptRequiredNodes.slice(0, 3)) {
            const minvs = n.matchedInvariants
                .map(id => MEANING_INVARIANTS.get(id))
                .filter(Boolean) as MeaningInvariant[];
            const names = minvs.map(m => m.name).join(', ');
            lines.push(`  ⚠ ${n.nodeId} [${n.nodeType}] ${n.sourceFile}:${n.lineApprox} — ${names} (receipt required)`);
        }
        if (receiptRequiredNodes.length > 3) lines.push(`  ... and ${receiptRequiredNodes.length - 3} more`);
    }

    const publicFacingClaims = result.nodes.filter(n =>
        n.nodeType === 'claim' &&
        n.matchedDomainContexts.includes('DOM_004') &&
        !n.matchedInvariants.some(id => MEANING_INVARIANTS.get(id)?.receiptRequired)
    );
    if (publicFacingClaims.length > 0) {
        lines.push(`Potential overclaim risk: ${publicFacingClaims.length} public-facing claims without receipt requirements.`);
    }

    return lines.join('\n');
}

/** Reset the statement counter (useful between test runs). */
export function resetVoiceCounter(): void {
    statementCounter = 0;
}