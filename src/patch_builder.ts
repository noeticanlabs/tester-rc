// CohBit-Copilot Workspace-Aware Patch Builder (v1.5)
// Connects planning output to safe, bounded proposal construction.
//
// Supported primitives:
//   ReplaceExactBlock       — find/replace exact text in a file
//   InsertImportIfAbsent    — insert an import if not already present
//   AppendExport            — append an export statement
//   CreateFileFromTemplate  — create a new file from template content
//   AddCliDispatchArm       — add a new case arm to the CLI dispatch switch
//   AddTestCaseFromTemplate — append a test case from template
//
// Operating law:
//   Patch builder may generate a bounded PatchProposal.
//   It may not review, authorize, apply, test, rollback, receipt, or commit.
//   The proposal must pass through ProposalGate before any mutation.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { proposeBoundedPatch } from './proposer.js';
import { recommend } from './test_recommender.js';
import { scanWorkspace } from './workspace.js';
import type {
    PatchBuildRequest,
    PatchBuildResult,
    PatchPrimitive,
    PatchScope,
    PatchProposal,
    BoundedProposalResult,
} from './types.js';

// ─── Plan to Primitive Mapping ────────────────────────────────

function planIntentToPrimitive(intent: string): PatchPrimitive | null {
    switch (intent) {
        case 'AddCommand': return 'AddCliDispatchArm';
        case 'ModifyFunction': return 'ReplaceExactBlock';
        case 'AddTest': return 'AddTestCaseFromTemplate';
        case 'FixFailure': return 'ReplaceExactBlock';
        default: return null;
    }
}

// ─── Helpers ──────────────────────────────────────────────────

function isWithinWorkspace(filePath: string, cwd: string): boolean {
    const resolved = path.resolve(cwd, filePath);
    return resolved.startsWith(cwd + path.sep) || resolved === cwd;
}

function makeNoPatch(reason: string, suggestedNextAction: string): PatchBuildResult {
    return { status: 'no_patch', reason, suggestedNextAction };
}

// ─── Primitive Implementations ────────────────────────────────

async function doReplaceExactBlock(
    req: PatchBuildRequest,
    cwd: string,
): Promise<BoundedProposalResult> {
    return proposeBoundedPatch({
        cwd,
        targetPath: req.targetFile,
        findBlock: req.find ?? '',
        replaceBlock: req.replace ?? '',
        scope: req.scope,
    });
}

async function doInsertImportIfAbsent(
    req: PatchBuildRequest,
    cwd: string,
): Promise<BoundedProposalResult> {
    const importStmt = req.template ?? req.task;
    if (!importStmt) {
        return { status: 'no_patch', reason: 'No import statement provided via --template', suggestedNextAction: 'Provide the import statement as --template' };
    }

    const fullPath = path.resolve(cwd, req.targetFile);
    let content: string;
    try {
        content = await fs.readFile(fullPath, 'utf-8');
    } catch {
        return { status: 'no_patch', reason: `File ${req.targetFile} not found`, suggestedNextAction: 'Verify the target file path' };
    }

    // Check if import already exists
    const normalized = importStmt.trim().replace(/\s+/g, ' ');
    const normalizedContent = content.replace(/\s+/g, ' ');
    if (normalizedContent.includes(normalized)) {
        return { status: 'no_patch', reason: 'Import statement already present', suggestedNextAction: 'No change needed — import already exists' };
    }

    // Find the last import line as anchor
    const lines = content.split('\n');
    let lastImportLine = -1;
    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i]!.trim();
        if (trimmed.startsWith('import ') || trimmed.startsWith('export ') && trimmed.includes('from')) {
            lastImportLine = i;
        }
    }

    if (lastImportLine < 0) {
        return { status: 'no_patch', reason: 'No existing import found to anchor insertion', suggestedNextAction: 'Use ReplaceExactBlock to add imports at a known position' };
    }

    // Insert after the last import
    const anchorLine = lines[lastImportLine]!;
    const newLines = [...lines];
    newLines.splice(lastImportLine + 1, 0, importStmt);
    const afterContent = newLines.join('\n');

    return proposeBoundedPatch({
        cwd,
        targetPath: req.targetFile,
        findBlock: content,
        replaceBlock: afterContent,
        scope: req.scope,
    });
}

