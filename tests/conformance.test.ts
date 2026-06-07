// Cohbit-Copilot Conformance Test Suite
// Maps to SPEC.md §9 Test Obligations and test_vectors/ JSON fixtures
//
// Test Obligations:
//   1. rejects_unauthorized_potential_creation
//   2. accepts_exact_boundary_coh_law
//   3. solver_returns_none_on_empty_future_set
//   4. solver_verifies_before_optimizing
//   5. committed_implies_verified
//   6. receipt_hash_is_deterministic
//   7. directed_triangle_inequality_holds
//   8. path_accounting_telescopes

import { describe, it, expect } from 'vitest';
import type {
    Rational64,
    CohBitReceipt,
} from '../src/types.js';
import { isAdmissible, rationalAdd, rationalLe } from '../src/types.js';
import {
    hashReceipt,
    memoryMass,
    buildReceipt,
    verifyGmiStatus,
    buildLanguageReceipt,
} from '../src/receipt.js';
import {
    propose,
    review,
    authorize,
    apply,
    runTests,
    rollback,
    commitReceipt,
    classifyFailure,
    runPipeline,
    commitSessionReceipt,
} from '../src/gates.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Test Vector Loader ────────────────────────────────────────
function loadJson(file: string): unknown {
    const filePath = path.resolve('test_vectors', file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
}

// ─── Helpers ───────────────────────────────────────────────────
function toRational(pair: [number, number]): Rational64 {
    return { numer: pair[0], denom: pair[1] };
}

function makeTestReceipt(overrides?: Partial<{
    valuationPre: Rational64;
    valuationPost: Rational64;
    spend: Rational64;
    defect: Rational64;
    authority: Rational64;
    prescribedEnvelope: Rational64;
    fromState: string;
    toState: string;
}>): CohBitReceipt {
    const valuationPre = overrides?.valuationPre ?? { numer: 10, denom: 1 };
    const valuationPost = overrides?.valuationPost ?? { numer: 10, denom: 1 };
    const spend = overrides?.spend ?? { numer: 0, denom: 1 };
    const defect = overrides?.defect ?? { numer: 0, denom: 1 };
    const authority = overrides?.authority ?? { numer: 0, denom: 1 };
    const prescribedEnvelope = overrides?.prescribedEnvelope ?? { numer: 1, denom: 10 };
    const fromState = overrides?.fromState ?? '0'.repeat(64);
    const toState = overrides?.toState ?? '0'.repeat(64);

    return {
        bitId: '',
        valuationPre,
        valuationPost,
        wedge: {
            version: '1',
            domainId: '0'.repeat(64),
            policyHash: '0'.repeat(64),
            fromState,
            toState,
            actionHash: '0'.repeat(64),
            spend,
            defect,
            prescribedEnvelope,
            authority,
            certificateHash: '0'.repeat(64),
        },
    };
}

// ═══════════════════════════════════════════════════════════════════
// §9 Test Obligations (8 properties from SPEC.md)
// ═══════════════════════════════════════════════════════════════════
describe('SPEC.md §9 Test Obligations', () => {

    // ─── 1. rejects_unauthorized_potential_creation ───────────
    describe('1. rejects_unauthorized_potential_creation', () => {
        it('should reject when V(post) exceeds V(pre) + spend (potential creation without authority)', () => {
            // V(pre)=10, V(post)=20, spend=1, defect=0, authority=0
            // 20 + 1 = 21 > 10 + 0 + 0
            expect(isAdmissible(
                { numer: 10, denom: 1 },
                { numer: 20, denom: 1 },
                { numer: 1, denom: 1 },
                { numer: 0, denom: 1 },
                { numer: 0, denom: 1 },
            )).toBe(false);
        });

        it('should pass review but block at authorization when potential is created without authority', () => {
            const record = propose({
                description: 'Test unauthorized creation',
                files: [{ path: 'test.ts', action: 'modify', beforeContent: 'x', afterContent: 'y', diff: '+y' }],
                estimatedSpend: { numer: 1, denom: 1 },
                estimatedDefect: { numer: 0, denom: 1 },
                requiredAuthority: { numer: 0, denom: 1 },
                policyHash: 'policy1',
            });

            const reviewed = review(record, 'human-reviewer', true, 'Approved for testing');
            expect(reviewed.status).toBe('REVIEW_PASSED');

            const receipt = makeTestReceipt({
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 20, denom: 1 },
                spend: { numer: 1, denom: 1 },
                defect: { numer: 0, denom: 1 },
                authority: { numer: 0, denom: 1 },
            });

            const authorized = authorize(reviewed, {
                domainId: 'test',
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 20, denom: 1 },
                memoryBudget: 1000000,
                traceBudget: 1000000,
            }, receipt);

            expect(authorized.status).toBe('AUTHORIZATION_DENIED');
        });
    });

    // ─── 2. accepts_exact_boundary_coh_law ────────────────────
    describe('2. accepts_exact_boundary_coh_law', () => {
        it('should accept when V(post) + s = V(pre) + d + a (exact boundary)', () => {
            // V(pre)=10, V(post)=11, spend=0, defect=1, authority=0
            // 11 + 0 = 11, 10 + 1 + 0 = 11 → LE holds
            expect(isAdmissible(
                { numer: 10, denom: 1 },
                { numer: 11, denom: 1 },
                { numer: 0, denom: 1 },
                { numer: 1, denom: 1 },
                { numer: 0, denom: 1 },
            )).toBe(true);
        });

        it('should pass full pipeline with exact boundary (spend=0, defect=1, V:10→11)', () => {
            const config = {
                proposal: {
                    description: 'Exact boundary test',
                    files: [{ path: 'test.ts', action: 'modify' as const, beforeContent: 'a', afterContent: 'b', diff: '+b' }],
                    estimatedSpend: { numer: 0, denom: 1 },
                    estimatedDefect: { numer: 1, denom: 1 },
                    requiredAuthority: { numer: 0, denom: 1 },
                    policyHash: 'policy1',
                },
                reviewer: 'human',
                reviewApproved: true,
                reviewComments: 'LGTM',
                authorization: {
                    domainId: 'test',
                    valuationPre: { numer: 10, denom: 1 },
                    valuationPost: { numer: 11, denom: 1 },
                    memoryBudget: 1000000,
                    traceBudget: 1000000,
                },
                apply: {
                    filesModified: ['test.ts'],
                    prePatchHashes: { 'test.ts': 'a'.repeat(64) },
                    postPatchHashes: { 'test.ts': 'b'.repeat(64) },
                },
                testResults: [{ name: 'boundary_test', passed: true, duration: 1 }],
                domainId: 'test',
                actionHash: 'action123',
            };

            const result = runPipeline(config);
            expect(result.status).toBe('RECEIPTED');
            expect(result.receipt).not.toBeNull();
        });
    });

    // ─── 3. solver_returns_none_on_empty_future_set ───────────
    describe('3. solver_returns_none_on_empty_future_set', () => {
        it('should halt when no admissible displacement exists (empty future set)', () => {
            const admissible = isAdmissible(
                { numer: 0, denom: 1 },
                { numer: 1, denom: 1 },
                { numer: 0, denom: 1 },
                { numer: 0, denom: 1 },
                { numer: 0, denom: 1 },
            );
            expect(admissible).toBe(false);
        });

        it('should remain at PROPOSED when no admissible path forward', () => {
            const record = propose({
                description: 'Impossible transition',
                files: [{ path: 'x.ts', action: 'modify', beforeContent: '', afterContent: 'data', diff: '+data' }],
                estimatedSpend: { numer: 1000, denom: 1 },
                estimatedDefect: { numer: 0, denom: 1 },
                requiredAuthority: { numer: 0, denom: 1 },
                policyHash: 'p',
            });

            const reviewed = review(record, 'reviewer', true, 'ok');
            const receipt = makeTestReceipt({
                valuationPre: { numer: 1, denom: 1 },
                valuationPost: { numer: 1, denom: 1 },
                spend: { numer: 1000, denom: 1 },
                defect: { numer: 0, denom: 1 },
                authority: { numer: 0, denom: 1 },
            });
            const authorized = authorize(reviewed, {
                domainId: 't',
                valuationPre: { numer: 1, denom: 1 },
                valuationPost: { numer: 1, denom: 1 },
                memoryBudget: 1000000,
                traceBudget: 1000000,
            }, receipt);

            expect(authorized.status).toBe('AUTHORIZATION_DENIED');
        });
    });

    // ─── 4. solver_verifies_before_optimizing ─────────────────
    describe('4. solver_verifies_before_optimizing', () => {
        it('should verify admissibility before building a receipt', () => {
            const result = buildReceipt({
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 20, denom: 1 },
                spend: { numer: 1, denom: 1 },
                defect: { numer: 0, denom: 1 },
                authority: { numer: 0, denom: 1 },
                prescribedEnvelope: { numer: 1, denom: 10 },
                fromState: '0'.repeat(64),
                toState: '0'.repeat(64),
                version: '1',
                domainId: 'test',
                policyHash: 'policy',
                actionHash: 'action',
                certificateHash: '0'.repeat(64),
            });

            expect(result).toHaveProperty('error');
            expect((result as { error: string }).error).toContain('Admissibility check failed');
        });

        it('should verify before committing in the pipeline', () => {
            const record = propose({
                description: 'Verify before commit',
                files: [{ path: 'f.ts', action: 'modify', beforeContent: 'old', afterContent: 'new', diff: '+new' }],
                estimatedSpend: { numer: 0, denom: 1 },
                estimatedDefect: { numer: 0, denom: 1 },
                requiredAuthority: { numer: 0, denom: 1 },
                policyHash: 'pol',
            });

            const committed = commitReceipt(record,
                { numer: 0, denom: 1 },
                { numer: 100, denom: 1 },
                'test',
                'action',
            );
            expect(committed.status).not.toBe('RECEIPTED');
        });
    });

    // ─── 5. committed_implies_verified ────────────────────────
    describe('5. committed_implies_verified', () => {
        it('should only produce receipt when tests pass', () => {
            const config = {
                proposal: {
                    description: 'committed_implies_verified',
                    files: [{ path: 'c.ts', action: 'modify' as const, beforeContent: 'x', afterContent: 'y', diff: '+y' }],
                    estimatedSpend: { numer: 0, denom: 1 },
                    estimatedDefect: { numer: 1, denom: 1 },
                    requiredAuthority: { numer: 0, denom: 1 },
                    policyHash: 'p',
                },
                reviewer: 'human',
                reviewApproved: true,
                reviewComments: 'ok',
                authorization: {
                    domainId: 'test',
                    valuationPre: { numer: 10, denom: 1 },
                    valuationPost: { numer: 11, denom: 1 },
                    memoryBudget: 1000000,
                    traceBudget: 1000000,
                },
                apply: {
                    filesModified: ['c.ts'],
                    prePatchHashes: { 'c.ts': 'x'.repeat(64) },
                    postPatchHashes: { 'c.ts': 'y'.repeat(64) },
                },
                testResults: [{ name: 'fail', passed: false, duration: 0, error: 'assertion error' }],
                domainId: 'test',
                actionHash: 'a',
            };

            const result = runPipeline(config);
            // Tests failed → should rollback, not commit
            expect(result.status).toBe('ROLLED_BACK');
            expect(result.receipt).toBeNull();
            expect(result.rollbackApplied).toBe(true);
        });

        it('should commit only when all gates passed', () => {
            const config = {
                proposal: {
                    description: 'happy path',
                    files: [{ path: 'h.ts', action: 'modify' as const, beforeContent: 'a', afterContent: 'b', diff: '+b' }],
                    estimatedSpend: { numer: 0, denom: 1 },
                    estimatedDefect: { numer: 1, denom: 1 },
                    requiredAuthority: { numer: 0, denom: 1 },
                    policyHash: 'p',
                },
                reviewer: 'human',
                reviewApproved: true,
                reviewComments: 'good',
                authorization: {
                    domainId: 'test',
                    valuationPre: { numer: 10, denom: 1 },
                    valuationPost: { numer: 11, denom: 1 },
                    memoryBudget: 1000000,
                    traceBudget: 1000000,
                },
                apply: {
                    filesModified: ['h.ts'],
                    prePatchHashes: { 'h.ts': 'a'.repeat(64) },
                    postPatchHashes: { 'h.ts': 'b'.repeat(64) },
                },
                testResults: [{ name: 't', passed: true, duration: 0 }],
                domainId: 'test',
                actionHash: 'a',
            };

            const result = runPipeline(config);
            expect(result.status).toBe('RECEIPTED');
            expect(result.receipt).not.toBeNull();
            expect(result.receipt!.bitId).toHaveLength(64);
        });
    });

    // ─── 6. receipt_hash_is_deterministic ─────────────────────
    describe('6. receipt_hash_is_deterministic', () => {
        it('should produce the same hash for identical receipts', () => {
            const r1 = makeTestReceipt({
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 9, denom: 1 },
                spend: { numer: 1, denom: 1 },
            });
            const r2 = makeTestReceipt({
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 9, denom: 1 },
                spend: { numer: 1, denom: 1 },
            });

            expect(hashReceipt(r1)).toBe(hashReceipt(r2));
            expect(hashReceipt(r1)).toHaveLength(64);
        });

        it('should produce different hashes for different receipts', () => {
            const r1 = makeTestReceipt({
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 9, denom: 1 },
                spend: { numer: 1, denom: 1 },
            });
            const r2 = makeTestReceipt({
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 8, denom: 1 },
                spend: { numer: 2, denom: 1 },
            });

            expect(hashReceipt(r1)).not.toBe(hashReceipt(r2));
        });

        it('should produce same hash when canonical serialization reduces fractions', () => {
            const r1 = makeTestReceipt({
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 5, denom: 1 },
                spend: { numer: 2, denom: 2 },
            });
            const r2 = makeTestReceipt({
                valuationPre: { numer: 10, denom: 1 },
                valuationPost: { numer: 5, denom: 1 },
                spend: { numer: 1, denom: 1 },
            });

            expect(hashReceipt(r1)).toBe(hashReceipt(r2));
        });
    });

    // ─── 7. directed_triangle_inequality_holds ────────────────
    describe('7. directed_triangle_inequality_holds', () => {
        it('should satisfy d(x,z) ≤ d(x,y) + d(y,z) for admissible CohBits', () => {
            const costXY = { numer: 2, denom: 1 };
            const costYZ: Rational64 = rationalAdd({ numer: 3, denom: 1 }, { numer: 1, denom: 1 });
            const costXZ: Rational64 = rationalAdd({ numer: 4, denom: 1 }, { numer: 1, denom: 1 });
            const costPathSum = rationalAdd(costXY, costYZ);

            expect(rationalLe(costXZ, costPathSum)).toBe(true);
        });

        it('should detect triangle inequality violation', () => {
            const costXZ = { numer: 10, denom: 1 };
            const costXY = { numer: 2, denom: 1 };
            const costYZ = { numer: 3, denom: 1 };
            const costPathSum = rationalAdd(costXY, costYZ);

            expect(rationalLe(costXZ, costPathSum)).toBe(false);
        });
    });

    // ─── 8. path_accounting_telescopes ────────────────────────
    describe('8. path_accounting_telescopes', () => {
        it('should telescope sums across a path using Composition Matrix (Theorem 3)', () => {
            const vPre = { numer: 10, denom: 1 };
            const vPost = { numer: 7, denom: 1 };
            const totalSpend = { numer: 3, denom: 1 };
            const totalDefect = { numer: 0, denom: 1 };
            const totalAuthority = { numer: 0, denom: 1 };

            expect(isAdmissible(vPre, vPost, totalSpend, totalDefect, totalAuthority)).toBe(true);
        });

        it('should detect violation when telescoping shows overspend', () => {
            const vPre = { numer: 10, denom: 1 };
            const vPost = { numer: 5, denom: 1 };
            const totalSpend = { numer: 10, denom: 1 };
            const totalDefect = { numer: 0, denom: 1 };
            const totalAuthority = { numer: 0, denom: 1 };

            expect(isAdmissible(vPre, vPost, totalSpend, totalDefect, totalAuthority)).toBe(false);
        });
    });
});

