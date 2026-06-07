// @cohbit/tlt-atlas — TLT Atlas Feed (v0.3 / v9.0)
// Candidate submission interface: TLT → TLT Atlas feedback loop.
//
// When TLT encounters patterns not yet in the Atlas, it can submit
// candidate entries for review. The Atlas may accept, reject, or
// hold candidates pending governance approval.
//
// Operating law:
//   TLT may propose Atlas updates. Atlas/canon rules decide what
//   becomes stored or canonical. TLT does not autonomously rewrite
//   the Atlas. All candidates require explicit approval.
//
// Architecture boundary:
//   TLT Transformer  = produces graph nodes from language
//   TLT Voice        = renders graph back to language
//   TLT Atlas Feed   = submits candidate patterns back to Atlas
//   Atlas maintainer = accepts/rejects/deprecates entries

import type { TltGraphNode, TltNodeType } from './T_tlt_transformer.js';
import { checkClaimStrength } from './T_claim_guard.js';
import { checkPublicBoundary } from './T_public_internal_boundary.js';

// ─── Candidate Types ────────────────────────────────────────────

export type CandidateStatus = 'pending' | 'accepted' | 'rejected' | 'deprecated' | 'canon_approved';

export interface AtlasCandidate {
    candidateId: string;
    suggestedCategory: 'meaning_invariant' | 'tone_register' | 'ambiguity_risk' | 'domain_context' | 'node_type_pattern' | 'claim_strength_violation';
    pattern: string;                    // The raw regex or phrase pattern observed
    sourceNodeId: string;              // Which TLT node produced this candidate
    sourceFile: string;
    sourceLine: number;
    matchedInvariantCount: number;     // How often this pattern matched
    confidence: 'high' | 'medium' | 'low';
    proposedEntry: string;             // Human-readable proposed atlas entry description
    rationale: string;
    status: CandidateStatus;
    submittedAt: string;
    reviewedAt?: string;
    reviewedBy?: string;               // governance authority reference
    reviewNotes?: string;
    confirmationHash?: string;         // v9.1: SHA-256 of candidate + reviewer, required for canon promotion
}

export interface FeedResult {
    candidates: AtlasCandidate[];
    summary: {
        submitted: number;
        accepted: number;
        pending: number;
        rejected: number;
        pendingCanonPromotion: number;  // v9.1: candidates awaiting canon review gate
    };
}

// ─── In-memory candidate store ──────────────────────────────────

const candidateStore: Map<string, AtlasCandidate> = new Map();

let candidateCounter = 0;
function nextCandidateId(): string {
    candidateCounter++;
    return `ATC_${String(candidateCounter).padStart(5, '0')}`;
}

// ─── Pattern detection for candidate submission ─────────────────

/**
 * Scan TLT graph nodes for patterns that may warrant Atlas updates.
 * Heuristics:
 *   - High-confidence matches of existing invariants that appear frequently
 *     in new document types → may suggest a new domain context
 *   - Nodes with multiple tone markers → may suggest a new tone profile
 *   - Nodes with unusual combinations of invariants → may suggest a new meaning invariant
 *   - Lines where no MINV matched but tone/domain markers were present → gap candidate
 */
