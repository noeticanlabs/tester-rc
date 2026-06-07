// @cohbit/tooling — T15 Retrieval Guard
// Guards cross-atlas memory retrieval before it influences planning, repair,
// or audit recommendations.
//
// Operating law:
//   Retrieval may inform.
//   Retrieval may not certify.
//   Evidence level must follow the stored receipt, not the usefulness of the memory.

export interface RetrievalCandidate {
    sourceId: string;
    invariants: string[];
    evidenceLevel: string;
    claimStatus: 'draft' | 'receipted' | 'stale';
    domain: 'code' | 'language' | 'math';
    hasReceipt: boolean;
    isStale: boolean;
    content: string;
}

export interface RejectedRetrieval {
    candidate: RetrievalCandidate;
    reason: string;
}

export interface GuardedRetrievalResult {
    accepted: RetrievalCandidate[];
    rejected: RejectedRetrieval[];
    warnings: string[];
    evidenceLevel: 'none' | 'conceptual' | 'runtime_tested' | 'verified' | 'formalized';
}

// ─── Evidence ranking ──────────────────────────────────────────

const EVIDENCE_RANK: Record<string, number> = {
    'proof_assistant_checked': 5,
    'formally_proven': 5,
    'Lean_formalized_pending': 4,
    'formal_statement': 4,
    'verified': 4,
    'peer_reviewed_argument': 3,
    'unit_tested': 3,
    'runtime_tested': 3,
    'negative_tested': 3,
    'property_tested': 3,
    'benchmark_supported': 3,
    'static_analyzed': 2,
    'computationally_tested': 2,
    'type_checked': 2,
    'backtranslated': 2,
    'terminology_checked': 2,
    'human_reviewed': 2,
    'domain_reviewed': 2,
    'user_confirmed': 2,
    'diagram_supported': 1,
    'simulation_supported': 1,
    'proof_sketch': 1,
    'syntax_checked': 1,
    'intuition': 1,
    'example': 1,
    'none': 0,
    'surface_detected': 0,
    'parsed': 0,
    'intent_mapped': 0,
    'meaning_invariant_mapped': 0,
};

function evidenceRank(level: string): number {
    return EVIDENCE_RANK[level] ?? 0;
}

// ─── Detection functions ──────────────────────────────────────

function isStrongClaim(content: string): boolean {
    return /\b(proves|guarantees|certifies|ensures|proof|theorem|verified)\b/i.test(content);
}

function isPrototypeEvidence(level: string): boolean {
    const lowLevels = ['none', 'intuition', 'example', 'diagram_supported', 'simulation_supported', 'proof_sketch', 'computationally_tested'];
    return lowLevels.includes(level);
}

function isMathAnalogy(content: string): boolean {
    return /\b(analogy|analogous|like a|similar to|behaves like)\b/i.test(content) &&
        /\b(theorem|proof|equivalent|proves)\b/i.test(content);
}

function hasInternalTerminology(content: string, domain: string): boolean {
    if (domain === 'code' || domain === 'math') return false;
    const internalTerms = ['cohabit', 'ctrl', 'ttc', 'gtg', 'noetican', 'CohBit', 'admissible transition'];
    return internalTerms.some(t => content.toLowerCase().includes(t.toLowerCase()));
}

// ─── Guard functions ──────────────────────────────────────────

export function rejectStaleOrUnsupported(candidates: RetrievalCandidate[]): RejectedRetrieval[] {
    const rejected: RejectedRetrieval[] = [];
    for (const c of candidates) {
        if (c.isStale) {
            rejected.push({ candidate: c, reason: 'Stale entry: memory may no longer reflect current state.' });
        } else if (!c.hasReceipt && c.claimStatus !== 'draft') {
            rejected.push({ candidate: c, reason: 'No receipt for non-draft claim. Retrieval blocked.' });
        }
    }
    return rejected;
}

export function detectClaimInflation(candidate: RetrievalCandidate): { inflated: boolean; reason?: string } {
    if (isStrongClaim(candidate.content) && isPrototypeEvidence(candidate.evidenceLevel)) {
        return { inflated: true, reason: `Claim uses proof/theorem language but evidence level is '${candidate.evidenceLevel}'. Evidence does not support the claim strength.` };
    }
    if (isMathAnalogy(candidate.content)) {
        return { inflated: true, reason: 'Mathematical analogy detected with proof-equivalence language. Analogy ≠ proof.' };
    }
    return { inflated: false };
}

export function requireReceiptForStrongClaims(candidates: RetrievalCandidate[]): RejectedRetrieval[] {
    const rejected: RejectedRetrieval[] = [];
    for (const c of candidates) {
        if (isStrongClaim(c.content) && !c.hasReceipt) {
            rejected.push({ candidate: c, reason: 'Strong claim language without receipt. Receipt required for certification claims.' });
        }
    }
    return rejected;
}

export function detectPublicInternalCollapse(candidate: RetrievalCandidate): { collapsed: boolean; reason?: string } {
    if (hasInternalTerminology(candidate.content, candidate.domain)) {
        return { collapsed: true, reason: 'Internal Noetican terminology detected in public-facing content. Collapse risk.' };
    }
    return { collapsed: false };
}

export function rankByEvidence(candidates: RetrievalCandidate[]): RetrievalCandidate[] {
    return [...candidates].sort((a, b) => evidenceRank(b.evidenceLevel) - evidenceRank(a.evidenceLevel));
}

// ─── Composite guard ──────────────────────────────────────────

export function guardRetrieval(
    candidates: RetrievalCandidate[],
    query?: string,
): GuardedRetrievalResult {
    const initialRejected = rejectStaleOrUnsupported(candidates);
    const remainingStaleFiltered = candidates.filter(c => !initialRejected.some(r => r.candidate.sourceId === c.sourceId));

    const receiptRejected = requireReceiptForStrongClaims(remainingStaleFiltered);
    const remaining = remainingStaleFiltered.filter(c => !receiptRejected.some(r => r.candidate.sourceId === c.sourceId));

    const accepted: RetrievalCandidate[] = [];
    const rejected: RejectedRetrieval[] = [...initialRejected, ...receiptRejected];
    const warnings: string[] = [];

    for (const c of remaining) {
        const inflation = detectClaimInflation(c);
        if (inflation.inflated) {
            rejected.push({ candidate: c, reason: inflation.reason! });
            continue;
        }

        const collapse = detectPublicInternalCollapse(c);
        if (collapse.collapsed) {
            warnings.push(`Internal/Public collapse risk for '${c.sourceId}': ${collapse.reason}`);
        }

        if (evidenceRank(c.evidenceLevel) === 0) {
            warnings.push(`Entry '${c.sourceId}' has no evidence basis. Retrieval allowed with warning.`);
        }

        accepted.push(c);
    }

    const ranked = rankByEvidence(accepted);
    const maxEvidence = ranked.length > 0 ? ranked[0]!.evidenceLevel : 'none';

    let evidenceLevel: GuardedRetrievalResult['evidenceLevel'] = 'none';
    const rank = evidenceRank(maxEvidence);
    if (rank >= 5) evidenceLevel = 'formalized';
    else if (rank >= 3) evidenceLevel = 'runtime_tested';
    else if (rank >= 1) evidenceLevel = 'conceptual';

    return {
        accepted: ranked,
        rejected,
        warnings,
        evidenceLevel,
    };
}