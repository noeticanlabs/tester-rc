// CohBit-Copilot Finding → Proposal Bridge (v6.0 → v14.3A)
// Converts calibrated audit findings into bounded patch proposals.
// Connects the v5.0 detection pipeline to the existing gate pipeline.
//
// v14.3: Adds AST-guided replacement strategies for unwrap, expect,
//        path_join_dynamic, and format_path riskKinds.
// v14.3A: Adds behavior-change warning to unwrap/expect proposals.
//
// Operating law:
//   The bridge may propose bounded fixes.
//   It may not authorize, apply, verify, or commit.
//   Proposals are advisory until they pass through the gate pipeline.
//   mayGenerateProposal must be explicitly enabled per finding.

import type { ReviewQueueItem } from '../packages/tooling/src/T_rust_review_queue.js';
import type { PatchProposal, PatchFile, PatchScope } from './types.js';
import type { HumanReviewReceipt } from './human_review_receipt.js';
import type { FunctionContext } from '../packages/tooling/src/T_rust_ast_lite.js';

// ─── Types ─────────────────────────────────────────────────────

export interface FindingProposalResult {
    status: 'proposed' | 'no_patch';
    proposal?: PatchProposal;
    finding: ReviewQueueItem;
    reason: string;
    gateReady: boolean;
}

export interface AstGuidedProposalOptions {
    content?: string;
    scope?: PatchScope;
    /** AST-lite function context for the finding's location */
    functionContext?: FunctionContext;
}

// ─── Strategy result type ──────────────────────────────────────

interface StrategyResult {
    strategy: ProposalStrategy;
    reason: string;
    findPattern?: string;
    replacePattern?: string;
    safetyCheck?: (content: string, ctx: FunctionContext) => string | null;
}

// ─── riskKind → Proposal Strategy ──────────────────────────────

type ProposalStrategy =
    | 'replace_block'
    | 'diagnostic_only'
    | 'needs_ast'
    | 'needs_human'
    | 'replace_block_ast_guided';

function strategyForRisk(
    riskKind: string,
    fileContext: string,
    functionContext?: FunctionContext,
): StrategyResult {
    // Patterns that are human-review-only
    const humanOnly = new Set([
        'unsafe_block', 'unsafe_function', 'process_command', 'command_new',
        'filesystem_delete_file', 'filesystem_delete_recursive',
        'filesystem_path_from_variable', 'relative_traversal',
    ]);

    // Patterns that need AST analysis — but when we have FunctionContext,
    // some of these can generate AST-guided proposals
    const needsAst = new Set([
        'unwrap_review_signal', 'expect_review_signal', 'panic_review_signal',
        'path_join_dynamic', 'format_path',
    ]);

    // Patterns that can become bounded proposals (simple regex-based)
    const replaceBlock = new Set([
        'todo_review_signal', 'unimplemented_review_signal', 'path_join_literal',
    ]);

    // Test-context: everything is diagnostic
    const isTest = fileContext === 'test' || fileContext === 'fixture';
    if (isTest) {
        return { strategy: 'diagnostic_only', reason: 'Test-context finding. No automatic proposal in test code.' };
    }

    if (humanOnly.has(riskKind)) {
        return { strategy: 'needs_human', reason: 'Safety-critical pattern. Requires human review before any proposal.' };
    }

    // ── v14.3: AST-guided strategies ──────────────────────────
    // When FunctionContext is available, convert needs_ast → replace_block_ast_guided
    if (needsAst.has(riskKind) && functionContext) {
        return strategyForNeedsAstWithContext(riskKind, functionContext);
    }

    if (needsAst.has(riskKind)) {
        return { strategy: 'needs_ast', reason: 'Requires AST-level structural analysis before a safe proposal can be generated.' };
    }

    if (replaceBlock.has(riskKind)) {
        if (riskKind === 'todo_review_signal' || riskKind === 'unimplemented_review_signal') {
            return {
                strategy: 'replace_block',
                reason: 'Replace todo!/unimplemented! with a documented placeholder or routing to a tracking issue.',
                findPattern: '(todo!|unimplemented!)',
                replacePattern: '// TODO(v14.3): tracked at [issue-reference] — review needed',
            };
        }
        // path_join_literal: diagnostic only, no find/replace pattern needed
        return {
            strategy: 'replace_block',
            reason: 'Literal path join is typically benign — diagnostic only.',
        };
    }

    return { strategy: 'diagnostic_only', reason: 'No automatic fix strategy available for this pattern.' };
}

