// Cohbit-Copilot Bounded Patch Proposal (v0.7)
// Generates scope-limited PatchProposals from explicit repair intent.
//
// Authority boundary:
//   The proposer may generate a bounded PatchProposal.
//   It may not review, authorize, apply, test, rollback, receipt, or commit.
//
// Supported operations:
//   1. Exact block replacement — find exact beforeContent, replace with afterContent
//   2. Create missing file — only when allowCreate=true, bounded by maxFiles/maxBytesChanged
//   3. Simple test-fix template — off-by-one arithmetic patterns from failure text
//
// Rejects (returns no_patch) for:
//   - Multiple target files
//   - Multiple matching blocks
//   - Unsupported language
//   - Large file change
//   - Delete/rename request
//   - Path outside workspace
//   - Ambiguous failure
//   - Unknown failure category

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
    PatchProposal,
    PatchFile,
    PatchScope,
    BoundedProposalResult,
    ProposalInput,
    ProposalIntent,
    TestResult,
} from './types.js';

// ─── Helpers ───────────────────────────────────────────────────
let counter = 0;
function nextId(): string {
    counter += 1;
    return `prop-v07-${Date.now()}-${counter.toString(16)}`;
}

function byteLength(s: string): number {
    return Buffer.byteLength(s, 'utf-8');
}

function isWithinScope(filePath: string, scope: PatchScope, cwd: string): boolean {
    const resolved = path.resolve(cwd, filePath);
    // No directory traversal
    if (!resolved.startsWith(cwd + path.sep) && resolved !== cwd) {
        return false;
    }
    // Check allowed paths
    if (scope.allowedPaths.length > 0) {
        const relative = path.relative(cwd, resolved);
        return scope.allowedPaths.some(allowed =>
            relative === allowed || relative.startsWith(allowed + path.sep)
        );
    }
    return true; // empty allowedPaths = allow all within cwd
}

// ─── Proposal Structural Validation ─────────────────────────────

export function validateProposalStructure(proposal: PatchProposal): string | null {
    if (!proposal) return 'Proposal is null or undefined';
    if (!proposal.proposalId || typeof proposal.proposalId !== 'string') return 'Missing or invalid proposalId';
    if (!proposal.description || typeof proposal.description !== 'string') return 'Missing or invalid description';
    if (!Array.isArray(proposal.files) || proposal.files.length === 0) return 'Proposal must have at least one file';
    if (!proposal.policyHash || typeof proposal.policyHash !== 'string') return 'Missing or invalid policyHash';
    for (const f of proposal.files) {
        if (!f.path || typeof f.path !== 'string') return 'PatchFile missing path';
        if (!['create', 'modify', 'delete'].includes(f.action)) return `Invalid action: ${f.action}`;
        if (f.action !== 'create' && (f.beforeContent === undefined)) return 'Modify/delete action requires beforeContent';
        if (f.afterContent === undefined && f.action !== 'delete') return 'Create/modify action requires afterContent';
    }
    return null; // valid
}

