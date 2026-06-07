// CohBit-Copilot v14.3 — Finding→Proposal Bridge Tests
// 14 tests covering strategy routing, AST-guided proposals,
// safety gating, and batch operations.

import { describe, it, expect } from 'vitest';
import {
    buildProposalFromFinding,
    buildProposalsFromFindings,
    buildAstGuidedProposals,
    buildReviewGatedProposal,
    buildReviewGatedProposals,
    type FindingProposalResult,
} from '../src/finding_to_proposal.js';
import type { ReviewQueueItem } from '../packages/tooling/src/T_rust_review_queue.js';
import type { FunctionContext, RustFunction } from '../packages/tooling/src/T_rust_ast_lite.js';
import type { HumanReviewReceipt } from '../src/human_review_receipt.js';

// ─── Helpers ───────────────────────────────────────────────

function makeFinding(overrides: Partial<ReviewQueueItem> = {}): ReviewQueueItem {
    return {
        findingId: `FIND_${Math.random().toString(36).slice(2, 8)}`,
        file: 'src/test_lib.rs',
        line: 42,
        column: 10,
        riskKind: 'unwrap_review_signal',
        severity: 'medium',
        confidence: 'high',
        fileContext: 'src',
        priority: 'P1',
        evidenceLevel: 'surface_detected',
        matchedText: '.unwrap()',
        recommendation: 'Review unwrap usage',
        ...overrides,
    } as ReviewQueueItem;
}

function makeFuncContext(overrides: Partial<RustFunction> = {}): FunctionContext {
    const func: RustFunction = {
        name: 'test_func',
        line: 40,
        endLine: 55,
        isPublic: true,
        isUnsafe: false,
        isAsync: false,
        isTest: false,
        returnType: 'Result<String, Error>',
        parentImpl: null,
        attributes: [],
        ...overrides,
    };
    return {
        function: func,
        implBlock: null,
        module: null,
        isTestContext: false,
        isProductionContext: true,
    };
}

function makeContent(): string {
    return [
        'pub fn test_func(input: &str) -> Result<String, Error> {',
        '    let val = some_fallible_op(input).unwrap();',
        '    Ok(val)',
        '}',
    ].join('\n');
}

function makeApprovedReceipt(): HumanReviewReceipt {
    return {
        reviewId: 'REV_test_001',
        atlasEntryId: 'ATLAS_001',
        reviewer: 'test-reviewer',
        decision: 'accepted_risk',
        rationale: 'AST context verified — safe for ? conversion',
        proposalAllowed: true,
        reviewedAt: new Date().toISOString(),
        evidenceLevel: 'human_reviewed',
        sourceEvidenceLevel: 'surface_detected',
        commitStatus: 'not_applicable',
    };
}

// ═══════════════════════════════════════════════════════════
// Strategy Routing (4 tests)
// ═══════════════════════════════════════════════════════════

describe('v14.3 — Strategy Routing', () => {
    it('routes human-only patterns to needs_human', () => {
        const finding = makeFinding({ riskKind: 'unsafe_block' });
        const result = buildProposalFromFinding(finding, {
            content: 'unsafe { do_stuff(); }',
        });
        expect(result.status).toBe('no_patch');
        expect(result.reason).toContain('human review');
        expect(result.gateReady).toBe(false);
    });

    it('routes test-context findings to diagnostic_only', () => {
        const finding = makeFinding({
            riskKind: 'unwrap_review_signal',
            fileContext: 'test',
        });
        const ctx = makeFuncContext({ returnType: 'Result<(), Error>' });
        const result = buildProposalFromFinding(finding, {
            content: makeContent(),
            functionContext: ctx,
        });
        expect(result.status).toBe('no_patch');
        expect(result.reason).toContain('Test-context');
    });

    it('routes unwrap with Result return type to AST-guided', () => {
        const finding = makeFinding({ riskKind: 'unwrap_review_signal' });
        const ctx = makeFuncContext({ returnType: 'Result<String, Error>' });
        const result = buildProposalFromFinding(finding, {
            content: makeContent(),
            functionContext: ctx,
        });
        expect(result.status).toBe('proposed');
        expect(result.reason).toContain('AST-guided');
        expect(result.gateReady).toBe(true);
    });

    it('refuses unwrap AST-guided when function returns no Result', () => {
        const finding = makeFinding({ riskKind: 'unwrap_review_signal' });
        const ctx = makeFuncContext({ returnType: 'String' });
        const result = buildProposalFromFinding(finding, {
            content: makeContent(),
            functionContext: ctx,
        });
        expect(result.status).toBe('no_patch');
        expect(result.reason).toContain('returns no Result/Option');
    });
});