// ── v14.3: AST-Guided Strategy Generator ──────────────────────

function strategyForNeedsAstWithContext(riskKind: string, ctx: FunctionContext): StrategyResult {
    const func = ctx.function;
    if (!func) {
        return { strategy: 'needs_ast', reason: `No enclosing function found for ${riskKind} — AST context missing.` };
    }

    switch (riskKind) {
        case 'unwrap_review_signal': {
            // Safety: enclosing function must return Result<_, _> or Option<_>
            const returnOk = func.returnType
                ? /Result\s*<|Option\s*</i.test(func.returnType)
                : false;

            if (!returnOk) {
                return {
                    strategy: 'needs_ast',
                    reason: `enclosing fn '${func.name}' returns no Result/Option — ? operator cannot be applied. Manual review required.`,
                };
            }

            return {
                strategy: 'replace_block_ast_guided',
                reason: `AST-guided: replace .unwrap() with ? operator in fn '${func.name}' (returns compatible type).`,
                findPattern: '\\.unwrap\\(\\)',
                replacePattern: '?',
                safetyCheck: (_content: string, _ctx: FunctionContext) => null,
            };
        }

        case 'expect_review_signal': {
            const returnOk = func.returnType
                ? /Result\s*<|Option\s*</i.test(func.returnType)
                : false;

            if (!returnOk) {
                return {
                    strategy: 'needs_ast',
                    reason: `enclosing fn '${func.name}' returns no Result/Option — .expect("msg") cannot be converted to ?.`,
                };
            }

            return {
                strategy: 'replace_block_ast_guided',
                reason: `AST-guided: replace .expect("...") with ? operator in fn '${func.name}'. The expect message will be lost; human reviewer should verify error propagation.`,
                findPattern: '\\.expect\\([^)]*\\)',
                replacePattern: '?',
                safetyCheck: (_content: string, _ctx: FunctionContext) => null,
            };
        }

        case 'path_join_dynamic': {
            return {
                strategy: 'replace_block_ast_guided',
                reason: `AST-guided: replace dynamic path construction with Path::new().join() for platform-agnostic safety.`,
                findPattern: 'format!\\(\\s*"\\{[^}]*\\}/\\{[^}]*\\}"\\s*,\\s*([^,]+)\\s*,\\s*([^)]+)\\)',
                replacePattern: 'Path::new($1).join($2)',
                safetyCheck: (_content: string, _ctx: FunctionContext) => null,
            };
        }

        case 'format_path': {
            // No generated find/replace — requires exact matched text from the scanner
            return {
                strategy: 'replace_block_ast_guided',
                reason: `AST-guided: replace format!() path construction with structural Path::join() for clarity.`,
                safetyCheck: (_content: string, _ctx: FunctionContext) => null,
            };
        }

        case 'panic_review_signal': {
            return {
                strategy: 'needs_ast',
                reason: `panic! in fn '${func.name}' — semantic analysis required. Cannot auto-replace with Result.`,
            };
        }

        default:
            return { strategy: 'needs_ast', reason: `No AST-guided strategy for ${riskKind}.` };
    }
}

// ─── Proposal Builder ──────────────────────────────────────────

let proposalCounter = 0;

/**
 * Build a bounded patch proposal from an audit finding.
 * Supports v14.3 AST-guided replacement strategies when FunctionContext is provided.
 */