// ─── Exact Block Replacement ───────────────────────────────────
async function proposeExactBlockReplacement(
    targetPath: string,
    findBlock: string,
    replaceBlock: string,
    scope: PatchScope,
    cwd: string,
): Promise<BoundedProposalResult> {
    if (!scope.allowModify) {
        return { status: 'no_patch', reason: 'allowModify is false', suggestedNextAction: 'Enable allowModify in scope or use create-only operations' };
    }

    const fullPath = path.resolve(cwd, targetPath);
    if (!isWithinScope(targetPath, scope, cwd)) {
        return { status: 'no_patch', reason: `Path ${targetPath} is outside allowed scope`, suggestedNextAction: 'Add path to allowedPaths or restrict proposal scope' };
    }

    let beforeContent: string;
    try {
        beforeContent = await fs.readFile(fullPath, 'utf-8');
    } catch {
        return { status: 'no_patch', reason: `File ${targetPath} does not exist`, suggestedNextAction: 'Use create operation if file should be created, or verify path' };
    }

    // Count occurrences of findBlock
    const occurrences = beforeContent.split(findBlock).length - 1;
    if (occurrences === 0) {
        return { status: 'no_patch', reason: `Block "${findBlock.substring(0, 50)}..." not found in ${targetPath}`, suggestedNextAction: 'Verify the exact text to find matches the current file content' };
    }
    if (occurrences > 1) {
        return { status: 'no_patch', reason: `Block "${findBlock.substring(0, 50)}..." found ${occurrences} times — ambiguous match`, suggestedNextAction: 'Provide a more specific block that uniquely identifies the replacement location' };
    }

    const afterContent = beforeContent.replace(findBlock, replaceBlock);
    const changeBytes = Math.abs(byteLength(beforeContent) - byteLength(afterContent));

    if (changeBytes > scope.maxBytesChanged) {
        return { status: 'no_patch', reason: `Change size ${changeBytes} exceeds maxBytesChanged ${scope.maxBytesChanged}`, suggestedNextAction: 'Increase maxBytesChanged or reduce patch size' };
    }

    const proposal: PatchProposal = {
        proposalId: nextId(),
        description: `Replace exact block in ${targetPath}`,
        files: [{
            path: targetPath,
            action: 'modify',
            beforeContent,
            afterContent,
            diff: `- ${findBlock.substring(0, 100)}\n+ ${replaceBlock.substring(0, 100)}`,
        }],
        estimatedSpend: { numer: 1, denom: 1 },
        estimatedDefect: { numer: 1, denom: 1 },
        requiredAuthority: { numer: 0, denom: 1 },
        policyHash: 'v0.7-bounded-proposal',
        createdAt: new Date().toISOString(),
    };

    return {
        status: 'proposed',
        proposal,
        scope,
        reason: `Exact block replacement: "${findBlock.substring(0, 40)}..." → "${replaceBlock.substring(0, 40)}..."`,
    };
}

// ─── Create Missing File ───────────────────────────────────────
async function proposeCreateFile(
    createPath: string,
    content: string,
    scope: PatchScope,
    cwd: string,
): Promise<BoundedProposalResult> {
    if (!scope.allowCreate) {
        return { status: 'no_patch', reason: 'allowCreate is false', suggestedNextAction: 'Enable allowCreate in scope to create new files' };
    }

    const fullPath = path.resolve(cwd, createPath);
    if (!isWithinScope(createPath, scope, cwd)) {
        return { status: 'no_patch', reason: `Path ${createPath} is outside allowed scope`, suggestedNextAction: 'Add path to allowedPaths or restrict proposal scope' };
    }

    // Check file doesn't already exist
    try {
        await fs.access(fullPath);
        return { status: 'no_patch', reason: `File ${createPath} already exists — use modify instead of create`, suggestedNextAction: 'Use replace_exact_block for existing files, or delete and recreate' };
    } catch {
        // Good — file doesn't exist
    }

    const contentBytes = byteLength(content);
    if (contentBytes > scope.maxBytesChanged) {
        return { status: 'no_patch', reason: `Content size ${contentBytes} exceeds maxBytesChanged ${scope.maxBytesChanged}`, suggestedNextAction: 'Increase maxBytesChanged or reduce content size' };
    }

    const proposal: PatchProposal = {
        proposalId: nextId(),
        description: `Create new file ${createPath}`,
        files: [{
            path: createPath,
            action: 'create',
            beforeContent: null,
            afterContent: content,
            diff: `+ ${content.substring(0, 100)}`,
        }],
        estimatedSpend: { numer: 1, denom: 1 },
        estimatedDefect: { numer: 1, denom: 1 },
        requiredAuthority: { numer: 0, denom: 1 },
        policyHash: 'v0.7-bounded-proposal',
        createdAt: new Date().toISOString(),
    };

    return {
        status: 'proposed',
        proposal,
        scope,
        reason: `Create new file: ${createPath} (${contentBytes} bytes)`,
    };
}