// ═══════════════════════════════════════════════════════════
// AST-Guided Proposal Generation (4 tests)
// ═══════════════════════════════════════════════════════════

describe('v14.3 — AST-Guided Proposals', () => {
    it('generates .unwrap() → ? proposal', () => {
        const finding = makeFinding({ riskKind: 'unwrap_review_signal' });
        const ctx = makeFuncContext({ returnType: 'Result<String, Error>' });
        const result = buildProposalFromFinding(finding, {
            content: makeContent(),
            functionContext: ctx,
        });
        expect(result.status).toBe('proposed');
        expect(result.proposal).toBeDefined();
        expect(result.proposal!.policyHash).toBe('v14.3-audit-proposal');
        const file = result.proposal!.files[0];
        expect(file).toBeDefined();
        expect(file!.action).toBe('modify');
        expect(file!.afterContent).not.toContain('.unwrap()');
        expect(file!.afterContent).toContain('?');
    });

    it('generates .expect("...") → ? proposal', () => {
        const content = [
            'pub fn test_func(input: &str) -> Result<String, Error> {',
            '    let val = some_op(input).expect("should work");',
            '    Ok(val)',
            '}',
        ].join('\n');
        const finding = makeFinding({
            riskKind: 'expect_review_signal',
            matchedText: '.expect("should work")',
        });
        const ctx = makeFuncContext({ returnType: 'Result<String, Error>' });
        const result = buildProposalFromFinding(finding, {
            content,
            functionContext: ctx,
        });
        expect(result.status).toBe('proposed');
        expect(result.proposal!.files[0]!.afterContent).not.toContain('.expect');
        expect(result.proposal!.files[0]!.afterContent).toContain('?');
    });

    it('returns no_patch when pattern not found in content', () => {
        const finding = makeFinding({ riskKind: 'unwrap_review_signal' });
        const ctx = makeFuncContext({ returnType: 'Result<(), Error>' });
        const result = buildProposalFromFinding(finding, {
            content: 'fn no_unwrap_here() -> Result<(), Error> { Ok(()) }',
            functionContext: ctx,
        });
        expect(result.status).toBe('no_patch');
        expect(result.reason).toContain('not found');
    });

    it('returns no_patch for needs_ast without FunctionContext', () => {
        const finding = makeFinding({ riskKind: 'unwrap_review_signal' });
        const result = buildProposalFromFinding(finding, {
            content: makeContent(),
        });
        expect(result.status).toBe('no_patch');
        expect(result.reason).toContain('AST-level structural analysis');
    });
});

// ═══════════════════════════════════════════════════════════
// Safety Gating (2 tests)
// ═══════════════════════════════════════════════════════════