export function scanNodesForCandidates(nodes: TltGraphNode[]): AtlasCandidate[] {
    const candidates: AtlasCandidate[] = [];
    const submittedPatterns = new Set<string>();

    // Count invariant frequencies
    const invCounts = new Map<string, number>();
    for (const node of nodes) {
        for (const minvId of node.matchedInvariants) {
            invCounts.set(minvId, (invCounts.get(minvId) || 0) + 1);
        }
    }

    // High-frequency invariant patterns → candidate meaning invariant extension
    for (const [minvId, count] of invCounts) {
        if (count >= 10 && !submittedPatterns.has(`freq:${minvId}`)) {
            submittedPatterns.add(`freq:${minvId}`);
            const candidateId = nextCandidateId();
            candidates.push({
                candidateId,
                suggestedCategory: 'meaning_invariant',
                pattern: `freq:${minvId}`,
                sourceNodeId: 'ATLAS_FEED_PATTERN_AGGREGATOR',
                sourceFile: 'multiple',
                sourceLine: 0,
                matchedInvariantCount: count,
                confidence: 'medium',
                proposedEntry: `High-frequency invariant ${minvId} detected ${count} times across documents. Consider verifying pattern specificity or promoting confidence level.`,
                rationale: `Frequent matches may indicate the invariant is well-calibrated or over-broad. ${count} matches suggest review.`,
                status: 'pending',
                submittedAt: new Date().toISOString(),
            });
        }
    }

    // Multi-tone nodes → candidate tone profile
    const multiToneNodes = nodes.filter(n => n.matchedToneRegisters.length >= 2);
    if (multiToneNodes.length >= 5 && !submittedPatterns.has('multi_tone_profile')) {
        submittedPatterns.add('multi_tone_profile');
        const candidateId = nextCandidateId();
        const toneCombos = new Set<string>();
        for (const n of multiToneNodes) {
            toneCombos.add(n.matchedToneRegisters.sort().join('+'));
        }
        candidates.push({
            candidateId,
            suggestedCategory: 'tone_register',
            pattern: 'multi_tone_profile',
            sourceNodeId: multiToneNodes[0]?.nodeId || 'UNKNOWN',
            sourceFile: multiToneNodes[0]?.sourceFile || 'multiple',
            sourceLine: multiToneNodes[0]?.lineApprox || 0,
            matchedInvariantCount: multiToneNodes.length,
            confidence: 'low',
            proposedEntry: `${multiToneNodes.length} nodes carry multiple tone registers. Observed combos: ${[...toneCombos].join(', ')}. Consider a composite tone profile.`,
            rationale: 'Multi-tone matches may indicate a legitimate hybrid register not captured by existing profiles.',
            status: 'pending',
            submittedAt: new Date().toISOString(),
        });
    }

    // Unusual MINV combinations → candidate composite invariant
    const comboMap = new Map<string, number>();
    for (const node of nodes) {
        const combo = node.matchedInvariants.sort().join('+');
        if (combo && node.matchedInvariants.length >= 2) {
            comboMap.set(combo, (comboMap.get(combo) || 0) + 1);
        }
    }
    for (const [combo, count] of comboMap) {
        if (count >= 5 && !submittedPatterns.has(`combo:${combo}`)) {
            submittedPatterns.add(`combo:${combo}`);
            const candidateId = nextCandidateId();
            candidates.push({
                candidateId,
                suggestedCategory: 'meaning_invariant',
                pattern: `combo:${combo}`,
                sourceNodeId: 'ATLAS_FEED_PATTERN_AGGREGATOR',
                sourceFile: 'multiple',
                sourceLine: 0,
                matchedInvariantCount: count,
                confidence: 'low',
                proposedEntry: `Recurring invariant combination: ${combo} (${count} occurrences). May warrant a composite meaning invariant.`,
                rationale: `Repeated co-occurrence of invariants ${combo} suggests a structured relationship not captured by individual invariants.`,
                status: 'pending',
                submittedAt: new Date().toISOString(),
            });
        }
    }

    return candidates;
}

// ─── Candidate submission ───────────────────────────────────────

/**
 * Submit a single candidate pattern to the Atlas feed.
 * Returns the candidate ID if accepted for review.
 */
export function submitAtlasCandidate(candidate: Omit<AtlasCandidate, 'candidateId' | 'status' | 'submittedAt'>): string {
    const candidateId = nextCandidateId();
    const entry: AtlasCandidate = {
        ...candidate,
        candidateId,
        status: 'pending',
        submittedAt: new Date().toISOString(),
    };
    candidateStore.set(candidateId, entry);
    return candidateId;
}

/**
 * Submit multiple candidates from a TLT node scan.
 * Deduplicates by pattern before submission.
 */