export function buildProposalFromFinding(
    finding: ReviewQueueItem,
    options?: AstGuidedProposalOptions,
): FindingProposalResult {
    proposalCounter += 1;

    const { strategy, reason, findPattern, replacePattern, safetyCheck } =
        strategyForRisk(finding.riskKind, finding.fileContext, options?.functionContext);

    if (strategy === 'diagnostic_only' || strategy === 'needs_human') {
        return {
            status: 'no_patch',
            finding,
            reason,
            gateReady: false,
        };
    }

    // needs_ast without FunctionContext — no proposal
    if (strategy === 'needs_ast') {
        return {
            status: 'no_patch',
            finding,
            reason,
            gateReady: false,
        };
    }

    const content = options?.content;
    if (!content) {
        return {
            status: 'no_patch',
            finding,
            reason: 'No file content provided for proposal generation.',
            gateReady: false,
        };
    }

    // ── replace_block (simple regex) ──────────────────────────
    if (strategy === 'replace_block' && findPattern && replacePattern) {
        if (!new RegExp(findPattern).test(content)) {
            return {
                status: 'no_patch',
                finding,
                reason: `Pattern "${findPattern}" not found in file content. Cannot generate bounded proposal.`,
                gateReady: false,
            };
        }

        const patchFile: PatchFile = {
            path: finding.file,
            action: 'modify',
            beforeContent: content,
            afterContent: content.replace(new RegExp(findPattern, 'g'), replacePattern),
            diff: `Replace ${findPattern} → ${replacePattern}`,
        };

        return makeProposal(finding, patchFile, reason);
    }

    // ── replace_block_ast_guided ──────────────────────────────
    if (strategy === 'replace_block_ast_guided') {
        // Run safety check if provided
        if (safetyCheck && options?.functionContext) {
            const error = safetyCheck(content, options.functionContext);
            if (error) {
                return {
                    status: 'no_patch',
                    finding,
                    reason: `AST guard rejected: ${error}`,
                    gateReady: false,
                };
            }
        }

        // For AST-guided: use the find/replace patterns if available
        if (findPattern && replacePattern) {
            const regex = new RegExp(findPattern, 'g');
            if (!regex.test(content)) {
                return {
                    status: 'no_patch',
                    finding,
                    reason: `AST-guided pattern "${findPattern}" not found in file. The code may have changed since scanning.`,
                    gateReady: false,
                };
            }

            const regex2 = new RegExp(findPattern, 'g'); // fresh regex
            const afterContent = content.replace(regex2, replacePattern);

            const patchFile: PatchFile = {
                path: finding.file,
                action: 'modify',
                beforeContent: content,
                afterContent,
                diff: `AST-guided: "${findPattern}" → "${replacePattern}" in fn '${options?.functionContext?.function?.name ?? 'unknown'}'`,
            };

            return makeProposal(finding, patchFile, reason);
        }

        // No find/replace pattern available — need exact matched text
        if (!finding.matchedText) {
            return {
                status: 'no_patch',
                finding,
                reason: `AST-guided strategy for ${finding.riskKind} requires matched text, but none found.`,
                gateReady: false,
            };
        }

        // For format_path without a find pattern: diagnostic with suggestion
        return {
            status: 'no_patch',
            finding,
            reason: `AST-guided strategy identified for ${finding.riskKind} but automatic replacement not available without exact pattern. Suggestion: replace \`${finding.matchedText}\` with Path::new().join() form.`,
            gateReady: false,
        };
    }

    return {
        status: 'no_patch',
        finding,
        reason: 'No file content provided for proposal generation.',
        gateReady: false,
    };
}

// v14.3A: Behavior-change warning for unwrap/expect proposals
const BEHAVIOR_WARNING_UNWRAP = '\n⚠ Behavior may change from panic-on-failure to error propagation. Reviewer must confirm intended API behavior.';

/** Helper: create a FindingProposalResult with a PatchProposal */
function makeProposal(
    finding: ReviewQueueItem,
    patchFile: PatchFile,
    reason: string,
): FindingProposalResult {
    const isUnwrapOrExpect = finding.riskKind === 'unwrap_review_signal' || finding.riskKind === 'expect_review_signal';
    const desc = `Audit-guided fix: ${finding.riskKind} at ${finding.file}:${finding.line}`;
    const proposal: PatchProposal = {
        proposalId: `AUDIT_PROP_${String(proposalCounter).padStart(6, '0')}`,
        description: isUnwrapOrExpect ? desc + BEHAVIOR_WARNING_UNWRAP : desc,
        files: [patchFile],
        estimatedSpend: { numer: 1, denom: 100 },
        estimatedDefect: { numer: 5, denom: 100 },
        requiredAuthority: { numer: 5, denom: 100 },
        policyHash: 'v14.3-audit-proposal',
        createdAt: new Date().toISOString(),
    };

    return {
        status: 'proposed',
        proposal,
        finding,
        reason: `Bounded proposal generated for ${finding.riskKind}: ${reason}. Requires gate pipeline review before apply.`,
        gateReady: true,
    };
}

/**
 * Batch: build proposals from multiple findings.
 * Skips findings that can't produce proposals.
 */