async function doAppendExport(
    req: PatchBuildRequest,
    cwd: string,
): Promise<BoundedProposalResult> {
    const exportStmt = req.template ?? req.task;
    if (!exportStmt) {
        return { status: 'no_patch', reason: 'No export statement provided via --template', suggestedNextAction: 'Provide the export statement as --template' };
    }

    const fullPath = path.resolve(cwd, req.targetFile);
    let content: string;
    try {
        content = await fs.readFile(fullPath, 'utf-8');
    } catch {
        return { status: 'no_patch', reason: `File ${req.targetFile} not found`, suggestedNextAction: 'Verify the target file path' };
    }

    // Check if export already exists
    if (content.includes(exportStmt.trim())) {
        return { status: 'no_patch', reason: 'Export statement already present', suggestedNextAction: 'No change needed — export already exists' };
    }

    // Append at end of file
    const afterContent = content.trimEnd() + '\n' + exportStmt + '\n';

    return proposeBoundedPatch({
        cwd,
        targetPath: req.targetFile,
        findBlock: content,
        replaceBlock: afterContent,
        scope: req.scope,
    });
}

async function doCreateFileFromTemplate(
    req: PatchBuildRequest,
    cwd: string,
): Promise<BoundedProposalResult> {
    const content = req.template ?? '// Generated by CohBit-Copilot v1.5\n';
    return proposeBoundedPatch({
        cwd,
        createPath: req.targetFile,
        content,
        scope: req.scope,
    });
}

async function doAddCliDispatchArm(
    req: PatchBuildRequest,
    cwd: string,
): Promise<BoundedProposalResult> {
    const commandName = req.template ?? req.task;
    if (!commandName) {
        return { status: 'no_patch', reason: 'No command name provided via --template', suggestedNextAction: 'Provide the command name as --template' };
    }

    const fullPath = path.resolve(cwd, req.targetFile);
    let content: string;
    try {
        content = await fs.readFile(fullPath, 'utf-8');
    } catch {
        return { status: 'no_patch', reason: `File ${req.targetFile} not found`, suggestedNextAction: 'Verify the target file path' };
    }

    // Find the default: case in the switch statement
    const defaultMatch = content.match(/\n(\s+)(default\s*:)/);
    if (!defaultMatch) {
        return { status: 'no_patch', reason: 'No default: case found in switch statement', suggestedNextAction: 'Use ReplaceExactBlock to manually add the dispatch arm' };
    }

    const indent = defaultMatch[1]!; // indentation before default
    const newArm = `${indent}case '${commandName}':\n${indent}    await handle${commandName.charAt(0).toUpperCase() + commandName.slice(1)}(args);\n${indent}    break;\n`;
    const anchor = defaultMatch[0]; // "\n    default:"

    const afterContent = content.replace(anchor, '\n' + newArm + anchor.slice(1));

    return proposeBoundedPatch({
        cwd,
        targetPath: req.targetFile,
        findBlock: content,
        replaceBlock: afterContent,
        scope: req.scope,
    });
}

async function doAddTestCaseFromTemplate(
    req: PatchBuildRequest,
    cwd: string,
): Promise<BoundedProposalResult> {
    const testDescription = req.template ?? req.task;
    if (!testDescription) {
        return { status: 'no_patch', reason: 'No test description provided via --template', suggestedNextAction: 'Provide the test description as --template' };
    }

    const fullPath = path.resolve(cwd, req.targetFile);
    let content: string;
    try {
        content = await fs.readFile(fullPath, 'utf-8');
    } catch {
        return { status: 'no_patch', reason: `File ${req.targetFile} not found`, suggestedNextAction: 'Verify the target file path' };
    }

    // Find the last closing }); of a test block or describe block
    const lastClose = content.lastIndexOf('});');
    if (lastClose < 0) {
        return { status: 'no_patch', reason: 'No test block structure found (no });)', suggestedNextAction: 'Use ReplaceExactBlock to manually add the test case' };
    }

    const indent = '    ';
    const testCase = `\n${indent}it('${testDescription}', async () => {\n${indent}    // TODO: implement test\n${indent}    expect(true).toBe(true);\n${indent}});\n`;

    const before = content.substring(0, lastClose);
    const after = content.substring(lastClose);
    const afterContent = before + testCase + after;

    return proposeBoundedPatch({
        cwd,
        targetPath: req.targetFile,
        findBlock: content,
        replaceBlock: afterContent,
        scope: req.scope,
    });
}