// ─── Simple Test-Fix Template ──────────────────────────────────
function hasOffByOne(failureText: string, testResults: TestResult[]): boolean {
    const text = failureText.toLowerCase();
    // Look for assertion failure patterns suggesting off-by-one
    const hasAssertion = text.includes('assert') || text.includes('expected') || text.includes('assertion');
    const hasNumeric = /\d+/.test(text);

    // Check test results for arithmetic-related failure patterns
    const arithmeticFailures = testResults.filter(t =>
        !t.passed &&
        (t.error?.toLowerCase().includes('expected') || t.error?.toLowerCase().includes('assert'))
    );

    return hasAssertion && hasNumeric && arithmeticFailures.length > 0;
}

async function proposeOffByOneFix(
    targetPath: string,
    failureText: string,
    testResults: TestResult[],
    scope: PatchScope,
    cwd: string,
): Promise<BoundedProposalResult> {
    if (!scope.allowModify) {
        return { status: 'no_patch', reason: 'allowModify is false', suggestedNextAction: 'Enable allowModify in scope' };
    }

    const fullPath = path.resolve(cwd, targetPath);
    if (!isWithinScope(targetPath, scope, cwd)) {
        return { status: 'no_patch', reason: `Path ${targetPath} outside scope`, suggestedNextAction: 'Add to allowedPaths' };
    }

    let content: string;
    try {
        content = await fs.readFile(fullPath, 'utf-8');
    } catch {
        return { status: 'no_patch', reason: `File ${targetPath} not found`, suggestedNextAction: 'Verify path' };
    }

    // Look for common off-by-one patterns
    const patterns = [
        { find: /return\s+a\s*\+\s*b\s*\+\s*1\s*;?\s*\/\/?\s*BUG/i, replace: 'return a + b;' },
        { find: /return\s+a\s*\+\s*b\s*\+\s*1\s*;?/i, replace: 'return a + b;' },
        { find: /return\s+a\s*\+\s*b\s*-\s*1\s*;?\s*\/\/?\s*BUG/i, replace: 'return a + b;' },
        { find: /return\s+a\s*\+\s*b\s*-\s*1\s*;?/i, replace: 'return a + b;' },
    ];

    for (const pattern of patterns) {
        const match = content.match(pattern.find);
        if (match) {
            const findBlock = match[0];
            // Use the exact replacement flow
            return proposeExactBlockReplacement(
                targetPath,
                findBlock,
                'return a + b;',
                scope,
                cwd,
            );
        }
    }

    return { status: 'no_patch', reason: 'No recognized off-by-one pattern found', suggestedNextAction: 'Use exact block replacement with explicit find/replace strings' };
}

// ─── Main Function ─────────────────────────────────────────────
export async function proposeBoundedPatch(input: ProposalInput): Promise<BoundedProposalResult> {
    const { cwd, scope, targetPath, findBlock, replaceBlock, createPath, content, failureText, testResults } = input;

    // 1. Exact block replacement (highest priority)
    if (targetPath && findBlock !== undefined && replaceBlock !== undefined) {
        return proposeExactBlockReplacement(targetPath, findBlock, replaceBlock, scope, cwd);
    }

    // 2. Create missing file
    if (createPath && content !== undefined) {
        return proposeCreateFile(createPath, content, scope, cwd);
    }

    // 3. Simple off-by-one test fix (trial use only)
    if (targetPath && failureText && testResults && hasOffByOne(failureText, testResults)) {
        return proposeOffByOneFix(targetPath, failureText, testResults, scope, cwd);
    }

    return {
        status: 'no_patch',
        reason: 'No supported proposal pattern matched',
        suggestedNextAction: 'Provide explicit --find/--replace for exact block replacement, --create-file/--content for new file creation, or a recognized failure pattern',
    };
}