import { describe, it, expect } from 'vitest';
import { createHumanAttentionBudget, isHighPriorityReview } from '../src/R7_human_attention.js';
import { createNetworkBudget, recordNetworkRequest, isExhausted as isNetworkExhausted } from '../src/R8_network.js';
import { createProofSearchBudget, recordProofAttempt, blockProofSearch } from '../src/R9_proof_search.js';
import { createBenchmarkBudget, recordBenchmarkCase } from '../src/R10_benchmark.js';

describe('R7 — Human Attention', () => {
    it('creates queued review', () => {
        const h = createHumanAttentionBudget({ reviewTarget: 'EXPORT_001', reviewType: 'public_release', estimatedMinutes: 20, priority: 'high', reason: 'Public claim review.' });
        expect(h.status).toBe('queued');
        expect(h.priority).toBe('high');
    });
    it('public_release is high priority', () => {
        expect(isHighPriorityReview({ humanAttentionBudgetId: 'x', reviewTarget: 'x', reviewType: 'public_release', estimatedMinutes: 1, priority: 'high', reason: '', status: 'queued', createdAt: '' })).toBe(true);
    });
    it('license_change is not high priority', () => {
        expect(isHighPriorityReview({ humanAttentionBudgetId: 'x', reviewTarget: 'x', reviewType: 'license_change', estimatedMinutes: 1, priority: 'medium', reason: '', status: 'queued', createdAt: '' })).toBe(false);
    });
});
describe('R8 — Network', () => {
    it('creates authorized budget', () => {
        const b = createNetworkBudget({ workflowId: 'w1', externalAccessType: 'doi_lookup', allowedRequests: 5, reason: 'Verify metadata.' });
        expect(b.status).toBe('authorized');
        expect(b.usedRequests).toBe(0);
    });
    it('records requests and exhausts', () => {
        const b = createNetworkBudget({ workflowId: 'w1', externalAccessType: 'github_api', allowedRequests: 2, reason: 'Check releases.' });
        recordNetworkRequest(b); recordNetworkRequest(b);
        expect(isNetworkExhausted(b)).toBe(true);
    });
});
describe('R9 — Proof Search', () => {
    it('creates pending budget', () => {
        const b = createProofSearchBudget({ theoremCandidateId: 'MTHM_001', allowedAttempts: 50, maxSeconds: 300 });
        expect(b.status).toBe('pending');
    });
    it('records attempts and exhausts', () => {
        const b = createProofSearchBudget({ theoremCandidateId: 'MTHM_001', allowedAttempts: 3, maxSeconds: 10 });
        recordProofAttempt(b); recordProofAttempt(b);
        expect(b.status).toBe('active');
        recordProofAttempt(b);
        expect(b.status).toBe('budget_exhausted');
    });
    it('blocks on missing definition', () => {
        const b = createProofSearchBudget({ theoremCandidateId: 'MTHM_001', allowedAttempts: 50, maxSeconds: 300 });
        blockProofSearch(b, 'missing_definition_detected');
        expect(b.status).toBe('blocked');
    });
    it('marks proof_found on success', () => {
        const b = createProofSearchBudget({ theoremCandidateId: 'MTHM_001', allowedAttempts: 50, maxSeconds: 300 });
        blockProofSearch(b, 'proof_found');
        expect(b.status).toBe('proof_found');
    });
});
describe('R10 — Benchmark', () => {
    it('creates authorized', () => { expect(createBenchmarkBudget({ benchmarkFamily: 'CTRL_boundary', allowedCases: 40 }).status).toBe('authorized'); });
    it('records cases and exhausts', () => {
        const b = createBenchmarkBudget({ benchmarkFamily: 'CTRL_boundary', allowedCases: 3 });
        recordBenchmarkCase(b); recordBenchmarkCase(b); recordBenchmarkCase(b);
        expect(b.status).toBe('exhausted');
    });
    it('default strategy is critical_boundary_first', () => {
        expect(createBenchmarkBudget({ benchmarkFamily: 'CTRL_boundary', allowedCases: 10 }).selectionStrategy).toBe('critical_boundary_first');
    });
});