import { describe, it, expect } from 'vitest';
import {
    guardRetrieval, rejectStaleOrUnsupported, detectClaimInflation,
    requireReceiptForStrongClaims, detectPublicInternalCollapse, rankByEvidence,
    type RetrievalCandidate,
} from '../src/T15_retrieval_guard.js';

const receiptedUnits: RetrievalCandidate = {
    sourceId: 'RCPT_001', invariants: ['INV_006', 'INV_009'], evidenceLevel: 'unit_tested',
    claimStatus: 'receipted', domain: 'code', hasReceipt: true, isStale: false,
    content: 'function safeDiv(a, b) { if (b === 0) return null; return a / b; }',
};

const staleEntry: RetrievalCandidate = {
    sourceId: 'STALE_001', invariants: ['INV_001'], evidenceLevel: 'unit_tested',
    claimStatus: 'stale', domain: 'code', hasReceipt: true, isStale: true,
    content: 'function old() { return 1; }',
};

const prototypeClaim: RetrievalCandidate = {
    sourceId: 'PROTO_001', invariants: ['MINV_MATH_006'], evidenceLevel: 'simulation_supported',
    claimStatus: 'draft', domain: 'math', hasReceipt: false, isStale: false,
    content: 'The simulation proves the theorem conclusively.',
};

const mathAnalogy: RetrievalCandidate = {
    sourceId: 'ANALOGY_001', invariants: ['MINV_MATH_014'], evidenceLevel: 'intuition',
    claimStatus: 'draft', domain: 'math', hasReceipt: false, isStale: false,
    content: 'This is analogous to a topological proof of equivalence.',
};

const publicWithInternal: RetrievalCandidate = {
    sourceId: 'PUB_001', invariants: ['SEM_010'], evidenceLevel: 'human_reviewed',
    claimStatus: 'receipted', domain: 'language', hasReceipt: true, isStale: false,
    content: 'The CohBit CTRL layer governs admissible transitions.',
};

const formalizedEntry: RetrievalCandidate = {
    sourceId: 'FORMAL_001', invariants: ['INV_024'], evidenceLevel: 'proof_assistant_checked',
    claimStatus: 'receipted', domain: 'code', hasReceipt: true, isStale: false,
    content: 'Lemma: All valid states preserve the invariant.',
};

const noEvidenceEntry: RetrievalCandidate = {
    sourceId: 'NOEV_001', invariants: ['INV_008'], evidenceLevel: 'none',
    claimStatus: 'draft', domain: 'code', hasReceipt: false, isStale: false,
    content: 'return value;',
};

describe('T15 — Retrieval Guard', () => {
    it('accepts all clean receipted entries', () => {
        const result = guardRetrieval([receiptedUnits]);
        expect(result.accepted).toHaveLength(1);
        expect(result.rejected).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    it('rejects stale entry', () => {
        const result = guardRetrieval([staleEntry]);
        expect(result.accepted).toHaveLength(0);
        expect(result.rejected).toHaveLength(1);
        expect(result.rejected[0]!.reason).toContain('Stale');
    });

    it('rejects prototype evidence with theorem language (no receipt)', () => {
        const result = guardRetrieval([prototypeClaim]);
        expect(result.accepted).toHaveLength(0);
        expect(result.rejected.length).toBeGreaterThanOrEqual(1);
        // Rejected because strong claim language without receipt
        expect(result.rejected.some(r => r.reason.includes('Strong claim') || r.reason.includes('Receipt required'))).toBe(true);
    });

    it('rejects math analogy with proof equivalence', () => {
        const result = guardRetrieval([mathAnalogy]);
        expect(result.accepted).toHaveLength(0);
    });

    it('warns on public-internal terminology collapse', () => {
        const result = guardRetrieval([publicWithInternal]);
        expect(result.accepted).toHaveLength(1);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('Internal/Public'))).toBe(true);
    });

    it('ranks evidence correctly: formalized above tested', () => {
        const result = guardRetrieval([receiptedUnits, formalizedEntry]);
        expect(result.accepted).toHaveLength(2);
        expect(result.accepted[0]!.sourceId).toBe('FORMAL_001');
        expect(result.accepted[1]!.sourceId).toBe('RCPT_001');
    });

    it('no-evidence entries warned but still accepted if no strong claim', () => {
        const result = guardRetrieval([noEvidenceEntry]);
        expect(result.accepted).toHaveLength(1);
        expect(result.warnings.some(w => w.includes('no evidence'))).toBe(true);
    });

    it('empty candidate list returns empty result', () => {
        const result = guardRetrieval([]);
        expect(result.accepted).toHaveLength(0);
        expect(result.evidenceLevel).toBe('none');
    });

    it('all accepted result evidenceLevel reflects max', () => {
        const result = guardRetrieval([receiptedUnits, formalizedEntry]);
        expect(result.evidenceLevel).toBe('formalized');
    });

    it('mixture of accepted and rejected handled correctly', () => {
        const result = guardRetrieval([receiptedUnits, staleEntry, formalizedEntry, prototypeClaim]);
        expect(result.accepted).toHaveLength(2);
        expect(result.rejected).toHaveLength(2);
        expect(result.accepted[0]!.sourceId).toBe('FORMAL_001');
    });
});

describe('T15 — Individual Guard Functions', () => {
    it('rejectStaleOrUnsupported catches stale', () => {
        const r = rejectStaleOrUnsupported([staleEntry, receiptedUnits]);
        expect(r).toHaveLength(1);
        expect(r[0]!.candidate.sourceId).toBe('STALE_001');
    });

    it('detectClaimInflation catches prototype + theorem', () => {
        const r = detectClaimInflation(prototypeClaim);
        expect(r.inflated).toBe(true);
    });

    it('detectClaimInflation catches math analogy', () => {
        const r = detectClaimInflation(mathAnalogy);
        expect(r.inflated).toBe(true);
    });

    it('detectClaimInflation passes clean entry', () => {
        const r = detectClaimInflation(receiptedUnits);
        expect(r.inflated).toBe(false);
    });

    it('requireReceiptForStrongClaims rejects prototype without receipt', () => {
        const r = requireReceiptForStrongClaims([prototypeClaim]);
        expect(r).toHaveLength(1);
    });

    it('detectPublicInternalCollapse flags internal terms', () => {
        const r = detectPublicInternalCollapse(publicWithInternal);
        expect(r.collapsed).toBe(true);
    });

    it('rankByEvidence sorts descending', () => {
        const ranked = rankByEvidence([receiptedUnits, noEvidenceEntry, formalizedEntry]);
        expect(ranked[0]!.sourceId).toBe('FORMAL_001');
        expect(ranked[2]!.sourceId).toBe('NOEV_001');
    });
});