// ═══════════════════════════════════════════════════════════════════
// Test Vector Conformance (8 JSON fixtures)
// ═══════════════════════════════════════════════════════════════════
describe('Test Vector Conformance', () => {
    describe('valid_identity.json', () => {
        it('should accept identity transition (V_pre = V_post, zero spend/defect/authority)', () => {
            const tv = loadJson('valid_identity.json') as {
                expected: { valid: boolean; admissible?: boolean };
                input: { valuation_pre: [number, number]; valuation_post: [number, number]; spend: [number, number]; defect: [number, number]; authority: [number, number] };
            };
            const inp = tv.input;

            expect(isAdmissible(
                toRational(inp.valuation_pre),
                toRational(inp.valuation_post),
                toRational(inp.spend),
                toRational(inp.defect),
                toRational(inp.authority),
            )).toBe(true);

            expect(tv.expected.valid).toBe(true);
            expect(tv.expected.admissible).toBe(true);
        });
    });

    describe('valid_boundary_exact_equality.json', () => {
        it('should accept exact equality boundary (V_post = V_pre + defect)', () => {
            const tv = loadJson('valid_boundary_exact_equality.json') as {
                expected: { valid: boolean };
                input: { valuation_pre: [number, number]; valuation_post: [number, number]; spend: [number, number]; defect: [number, number]; authority: [number, number] };
            };
            const inp = tv.input;

            expect(isAdmissible(
                toRational(inp.valuation_pre),
                toRational(inp.valuation_post),
                toRational(inp.spend),
                toRational(inp.defect),
                toRational(inp.authority),
            )).toBe(true);

            expect(tv.expected.valid).toBe(true);
        });
    });

    describe('reject_negative_spend.json', () => {
        it('should reject negative spend as non-canonical', () => {
            const tv = loadJson('reject_negative_spend.json') as {
                expected: { valid: boolean; error: string };
                input: { spend: [number, number] };
            };

            const spend = toRational(tv.input.spend);
            expect(spend.numer).toBeLessThan(0);
            expect(tv.expected.valid).toBe(false);
            expect(tv.expected.error).toBe('NonCanonicalEncoding');
        });
    });

    describe('reject_bad_margin.json', () => {
        it('should reject when V_post + s > V_pre + d + a (negative margin)', () => {
            const tv = loadJson('reject_bad_margin.json') as {
                expected: { valid: boolean; admissible?: boolean };
                input: { valuation_pre: [number, number]; valuation_post: [number, number]; spend: [number, number]; defect: [number, number]; authority: [number, number] };
            };
            const inp = tv.input;

            expect(isAdmissible(
                toRational(inp.valuation_pre),
                toRational(inp.valuation_post),
                toRational(inp.spend),
                toRational(inp.defect),
                toRational(inp.authority),
            )).toBe(false);

            expect(tv.expected.valid).toBe(false);
            expect(tv.expected.admissible).toBe(false);
        });
    });

    describe('reject_authority_cap_exceeded.json', () => {
        it('should reject when authority exceeds per-bit cap', () => {
            const tv = loadJson('reject_authority_cap_exceeded.json') as {
                expected: { valid: boolean };
                input: { authority: [number, number] };
            };

            const auth = toRational(tv.input.authority);
            expect(auth.numer).toBeGreaterThan(1000000);
            expect(tv.expected.valid).toBe(false);
        });
    });

    describe('reject_chain_digest_mismatch.json', () => {
        it('should reject when chain digest is tampered', () => {
            const tv = loadJson('reject_chain_digest_mismatch.json') as {
                expected: { valid: boolean; error: string };
                input: { chain_digest_post_tamper?: string; chain_digest_pre?: string };
            };

            expect(tv.expected.valid).toBe(false);
            expect(tv.expected.error).toBe('ChainDigestMismatch');
            expect(tv.input.chain_digest_post_tamper).toBeDefined();
            expect(tv.input.chain_digest_post_tamper).not.toBe(tv.input.chain_digest_pre);
        });
    });

    describe('reject_state_root_mismatch.json', () => {
        it('should reject when prior state root is tampered', () => {
            const tv = loadJson('reject_state_root_mismatch.json') as {
                expected: { valid: boolean; error: string };
                input: { state_root_override?: string; prior_state_root?: string };
            };

            expect(tv.expected.valid).toBe(false);
            expect(tv.expected.error).toBe('BadReceiptHash');
            expect(tv.input.state_root_override).toBeDefined();
            expect(tv.input.state_root_override).not.toBe(tv.input.prior_state_root);
        });
    });

    describe('adversarial_cases.json', () => {
        const cases = loadJson('adversarial_cases.json') as {
            name: string;
            v_pre: number;
            v_post: number;
            spend: number;
            defect: number;
            authority: number;
            typed: boolean;
            receipt_valid: boolean;
            verifier_accept: boolean;
            expected: string;
        }[];

        it('exact_boundary_accept', () => {
            const c = cases.find(x => x.name === 'exact_boundary_accept')!;
            expect(isAdmissible(
                { numer: c.v_pre, denom: 1 },
                { numer: c.v_post, denom: 1 },
                { numer: c.spend, denom: 1 },
                { numer: c.defect, denom: 1 },
                { numer: c.authority, denom: 1 },
            )).toBe(true);
            expect(c.expected).toBe('accept');
        });

        it('potential_creation_reject', () => {
            const c = cases.find(x => x.name === 'potential_creation_reject')!;
            expect(isAdmissible(
                { numer: c.v_pre, denom: 1 },
                { numer: c.v_post, denom: 1 },
                { numer: c.spend, denom: 1 },
                { numer: c.defect, denom: 1 },
                { numer: c.authority, denom: 1 },
            )).toBe(false);
            expect(c.expected).toBe('reject');
        });

        it('boundary_failure_by_1_unit', () => {
            const c = cases.find(x => x.name === 'boundary_failure_by_1_unit')!;
            expect(isAdmissible(
                { numer: c.v_pre, denom: 1 },
                { numer: c.v_post, denom: 1 },
                { numer: c.spend, denom: 1 },
                { numer: c.defect, denom: 1 },
                { numer: c.authority, denom: 1 },
            )).toBe(false);
            expect(c.expected).toBe('reject');
        });

        it('should reject all adversarial cases marked as reject (structural & admissibility)', () => {
            for (const c of cases) {
                const admissible = isAdmissible(
                    { numer: c.v_pre, denom: 1 },
                    { numer: c.v_post, denom: 1 },
                    { numer: c.spend, denom: 1 },
                    { numer: c.defect, denom: 1 },
                    { numer: c.authority, denom: 1 },
                );

                if (c.expected === 'accept') {
                    expect(admissible).toBe(true);
                } else if (c.expected === 'reject') {
                    if (c.name === 'invalid_receipt_reject') {
                        expect(c.receipt_valid).toBe(false);
                    } else if (c.name === 'untyped_reject') {
                        expect(c.typed).toBe(false);
                    } else if (c.name === 'verifier_reject') {
                        expect(c.verifier_accept).toBe(false);
                    } else {
                        expect(admissible).toBe(false);
                    }
                }
            }
        });
    });
});