// ─── Request Validation ───────────────────────────────────────

function validateRequest(req: PatchBuildRequest, cwd: string): PatchBuildResult | null {
    // Check target file is within workspace
    if (!isWithinWorkspace(req.targetFile, cwd)) {
        return makeNoPatch(
            `Path ${req.targetFile} is outside workspace`,
            'Provide a path within the project directory',
        );
    }

    // Check scope is defined
    if (!req.scope || req.scope.maxFiles < 1) {
        return makeNoPatch(
            'Invalid patch scope',
            'Define a valid PatchScope with maxFiles >= 1 and maxBytesChanged > 0',
        );
    }

    // Check primitive is recognized
    const validPrimitives: PatchPrimitive[] = [
        'ReplaceExactBlock', 'InsertImportIfAbsent', 'AppendExport',
        'CreateFileFromTemplate', 'AddCliDispatchArm', 'AddTestCaseFromTemplate',
    ];
    if (!validPrimitives.includes(req.primitive)) {
        return makeNoPatch(
            `Unknown primitive: ${req.primitive}`,
            `Use one of: ${validPrimitives.join(', ')}`,
        );
    }

    // For ReplaceExactBlock, find and replace are required
    if (req.primitive === 'ReplaceExactBlock' && (!req.find || !req.replace)) {
        return makeNoPatch(
            'ReplaceExactBlock requires --find and --replace',
            'Provide the exact block to find and its replacement text',
        );
    }

    return null; // valid
}

// ─── Public API ───────────────────────────────────────────────

export async function buildPatch(
    req: PatchBuildRequest,
    cwd: string,
): Promise<PatchBuildResult> {
    // Validate
    const validationError = validateRequest(req, cwd);
    if (validationError) return validationError;

    // Route to primitive
    let result: BoundedProposalResult;
    switch (req.primitive) {
        case 'ReplaceExactBlock':
            result = await doReplaceExactBlock(req, cwd);
            break;
        case 'InsertImportIfAbsent':
            result = await doInsertImportIfAbsent(req, cwd);
            break;
        case 'AppendExport':
            result = await doAppendExport(req, cwd);
            break;
        case 'CreateFileFromTemplate':
            result = await doCreateFileFromTemplate(req, cwd);
            break;
        case 'AddCliDispatchArm':
            result = await doAddCliDispatchArm(req, cwd);
            break;
        case 'AddTestCaseFromTemplate':
            result = await doAddTestCaseFromTemplate(req, cwd);
            break;
        default:
            return makeNoPatch(
                `Primitive ${req.primitive} not yet implemented`,
                'Check the primitive spelling or use a supported primitive',
            );
    }

    if (result.status === 'no_patch') {
        return {
            status: 'no_patch',
            reason: result.reason,
            suggestedNextAction: result.suggestedNextAction,
        };
    }

    // Enrich with test recommendations
    const ws = await scanWorkspace(cwd);
    const testRec = recommend({
        likelyFiles: [req.targetFile],
        workspace: ws,
    });
    const suggestedTests = testRec.commands.map(c =>
        c.command + (c.tier === 'full' ? '  (full suite)' : '')
    );

    return {
        status: 'proposed',
        proposal: result.proposal,
        primitive: req.primitive,
        bounds: req.scope,
        suggestedTests,
        reason: result.reason,
    };
}