describe('v14.3 — Safety Gating', () => {
    it('refuses panic_review_signal even with FunctionContext', () => {
        const finding = makeFinding({ riskKind: 'panic_review_signal' });
        const ctx = makeFuncContext({ returnType: 'Result<(), Error>' });
        const result = buildProposalFromFinding(finding, {
            content: 'panic!("oops");',
            functionContext: ctx,
        });
        expect(result.status).toBe('no_patch');
        expect(result.reason).toContain('semantic analysis');
    });

    it('refuses filesystem_delete_file even with review receipt', () => {
        const finding = makeFinding({
            riskKind: 'filesystem_delete_file',
            file: 'src/cleaner.rs',
        });
        const receipt = makeApprovedReceipt();
        const result = buildReviewGatedProposal(finding, receipt, {
            content: 'std::fs::remove_file(path)?;',
        });
        expect(result.status).toBe('no_patch');
        expect(result.reason).toContain('Manual repair required');
    });
});

// ═══════════════════════════════════════════════════════════
// Batch Operations (2 tests)
// ═══════════════════════════════════════════════════════════

describe('v14.3 — Batch Operations', () => {
    it('batch processes multiple findings with mixed strategies', () => {
        const findings: ReviewQueueItem[] = [
            makeFinding({ findingId: 'F1', riskKind: 'unwrap_review_signal', matchedText: '.unwrap()' }),
            makeFinding({ findingId: 'F2', riskKind: 'unsafe_block', matchedText: 'unsafe { }' }),
            makeFinding({ findingId: 'F3', riskKind: 'todo_review_signal', matchedText: 'todo!()' }),
        ];
        const ctx = makeFuncContext({ returnType: 'Result<String, Error>' });
        const contextMap = new Map<string, FunctionContext>();
        contextMap.set('F1', ctx);

        const results = buildAstGuidedProposals(findings, {
            getContent: () => makeContent(),
            contextMap,
        });

        expect(results).toHaveLength(3);
        expect(results[0]!.status).toBe('proposed');
        expect(results[1]!.status).toBe('no_patch');
        expect(results[2]!.status).toBe('proposed');
    });

    it('buildProposalsFromFindings batches with getFunctionContext', () => {
        const findings: ReviewQueueItem[] = [
            makeFinding({ findingId: 'F10', riskKind: 'unwrap_review_signal' }),
        ];
        const ctx = makeFuncContext({ returnType: 'Result<(), Error>' });

        const results = buildProposalsFromFindings(findings, {
            getContent: () => makeContent(),
            getFunctionContext: (id: string) => id === 'F10' ? ctx : undefined,
        });

        expect(results).toHaveLength(1);
        expect(results[0]!.status).toBe('proposed');
    });
});

// ═══════════════════════════════════════════════════════════
// Proposal Structure (2 tests)
// ═══════════════════════════════════════════════════════════

describe('v14.3 — Proposal Structure', () => {
    it('proposal has all required fields', () => {
        const finding = makeFinding({ riskKind: 'unwrap_review_signal' });
        const ctx = makeFuncContext({ returnType: 'Result<String, Error>' });
        const result = buildProposalFromFinding(finding, {
            content: makeContent(),
            functionContext: ctx,
        });
        expect(result.status).toBe('proposed');
        const p = result.proposal!;
        expect(p.proposalId).toMatch(/^AUDIT_PROP_\d{6}$/);
        expect(p.description).toContain('unwrap_review_signal');
        expect(p.files).toHaveLength(1);
        expect(p.estimatedSpend).toBeDefined();
        expect(p.estimatedDefect).toBeDefined();
        expect(p.requiredAuthority).toBeDefined();
        expect(p.policyHash).toBe('v14.3-audit-proposal');
        expect(p.createdAt).toBeDefined();
    });

    it('proposal is JSON-serializable', () => {
        const finding = makeFinding({ riskKind: 'unwrap_review_signal' });
        const ctx = makeFuncContext({ returnType: 'Result<String, Error>' });
        const result = buildProposalFromFinding(finding, {
            content: makeContent(),
            functionContext: ctx,
        });
        const json = JSON.stringify(result.proposal);
        const parsed = JSON.parse(json);
        expect(parsed.proposalId).toBe(result.proposal!.proposalId);
        expect(parsed.policyHash).toBe('v14.3-audit-proposal');
    });
});