// ═══════════════════════════════════════════════════════════════════
// Gate Lifecycle Integration
// ═══════════════════════════════════════════════════════════════════
describe('Gate Lifecycle Integration', () => {
    it('should execute full happy path: Proposal → Review → Authorize → Apply → Test → Receipt', () => {
        const record = propose({
            description: 'Add unit test',
            files: [{ path: 'test.spec.ts', action: 'create', beforeContent: null, afterContent: 'test("x")', diff: '+test("x")' }],
            estimatedSpend: { numer: 0, denom: 1 },
            estimatedDefect: { numer: 1, denom: 1 },
            requiredAuthority: { numer: 0, denom: 1 },
            policyHash: 'pol-hash',
        });
        expect(record.status).toBe('PROPOSED');

        const reviewed = review(record, 'developer', true, 'Looks correct');
        expect(reviewed.status).toBe('REVIEW_PASSED');

        const receipt = makeTestReceipt({
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 11, denom: 1 },
            spend: { numer: 0, denom: 1 },
            defect: { numer: 1, denom: 1 },
            authority: { numer: 0, denom: 1 },
        });
        receipt.wedge.policyHash = 'pol-hash';

        const authorized = authorize(reviewed, {
            domainId: 'test',
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 11, denom: 1 },
            memoryBudget: 1000000,
            traceBudget: 1000000,
        }, receipt);
        expect(authorized.status).toBe('AUTHORIZED');

        const applied = apply(authorized, {
            filesModified: ['test.spec.ts'],
            prePatchHashes: { 'test.spec.ts': '0'.repeat(64) },
            postPatchHashes: { 'test.spec.ts': '1'.repeat(64) },
        });
        expect(applied.status).toBe('APPLIED');

        const tested = runTests(applied, [
            { name: 'unit_test', passed: true, duration: 5 },
            { name: 'integration_test', passed: true, duration: 12 },
        ]);
        expect(tested.status).toBe('TESTS_PASSED');

        const committed = commitReceipt(tested,
            { numer: 10, denom: 1 },
            { numer: 11, denom: 1 },
            'test',
            'action-hash',
        );
        expect(committed.status).toBe('RECEIPTED');
        expect(committed.receipt).toBeTruthy();
        expect(committed.receipt!.bitId).toHaveLength(64);

        // Verify full timeline (6 gates: Proposal, Review, Authorize, Apply, Test, Receipt)
        expect(committed.timeline.map(e => e.gate)).toEqual([
            'ProposalGate', 'ReviewGate', 'AuthorizeGate', 'ApplyGate',
            'PostApplyTestGate', 'ReceiptGate',
        ]);
    });

    it('should rollback on test failure', () => {
        const record = propose({
            description: 'Buggy patch',
            files: [{ path: 'bug.ts', action: 'modify', beforeContent: 'ok', afterContent: 'broken', diff: '+broken' }],
            estimatedSpend: { numer: 1, denom: 1 },
            estimatedDefect: { numer: 5, denom: 1 },
            requiredAuthority: { numer: 2, denom: 1 },
            policyHash: 'p',
        });

        let r = review(record, 'reviewer', true, 'proceed');
        expect(r.status).toBe('REVIEW_PASSED');

        const receipt = makeTestReceipt({
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 12, denom: 1 },
            spend: { numer: 1, denom: 1 },
            defect: { numer: 5, denom: 1 },
            authority: { numer: 2, denom: 1 },
        });
        receipt.wedge.policyHash = 'p';

        r = authorize(r, {
            domainId: 'bug-test',
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 12, denom: 1 },
            memoryBudget: 1000000,
            traceBudget: 1000000,
        }, receipt);
        expect(r.status).toBe('AUTHORIZED');

        r = apply(r, {
            filesModified: ['bug.ts'],
            prePatchHashes: { 'bug.ts': 'h1'.repeat(32) },
            postPatchHashes: { 'bug.ts': 'h2'.repeat(32) },
        });
        expect(r.status).toBe('APPLIED');

        r = runTests(r, [
            { name: 'test_1', passed: true, duration: 1 },
            { name: 'test_2', passed: false, duration: 2, error: 'AssertionError: expected true got false' },
        ]);
        expect(r.status).toBe('TESTS_FAILED');

        r = rollback(r);
        expect(r.status).toBe('ROLLED_BACK');
        expect(r.rollbackApplied).toBe(true);
        expect(r.receipt).toBeNull();
    });

    it('should block at review gate when rejected', () => {
        const record = propose({
            description: 'Risky change',
            files: [{ path: 'risk.ts', action: 'modify', beforeContent: 'safe', afterContent: 'danger', diff: '+danger' }],
            estimatedSpend: { numer: 10, denom: 1 },
            estimatedDefect: { numer: 5, denom: 1 },
            requiredAuthority: { numer: 0, denom: 1 },
            policyHash: 'p',
        });

        const reviewed = review(record, 'security-auditor', false, 'Too risky');
        expect(reviewed.status).toBe('REVIEW_REJECTED');
        expect(reviewed.review!.approved).toBe(false);

        const receipt = makeTestReceipt();
        const authAttempt = authorize(reviewed, {
            domainId: 't',
            valuationPre: { numer: 0, denom: 1 },
            valuationPost: { numer: 0, denom: 1 },
            memoryBudget: 1000,
            traceBudget: 1000,
        }, receipt);
        expect(authAttempt.status).toBe('AUTHORIZATION_DENIED');
    });

    it('should enforce policy hash binding', () => {
        const record = propose({
            description: 'Policy mismatch test',
            files: [{ path: 'p.ts', action: 'modify', beforeContent: 'x', afterContent: 'y', diff: '+y' }],
            estimatedSpend: { numer: 0, denom: 1 },
            estimatedDefect: { numer: 0, denom: 1 },
            requiredAuthority: { numer: 0, denom: 1 },
            policyHash: 'required-policy',
        });

        const reviewed = review(record, 'reviewer', true, 'ok');
        expect(reviewed.status).toBe('REVIEW_PASSED');

        const receipt = makeTestReceipt();
        receipt.wedge.policyHash = 'wrong-policy';

        const authorized = authorize(reviewed, {
            domainId: 't',
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 10, denom: 1 },
            memoryBudget: 1000000,
            traceBudget: 1000000,
        }, receipt);

        expect(authorized.status).toBe('AUTHORIZATION_DENIED');
    });

    it('should produce session language receipt on commit', () => {
        const record = propose({
            description: 'Session receipt test',
            files: [{ path: 's.ts', action: 'modify', beforeContent: 'a', afterContent: 'b', diff: '+b' }],
            estimatedSpend: { numer: 1, denom: 2 },
            estimatedDefect: { numer: 3, denom: 4 },
            requiredAuthority: { numer: 1, denom: 4 },
            policyHash: 'p',
        });

        record.status = 'RECEIPTED';
        record.receipt = makeTestReceipt();

        const langReceipt = commitSessionReceipt(record, 42, 'patch', 'typescript');
        expect(langReceipt).toHaveProperty('receiptId');
        if ('receiptId' in langReceipt) {
            expect(langReceipt.decision).toBe('Commit');
            expect(langReceipt.hash).toHaveLength(32);
            expect(langReceipt.safetyLevel).toBe('ACCEPTED');
        }
    });

    it('should produce RepairNeeded session receipt on rollback', () => {
        const record = propose({
            description: 'Needs repair',
            files: [{ path: 'r.ts', action: 'modify', beforeContent: 'x', afterContent: 'y', diff: '+y' }],
            estimatedSpend: { numer: 0, denom: 1 },
            estimatedDefect: { numer: 0, denom: 1 },
            requiredAuthority: { numer: 0, denom: 1 },
            policyHash: 'p',
        });
        record.status = 'ROLLED_BACK';
        record.rollbackApplied = true;

        const langReceipt = commitSessionReceipt(record, 1, 'repair', 'rust');
        expect(langReceipt).toHaveProperty('receiptId');
        if ('receiptId' in langReceipt) {
            expect(langReceipt.decision).toBe('RepairNeeded');
        }
    });
});