export function submitCandidatesFromScan(nodes: TltGraphNode[]): FeedResult {
    const rawCandidates = scanNodesForCandidates(nodes);
    const submitted: AtlasCandidate[] = [];
    const seenPatterns = new Set<string>();

    for (const c of rawCandidates) {
        const key = `${c.suggestedCategory}:${c.pattern}`;
        if (!seenPatterns.has(key)) {
            seenPatterns.add(key);
            const id = submitAtlasCandidate(c);
            const stored = candidateStore.get(id);
            if (stored) submitted.push(stored);
        }
    }

    const allCandidates = [...candidateStore.values()];

    return {
        candidates: submitted,
        summary: {
            submitted: submitted.length,
            accepted: allCandidates.filter(c => c.status === 'accepted' || c.status === 'canon_approved').length,
            pending: allCandidates.filter(c => c.status === 'pending').length,
            rejected: allCandidates.filter(c => c.status === 'rejected').length,
            pendingCanonPromotion: allCandidates.filter(c => c.status === 'accepted' && !c.confirmationHash).length,
        },
    };
}

// ─── Candidate lifecycle management ─────────────────────────────

/**
 * Accept a candidate and promote it to accepted status.
 * Requires a governance authority reference.
 */
export function acceptCandidate(candidateId: string, reviewedBy: string, notes?: string): boolean {
    const candidate = candidateStore.get(candidateId);
    if (!candidate || candidate.status !== 'pending') return false;

    candidate.status = 'accepted';
    candidate.reviewedAt = new Date().toISOString();
    candidate.reviewedBy = reviewedBy;
    if (notes) candidate.reviewNotes = notes;
    candidateStore.set(candidateId, candidate);
    return true;
}

/**
 * Promote an accepted candidate to canon-approved status.
 * This is the highest approval level — the entry is eligible for Atlas inclusion.
 */
export function promoteToCanon(candidateId: string, reviewedBy: string, notes?: string): boolean {
    const candidate = candidateStore.get(candidateId);
    if (!candidate || candidate.status !== 'accepted') return false;

    candidate.status = 'canon_approved';
    candidate.reviewedAt = new Date().toISOString();
    candidate.reviewedBy = reviewedBy;
    if (notes) candidate.reviewNotes = notes;
    candidateStore.set(candidateId, candidate);
    return true;
}

/**
 * Reject a candidate with a reason.
 */
export function rejectCandidate(candidateId: string, reviewedBy: string, reason: string): boolean {
    const candidate = candidateStore.get(candidateId);
    if (!candidate || candidate.status !== 'pending') return false;

    candidate.status = 'rejected';
    candidate.reviewedAt = new Date().toISOString();
    candidate.reviewedBy = reviewedBy;
    candidate.reviewNotes = reason;
    candidateStore.set(candidateId, candidate);
    return true;
}

/**
 * Deprecate a previously accepted candidate.
 */
export function deprecateCandidate(candidateId: string, reviewedBy: string, reason: string): boolean {
    const candidate = candidateStore.get(candidateId);
    if (!candidate || (candidate.status !== 'accepted' && candidate.status !== 'canon_approved')) return false;

    candidate.status = 'deprecated';
    candidate.reviewedAt = new Date().toISOString();
    candidate.reviewedBy = reviewedBy;
    candidate.reviewNotes = reason;
    candidateStore.set(candidateId, candidate);
    return true;
}

// ─── Query functions ────────────────────────────────────────────

/** Get all candidates by status. */
export function queryCandidatesByStatus(status: CandidateStatus): AtlasCandidate[] {
    return [...candidateStore.values()].filter(c => c.status === status);
}

/** Get all candidates. */
export function getAllCandidates(): AtlasCandidate[] {
    return [...candidateStore.values()];
}

/** Get a specific candidate by ID. */
export function getCandidate(candidateId: string): AtlasCandidate | undefined {
    return candidateStore.get(candidateId);
}

/** Get the full candidate store as a serializable report. */
export function getCandidateReport(): { candidates: AtlasCandidate[]; summary: FeedResult['summary']; generatedAt: string } {
    const all = [...candidateStore.values()];
    return {
        candidates: all,
        summary: {
            submitted: all.length,
            accepted: all.filter(c => c.status === 'accepted' || c.status === 'canon_approved').length,
            pending: all.filter(c => c.status === 'pending').length,
            rejected: all.filter(c => c.status === 'rejected').length,
            pendingCanonPromotion: all.filter(c => c.status === 'accepted' && !c.confirmationHash).length,
        },
        generatedAt: new Date().toISOString(),
    };
}

/** Clear the candidate store (for testing). */
export function clearCandidateStore(): void {
    candidateStore.clear();
    candidateCounter = 0;
}