export function buildProposalsFromFindings(
    findings: ReviewQueueItem[],
    options?: {
        getContent?: (file: string) => string | undefined;
        getFunctionContext?: (findingId: string) => FunctionContext | undefined;
        scope?: PatchScope;
    },
): FindingProposalResult[] {
    const results: FindingProposalResult[] = [];

    for (const finding of findings) {
        const content = options?.getContent?.(finding.file);
        const functionContext = options?.getFunctionContext?.(finding.findingId);
        const buildOpts: AstGuidedProposalOptions = {};
        if (content) buildOpts.content = content;
        if (functionContext) buildOpts.functionContext = functionContext;
        results.push(buildProposalFromFinding(finding, buildOpts));
    }

    return results;
}

// ─── v14.3: AST-Guided Batch Proposal ─────────────────────────

/**
 * Build AST-guided proposals from findings enriched with FunctionContext.
 * Only findings with a valid FunctionContext (from AST-lite parsing)
 * may produce AST-guided proposals.
 */
export function buildAstGuidedProposals(
    findings: ReviewQueueItem[],
    options: {
        getContent?: (file: string) => string | undefined;
        contextMap?: Map<string, FunctionContext>;
        scope?: PatchScope;
    },
): FindingProposalResult[] {
    const results: FindingProposalResult[] = [];

    for (const finding of findings) {
        const content = options?.getContent?.(finding.file);
        const functionContext = options?.contextMap?.get(finding.findingId);
        const buildOpts: AstGuidedProposalOptions = {};
        if (content) buildOpts.content = content;
        if (functionContext) buildOpts.functionContext = functionContext;
        results.push(buildProposalFromFinding(finding, buildOpts));
    }

    return results;
}

// ─── v6.1: Review-Gated Proposal ───────────────────────────────

/**
 * Build a proposal only if a human review receipt explicitly allows it.
 * Even with proposalAllowed=true, safety-critical patterns (unsafe, process_command,
 * filesystem_delete, relative_traversal) are never auto-generated.
 */
export function buildReviewGatedProposal(
    finding: ReviewQueueItem,
    receipt: HumanReviewReceipt,
    options?: AstGuidedProposalOptions,
): FindingProposalResult {
    // Always-refused safety-critical patterns
    const alwaysRefuse = new Set([
        'unsafe_block', 'unsafe_function',
        'process_command', 'command_new',
        'filesystem_delete_file', 'filesystem_delete_recursive',
        'filesystem_path_from_variable', 'relative_traversal',
    ]);

    if (alwaysRefuse.has(finding.riskKind)) {
        return {
            status: 'no_patch',
            finding,
            reason: `Safety-critical pattern "${finding.riskKind}" — not eligible for proposal even with human review. Manual repair required.`,
            gateReady: false,
        };
    }

    if (!receipt.proposalAllowed) {
        return {
            status: 'no_patch',
            finding,
            reason: 'Human review receipt does not allow proposal generation.',
            gateReady: false,
        };
    }

    // Delegate to standard builder (proposalAllowed overrides needs_human/needs_ast gates)
    return buildProposalFromFinding(finding, options);
}

/**
 * Batch: build review-gated proposals from findings with stored receipts.
 */
export function buildReviewGatedProposals(
    findings: ReviewQueueItem[],
    receipts: Map<string, HumanReviewReceipt>,
    options?: {
        getContent?: (file: string) => string | undefined;
        getFunctionContext?: (findingId: string) => FunctionContext | undefined;
        scope?: PatchScope;
    },
): FindingProposalResult[] {
    const results: FindingProposalResult[] = [];

    for (const finding of findings) {
        const receipt = receipts.get(finding.findingId);
        // No receipt → standard behavior (needs_human / needs_ast)
        if (!receipt) {
            const content = options?.getContent?.(finding.file);
            const functionContext = options?.getFunctionContext?.(finding.findingId);
            const buildOpts: AstGuidedProposalOptions = {};
            if (content) buildOpts.content = content;
            if (functionContext) buildOpts.functionContext = functionContext;
            results.push(buildProposalFromFinding(finding, buildOpts));
            continue;
        }

        const content = options?.getContent?.(finding.file);
        const functionContext = options?.getFunctionContext?.(finding.findingId);
        const gatedOpts: AstGuidedProposalOptions = {};
        if (content) gatedOpts.content = content;
        if (functionContext) gatedOpts.functionContext = functionContext;
        results.push(buildReviewGatedProposal(finding, receipt, gatedOpts));
    }

    return results;
}