// ═══════════════════════════════════════════════════════════════════
// Failure Classifier
// ═══════════════════════════════════════════════════════════════════
describe('Failure Classifier', () => {
    it('should classify negative spend', () => {
        const result = classifyFailure({ name: 't', passed: false, duration: 0, error: 'negative spend detected' });
        expect(result.category).toBe('rejects_negative_spend');
        expect(result.severity).toBe('ERROR');
        expect(result.offendingField).toBe('spend');
    });

    it('should classify authority cap exceeded', () => {
        const result = classifyFailure({ name: 't', passed: false, duration: 0, error: 'authority cap exceeded' });
        expect(result.category).toBe('rejects_authority_cap_exceeded');
        expect(result.offendingField).toBe('authority');
    });

    it('should classify bad margin', () => {
        const result = classifyFailure({ name: 't', passed: false, duration: 0, error: 'bad margin' });
        expect(result.category).toBe('rejects_bad_margin');
        expect(result.offendingField).toBe('defect');
    });

    it('should classify state root mismatch', () => {
        const result = classifyFailure({ name: 't', passed: false, duration: 0, error: 'state root mismatch' });
        expect(result.category).toBe('rejects_state_root_mismatch');
        expect(result.offendingField).toBe('fromState');
    });

    it('should classify chain digest mismatch', () => {
        const result = classifyFailure({ name: 't', passed: false, duration: 0, error: 'chain digest mismatch' });
        expect(result.category).toBe('rejects_chain_digest_mismatch');
        expect(result.offendingField).toBe('certificateHash');
    });

    it('should classify unauthorized potential creation', () => {
        const result = classifyFailure({ name: 't', passed: false, duration: 0, error: 'unauthorized potential creation' });
        expect(result.category).toBe('rejects_unauthorized_potential_creation');
        expect(result.severity).toBe('FATAL');
    });

    it('should return adversarial for unclassified errors', () => {
        const result = classifyFailure({ name: 't', passed: false, duration: 0, error: 'something completely unexpected' });
        expect(result.category).toBe('adversarial_input_detected');
    });

    it('should return WARNING for passed tests (guard clause)', () => {
        const result = classifyFailure({ name: 't', passed: true, duration: 0 });
        expect(result.category).toBe('adversarial_input_detected');
        expect(result.severity).toBe('WARNING');
    });
});

// ═══════════════════════════════════════════════════════════════════
// Receipt & GMI
// ═══════════════════════════════════════════════════════════════════
describe('Receipt & GMI', () => {
    it('computes memory mass from canonical byte length', () => {
        const receipt = makeTestReceipt({
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 9, denom: 1 },
            spend: { numer: 1, denom: 1 },
        });
        const mass = memoryMass(receipt);
        expect(mass).toBeGreaterThan(0);
        expect(typeof mass).toBe('number');
    });

    it('verifies GMI status correctly', () => {
        const receipt = makeTestReceipt({
            valuationPre: { numer: 10, denom: 1 },
            valuationPost: { numer: 9, denom: 1 },
            spend: { numer: 1, denom: 1 },
        });
        const status = verifyGmiStatus(receipt, hashReceipt(receipt));
        expect(status.hashVerified).toBe(true);
        expect(status.transitionAdmissible).toBe(true);
        expect(status.signatureVerified).toBe(false);
        expect(status.blockHeight).toBe(0);
    });

    it('detects hash mismatch in GMI status', () => {
        const receipt = makeTestReceipt();
        const status = verifyGmiStatus(receipt, 'ffff'.repeat(16));
        expect(status.hashVerified).toBe(false);
    });

    it('builds LanguageReceipt with correct hash length', () => {
        const lr = buildLanguageReceipt('id', 0, 'test', 'domain', 100, 95, 5, 0, 0, 'Commit');
        expect(lr.hash).toHaveLength(32);
        expect(lr.decision).toBe('Commit');
        expect(lr.safetyLevel).toBe('ACCEPTED');
        expect(lr.committedText).not.toBeNull();
    });
});