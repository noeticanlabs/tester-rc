#!/usr/bin/env node
// CohBit-Copilot CLI (v14.6-rc)
// Exposes the governed patch pipeline, integrated audit, obligations, and dashboard.
// All auditable handlers are wrapped in runGoverned() for resource enforcement.
//
// Authority boundary:
//   The CLI may propose, inspect, recommend, run tests, and classify failures.
//   It may not silently commit, approve its own proposals, or self-authorize.
//   The `run` command prepares a proposal and prints next steps — it does NOT
//   auto-review, auto-authorize, or auto-apply. Each gate requires an explicit
//   operator command.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
    propose,
    review,
    authorize,
    apply,
    runTests,
    rollback,
    commitReceipt,
    commitSessionReceipt,
} from './gates.js';
import {
    snapshotWorkspace,
    applyPatch,
    rollbackWorkspace,
    runProjectTests,
} from './fs.js';
import {
    detectLanguage,
    defaultTestCommand,
    isToolAvailable,
} from './lang.js';
import { hashReceipt } from './receipt.js';
import type {
    GateRecord,
    CohBitReceipt,
    Rational64,
    TestResult,
    PatchScope,
} from './types.js';
import { proposeBoundedPatch } from './proposer.js';
import { loadRecentSessions, summarizeSession } from './ledger.js';
import { scanWorkspace } from './workspace.js';
import { reviewEnvironment } from './environment.js';
import { extractSymbols, findSymbolsInProject } from './symbols.js';
import { buildDependencyGraph, findDependents, findAffectedFiles } from './dep_graph.js';
import { parseOperatorEnglish } from './english.js';
import { plan } from './planner.js';
import { recommend } from './test_recommender.js';
import { buildPatch } from './patch_builder.js';
import { buildRepairPlan } from './repair_planner.js';
import { classifyPatchFile, buildAtlasEntry, mapCommandToSemantics } from './atlas_bridge.js';
import { storeAtlasEntry, queryByReceipt, queryByInvariant, listRecentAtlasEntries } from '../packages/code-atlas/src/store.js';
import { ATOMIC_INVARIANTS, listByFamily } from '../packages/code-atlas/src/L3_invariant.js';
import { ALL_TRANSITIONS, listByKind } from '../packages/code-atlas/src/L4_transition.js';
import { runIntegratedAudit } from './integrated_pipeline.js';
import {
    getAllObligations,
    queryObligationsByStatus,
    queryObligationsByPriority,
    generateDashboard,
    loadObligationStore,
    type ObligationLifecycleStatus,
} from './atlas_integration.js';
import {
    teach,
    listTopics,
    generateQuiz,
    formatTeachingOutput,
    formatQuizOutput,
    seedLessonsIfEmpty,
    listLessons,
    type TeachingAudience,
    type TeachingResponse,
    type QuizQuestion,
} from './teaching.js';
import { saveGateRecord, loadGateRecord, updateGateRecord, listGateRecords } from './gate_store.js';
import { runGoverned } from '../packages/tooling/src/T_resource_governor.js';
import { buildMemoryStabilityReport, renderMemoryStabilityMarkdown, renderMemoryStabilityJson } from './memory_stability.js';
import { formatSystemExplain, formatAbout } from './system_explain.js';
import { formatAccessStatus, setProfile } from './access_control.js';
import { initConfig } from './onboarding.js';
import { renderCommandHub, routeHubSelection, routeHubName } from './command_hub.js';
import { runStarterDemo } from './demo_runner.js';
import { formatNetworkStatus, setNetworkMode } from './network_boundary.js';
import {
    listRepairs,
    formatRepairList,
    showRepair,
    formatRepairDetail,
    explainRepair,
    approveRepair,
    rejectRepair,
    formatRepairSummary,
} from './repair_review.js';

// ─── Session Store ─────────────────────────────────────────────

async function saveSession(record: GateRecord): Promise<void> {
    await saveGateRecord(record);
}

async function loadSession(proposalId: string): Promise<GateRecord | null> {
    const record = await loadGateRecord(proposalId);
    return record ?? null;
}

// ─── Helpers ───────────────────────────────────────────────────

function parseRational(input: string): Rational64 | null {
    const parts = input.split('/');
    if (parts.length === 1) {
        const n = parseInt(parts[0]!, 10);
        if (isNaN(n)) return null;
        return { numer: n, denom: 1 };
    }
    if (parts.length === 2) {
        const n = parseInt(parts[0]!, 10);
        const d = parseInt(parts[1]!, 10);
        if (isNaN(n) || isNaN(d) || d < 1) return null;
        return { numer: n, denom: d };
    }
    return null;
}

function printRecord(record: GateRecord): void {
    console.log(`\n═══ Proposal ${record.proposal.proposalId} ═══`);
    console.log(`  Status:    ${record.status}`);
    console.log(`  Description: ${record.proposal.description}`);
    console.log(`  Files:     ${record.proposal.files.map(f => f.path).join(', ')}`);
    console.log(`  Spend:     ${record.proposal.estimatedSpend.numer}/${record.proposal.estimatedSpend.denom}`);
    console.log(`  Defect:    ${record.proposal.estimatedDefect.numer}/${record.proposal.estimatedDefect.denom}`);
    console.log(`  Authority: ${record.proposal.requiredAuthority.numer}/${record.proposal.requiredAuthority.denom}`);
    console.log(`  Policy:    ${record.proposal.policyHash}`);
    if (record.receipt) {
        console.log(`  Receipt:   ${record.receipt.bitId}`);
    }
    console.log(`  Timeline:`);
    for (const event of record.timeline) {
        console.log(`    [${event.timestamp}] ${event.gate} → ${event.status}: ${event.details}`);
    }
    if (record.testResults) {
        const passed = record.testResults.filter(t => t.passed).length;
        const failed = record.testResults.filter(t => !t.passed).length;
        console.log(`  Tests:     ${passed} passed, ${failed} failed`);
    }
}

function printHelp(): void {
    console.log(`
CohBit-Copilot — Governed Patch Pipeline CLI

Usage:
  cohbit-copilot <command> [options]

Commands:
  propose           Create a bounded patch proposal
  review            Human inspection gate
  authorize         Policy + admissibility check
  apply             Write patch to filesystem
  test              Run project test suite
  rollback          Restore pre-patch state
  receipt           Finalize and emit receipt
  status            Show current gate status
  run               Execute full pipeline
  plan              Generate a scoped engineering work plan
  test-recommend    Suggest test commands for a task or file
  inspect           Summarize workspace structure
  env               Review environment and tool availability
  recent            Show recent session history
  session           Show session details
  build-patch       Build a bounded PatchProposal from a plan or primitive
  work              Orchestrate a full copilot session
  atlas             Query the Code Invariant Atlas
  audit             Run the integrated audit pipeline
  obligations       List repair obligations from the audit store
  dashboard         Show obligation health and aging dashboard
  curriculum        Browse the Noetican coding curriculum
  repair-review     Inspect, approve, or reject repair tasks
  propose-repair    Convert approved repair to gate pipeline proposal
  help              Show this message
`);
}

// ─── Command Handlers ──────────────────────────────────────────

interface CliArgs {
    command: string;
    proposalId?: string | undefined;
    description?: string | undefined;
    files?: string[] | undefined;
    spend?: string | undefined;
    defect?: string | undefined;
    authority?: string | undefined;
    approve?: boolean | undefined;
    reject?: boolean | undefined;
    reviewer?: string | undefined;
    comments?: string | undefined;
    testCommand?: string | undefined;
    emptyTestPolicy?: string | undefined;
    domainId?: string | undefined;
    policy?: string | undefined;
    help?: boolean | undefined;
    json?: boolean | undefined;
    taskText?: string | undefined;
    file?: string | undefined;
    planRef?: string | undefined;
    primitive?: string | undefined;
    template?: string | undefined;
    propose?: boolean | undefined;
    latestFailure?: boolean | undefined;
}

function parseArgs(args: string[]): CliArgs {
    const result: CliArgs = { command: args[0] ?? 'help' };
    let i = 1;
    while (i < args.length) {
        const arg = args[i];
        if (arg === undefined) break;
        switch (arg) {
            case '--description': result.description = args[++i]; break;
            case '--files':
                result.files = [];
                while (args[i + 1] && !args[i + 1]?.startsWith('--')) { result.files.push(args[++i]!); }
                break;
            case '--spend': result.spend = args[++i]; break;
            case '--defect': result.defect = args[++i]; break;
            case '--authority': result.authority = args[++i]; break;
            case '--approve': result.approve = true; break;
            case '--reject': result.reject = true; break;
            case '--public': result.approve = true; break;
            case '--linkedin': result.reject = true; break;
            case '--internal': result.approve = false; result.reject = false; break;
            case '--topic':
                if (result.command === 'quiz' || result.command === 'teach') {
                    if (result.taskText == null) { result.taskText = args[++i]; }
                    else { result.taskText += ' ' + args[++i]; }
                    while (args[i + 1] && !(args[i + 1] ?? '').startsWith('--')) { result.taskText += ' ' + args[++i]!; }
                }
                break;
            case '--reviewer': result.reviewer = args[++i]; break;
            case '--comments': result.comments = args[++i]; break;
            case '--command': result.testCommand = args[++i]; break;
            case '--empty-test-policy': result.emptyTestPolicy = args[++i]; break;
            case '--domain-id': result.domainId = args[++i]; break;
            case '--policy': result.policy = args[++i]; break;
            case '--file': result.file = args[++i]; break;
            case '--plan': result.planRef = args[++i] ?? 'latest'; break;
            case '--primitive': result.primitive = args[++i]; break;
            case '--template': result.template = args[++i]; break;
            case '--propose': result.propose = true; break;
            case '--latest-failure': result.latestFailure = true; break;
            case '--status': result.testCommand = args[++i]; break;
            case '--priority': result.spend = args[++i]; break;
            case '--out': result.file = args[++i]; break;
            case '--json': result.json = true; break;
            case '--help': case '-h': result.help = true; break;
            default:
                if (result.command === 'plan' || result.command === 'test-recommend' || result.command === 'work' || result.command === 'audit' ||
                    result.command === 'teach' || result.command === 'quiz' || result.command === 'lesson' ||
                    result.command === 'curriculum' || result.command === 'network' || result.command === 'system' || result.command === 'access' || result.command === 'demo' || result.command === 'start') {
                    if (result.taskText == null) { result.taskText = arg; }
                    else { result.taskText += ' ' + arg; }
                    while (args[i + 1] && !(args[i + 1] ?? '').startsWith('--')) { result.taskText += ' ' + args[++i]!; }
                } else if (arg.startsWith('prop-') || result.command === 'status' || result.command === 'apply' ||
                    result.command === 'test' || result.command === 'rollback' || result.command === 'receipt' ||
                    result.command === 'authorize' || result.command === 'review' ||
                    result.command === 'explain-finding' || result.command === 'explain-obligation' ||
                    result.command === 'repair-review' || result.command === 'propose-repair') {
                    result.proposalId = arg;
                }
                break;
        }
        i++;
    }
    return result;
}

// ═══ Governed Gate Handlers (wrapped in runGoverned) ═══════════

async function handlePropose(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'gate-propose' }, async () => {
        if (!args.description) { console.error('Error: --description is required'); process.exit(1); }
        if (!args.files || args.files.length === 0) { console.error('Error: --files is required'); process.exit(1); }

        const fileEntries = [];
        for (const filePath of args.files) {
            let beforeContent: string;
            try { beforeContent = await fs.readFile(filePath, 'utf-8'); } catch { beforeContent = ''; }
            fileEntries.push({ path: filePath, action: beforeContent === '' ? ('create' as const) : ('modify' as const), beforeContent: beforeContent || null, afterContent: beforeContent, diff: '(pending)' });
        }

        const spend = args.spend ? parseRational(args.spend) : { numer: 0, denom: 1 };
        const defect = args.defect ? parseRational(args.defect) : { numer: 0, denom: 1 };
        const authority = args.authority ? parseRational(args.authority) : { numer: 0, denom: 1 };
        if (!spend || !defect || !authority) { console.error('Error: Invalid rational format.'); process.exit(1); }

        const record = propose({ description: args.description, files: fileEntries, estimatedSpend: spend, estimatedDefect: defect, requiredAuthority: authority, policyHash: args.policy ?? 'default' });
        await saveSession(record);
        console.log(`Proposal created: ${record.proposal.proposalId}`);
        printRecord(record);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleReview(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'gate-review' }, async () => {
        const record = await loadSession(args.proposalId ?? '');
        if (!record) { console.error(`Error: Proposal ${args.proposalId} not found`); process.exit(1); }
        const updated = review(record, args.reviewer ?? 'unknown', args.approve === true, args.comments ?? '');
        await saveSession(updated);
        printRecord(updated);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleAuthorize(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'gate-authorize' }, async () => {
        const record = await loadSession(args.proposalId ?? '');
        if (!record) { console.error(`Error: Proposal ${args.proposalId} not found`); process.exit(1); }
        const receipt: CohBitReceipt = {
            bitId: '', valuationPre: { numer: 10, denom: 1 }, valuationPost: { numer: 11, denom: 1 },
            wedge: { version: '0.3.0', domainId: args.domainId ?? 'default', policyHash: record.proposal.policyHash, fromState: '0'.repeat(64), toState: '0'.repeat(64), actionHash: '0'.repeat(64), spend: record.proposal.estimatedSpend, defect: record.proposal.estimatedDefect, prescribedEnvelope: { numer: 1, denom: 1 }, authority: record.proposal.requiredAuthority, certificateHash: '0'.repeat(64) },
        };
        const updated = authorize(record, { domainId: args.domainId ?? 'default', valuationPre: { numer: 10, denom: 1 }, valuationPost: { numer: 11, denom: 1 }, memoryBudget: 1000000, traceBudget: 1000000 }, receipt);
        await saveSession(updated);
        printRecord(updated);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleApply(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'gate-apply' }, async () => {
        const record = await loadSession(args.proposalId ?? '');
        if (!record) { console.error(`Error: Proposal ${args.proposalId} not found`); process.exit(1); }
        if (record.status !== 'AUTHORIZED') { console.error(`Cannot apply — status is ${record.status}`); process.exit(1); }
        const applyResult = await applyPatch(record.proposal);
        const updated = await apply(record, { filesModified: applyResult.filesModified, prePatchHashes: applyResult.prePatchHashes, postPatchHashes: applyResult.postPatchHashes, snapshotFiles: applyResult.snapshotFiles } as any);
        await saveSession(updated);
        console.log(`Applied to ${applyResult.appliedFiles.length} files.`);
        printRecord(updated);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleTest(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'gate-test' }, async () => {
        const record = await loadSession(args.proposalId ?? '');
        if (!record) { console.error(`Error: Proposal ${args.proposalId} not found`); process.exit(1); }
        if (record.status !== 'APPLIED') { console.error(`Cannot test — status is ${record.status}`); process.exit(1); }
        let commandToRun: string;
        if (args.testCommand) { commandToRun = args.testCommand; }
        else { const lang = await detectLanguage(process.cwd()); commandToRun = defaultTestCommand(lang); }
        const testResults = await runProjectTests({ command: commandToRun, emptyTestPolicy: (args.emptyTestPolicy as 'allow-with-notice' | 'reject') ?? 'allow-with-notice', timeoutMs: 30000 });
        const updated = runTests(record, testResults);
        await saveSession(updated);
        printRecord(updated);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleRollback(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'gate-rollback' }, async () => {
        const record = await loadSession(args.proposalId ?? '');
        if (!record) { console.error(`Error: Proposal ${args.proposalId} not found`); process.exit(1); }
        if (record.status !== 'TESTS_FAILED') { console.error(`Cannot rollback — status is ${record.status}`); process.exit(1); }
        if (record.applySnapshot && record.applySnapshot.files.length > 0) {
            const result = await rollbackWorkspace(record.applySnapshot);
            console.log(`Rollback: ${result.success ? 'success' : 'partial'} — ${result.filesRestored.length} files restored`);
            if (result.warnings.length > 0) console.log('Warnings:', result.warnings.join('; '));
        }
        const updated = rollback(record);
        await saveSession(updated);
        printRecord(updated);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleReceipt(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'gate-receipt' }, async () => {
        const record = await loadSession(args.proposalId ?? '');
        if (!record) { console.error(`Error: Proposal ${args.proposalId} not found`); process.exit(1); }
        const updated = commitReceipt(record, { numer: 10, denom: 1 }, { numer: 11, denom: 1 }, args.domainId ?? 'default', '0'.repeat(64));
        console.log(updated.receipt ? `Receipt committed: ${updated.receipt.bitId}` : 'Receipt not produced.');
        await saveSession(updated);
        printRecord(updated);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

// ═══ Governed Audit / Teaching / Plan Handlers ═════════════════

async function handleAudit(args: CliArgs): Promise<void> {
    const targetRaw = args.taskText ?? process.cwd();
    if (!targetRaw || typeof targetRaw !== 'string') {
        console.error('Error: Audit target must be a valid path.');
        process.exit(1);
    }
    const target = path.resolve(targetRaw);
    console.log(`\n═══ CohBit-Copilot Integrated Audit ═══`);
    console.log(`  Target: ${target}`);
    const governed = await runGoverned({ workflowId: 'cli-command' }, async () => {
        const result = await runIntegratedAudit(target);
        if (args.json) { console.log(JSON.stringify({ target: result.target, sessionId: result.sessionId, ranAt: result.ranAt, totalMs: result.totalMs, summary: result.summary, reconciliation: result.reconciliation }, null, 2)); }
        else { console.log(`  Files: ${result.summary.files} | Findings: ${result.summary.totalFindings} | Time: ${(result.totalMs / 1000).toFixed(1)}s`); }
        process.exit(0);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleTeach(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'teach-explain' }, async () => {
        const topic = args.taskText ?? '';
        if (!topic) { console.error('Error: Topic required.'); process.exit(1); }
        let audience: TeachingAudience = 'internal';
        if (args.reject === true) audience = 'linkedin'; else if (args.approve === true) audience = 'public';
        const corpusPath = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\Doctrine curriuclum\\Noetican Code';
        const result = await teach(topic, audience, corpusPath);
        if (result.response) { console.log(formatTeachingOutput(result.response)); }
        else if (result.fallbackSummary) { console.log(result.fallbackSummary); }
        process.exit(0);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handlePlan(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'cli-command' }, async () => {
        if (!args.taskText) { console.error('Error: Task description required.'); process.exit(1); }
        const workPlan = await plan(args.taskText, process.cwd());
        if (args.json) { console.log(JSON.stringify(workPlan, null, 2)); return; }
        console.log(`\n═══ Work Plan ═══`);
        console.log(`  Intent: ${workPlan.intent}  Confidence: ${workPlan.confidence}  Risk: ${workPlan.risk}`);
        for (const f of workPlan.likelyFiles) console.log(`  ${f.path} (${f.role})`);
        for (let i = 0; i < workPlan.steps.length; i++) console.log(`  ${i + 1}. ${workPlan.steps[i]}`);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleBuildPatch(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'proposal-build' }, async () => {
        if (!args.file) { console.error('Error: --file is required.'); process.exit(1); }
        if (!args.primitive) { console.error('Error: --primitive is required.'); process.exit(1); }
        const scope: PatchScope = { allowedPaths: [args.file], maxFiles: 1, maxBytesChanged: 8192, allowCreate: args.primitive === 'CreateFileFromTemplate', allowModify: args.primitive !== 'CreateFileFromTemplate', allowDelete: false };
        const result = await buildPatch({ task: args.taskText ?? args.template ?? 'patch', targetFile: args.file, primitive: args.primitive as any, find: args.description, replace: args.template, template: args.template, scope }, process.cwd());
        if (args.json) { console.log(JSON.stringify(result, null, 2)); return; }
        if (result.status === 'no_patch') { console.log(`No patch: ${result.reason}`); return; }
        console.log(`Proposal: ${result.proposal.proposalId}  Primitive: ${result.primitive}  Target: ${args.file}`);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleWork(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'cli-command' }, async () => {
        if (!args.taskText) { console.error('Error: Task description required.'); process.exit(1); }
        const task = args.taskText; const cwd = process.cwd();
        const english = parseOperatorEnglish(task);
        console.log(`\n═══ Work Session ═══\n  Task: "${task}"`);
        console.log(`  Intent: ${english.intent}  Confidence: ${english.confidence}`);
        const workPlan = await plan(task, cwd);
        if (workPlan.likelyFiles.length > 0) {
            console.log('  Likely Files:');
            for (const f of workPlan.likelyFiles.slice(0, 5)) console.log(`    ${f.path} (${f.role})`);
        }
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleCurriculum(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'teach-curriculum' }, async () => {
        const subcommand = args.taskText ?? 'list';
        if (subcommand === 'list') {
            console.log('\n═══ Noetican Labs Multi-Language Coding Curriculum ═══');
            console.log('  M0 — Code as State Transition | M1 — Python Safe File Tool | M2 — TypeScript Receipt Validator');
            console.log('  M3 — Secure Coding | M4 — SQL + Audit | M5 — Resource-Aware | M6 — Governed APIs');
            console.log('  M7 — Multi-Language | M8 — Rust Verifier | M9 — Lean Proof | M10 — Formal Bridge | M11 — CI/CD');
        } else if (subcommand === 'teach') {
            const moduleQuery = args.file ?? args.proposalId ?? 'm0';
            const moduleMap: Record<string, string> = { m0: 'module 0: code as state transition', m1: 'module 1: python safe file tool', m2: 'module 2: typescript receipt validator', m3: 'module 3: secure coding and cia lab', m4: 'module 4: sql persistence, audit tables, and rollback', m5: 'module 5: resource-aware and constrained computing', m6: 'module 6: governed apis, tool calls, and automation', m7: 'module 7: multi-language transition interoperability', m8: 'module 8: rust high-integrity verifier', m9: 'module 9: lean proof obligations and ctrl theorem repair', m10: 'module 10: formal-to-runtime bridge and atlas memory', m11: 'module 11: cicd gates, release discipline, and governed packages' };
            const topic = moduleMap[moduleQuery.toLowerCase()] ?? moduleQuery;
            const newArgs: CliArgs = { ...args, command: 'teach', taskText: topic };
            await handleTeach(newArgs);
            return;
        } else if (subcommand === 'quiz') {
            const moduleQuery = args.file ?? args.proposalId ?? 'm0';
            const quiz = generateQuiz(moduleQuery);
            if (quiz) console.log(formatQuizOutput(quiz));
            else console.error(`No quiz available for "${moduleQuery}".`);
        }
        process.exit(0);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

// ═══ Non-Governed Handlers (read-only, negligible resources) ═══

async function handleStatus(args: CliArgs): Promise<void> {
    const record = await loadSession(args.proposalId ?? '');
    if (!record) { console.error(`Error: Proposal ${args.proposalId} not found`); process.exit(1); }
    printRecord(record);
}

async function handleInspect(args: CliArgs): Promise<void> {
    const ws = await scanWorkspace(process.cwd());
    if (args.json) { console.log(JSON.stringify(ws, null, 2)); return; }
    console.log(`\n═══ Workspace Summary ═══`);
    console.log(`  Language: ${ws.language}  |  Total files: ${ws.totalFiles}`);
    console.log(`  Source: ${ws.sourceFiles.length}  |  Test: ${ws.testFiles.length}  |  Config: ${ws.configFiles.length}  |  Docs: ${ws.docsFiles.length}`);
}

async function handleEnv(args: CliArgs): Promise<void> {
    const report = await reviewEnvironment(process.cwd());
    if (args.json) { console.log(JSON.stringify(report, null, 2)); return; }
    console.log(`  Language: ${report.language}  |  Risk: ${report.riskLevel}  |  Git: ${report.gitAvailable}`);
}

async function handleRecent(): Promise<void> {
    const sessions = await loadRecentSessions(10);
    if (sessions.length === 0) { console.log('No sessions recorded yet.'); return; }
    for (const s of sessions) console.log(`  ${s.sessionId}  ${s.lastStatus}  ${s.lastTimestamp}`);
}

async function handleSessionShow(args: CliArgs): Promise<void> {
    const sessionId = args.proposalId ?? '';
    if (!sessionId) { console.error('Error: session ID required'); process.exit(1); }
    const summary = await summarizeSession(sessionId);
    if (!summary) { console.error(`Session ${sessionId} not found`); process.exit(1); }
    console.log(`  Status: ${summary.lastStatus}  Events: ${summary.eventCount}`);
}

async function handleTestRecommend(args: CliArgs): Promise<void> {
    const ws = await scanWorkspace(process.cwd());
    let likelyFiles: string[] = [];
    if (args.file) { likelyFiles = [args.file]; }
    else if (args.taskText) { const wp = await plan(args.taskText, process.cwd()); likelyFiles = wp.likelyFiles.map(f => f.path); }
    else { console.error('Error: Provide a task description or --file.'); process.exit(1); }
    const rec = recommend({ likelyFiles, workspace: ws });
    if (args.json) { console.log(JSON.stringify(rec, null, 2)); return; }
    for (const cmd of rec.commands) console.log(`  ${cmd.command} (${cmd.confidence}, ${cmd.tier})`);
}

// ═══ Governed Repair-Plan Handler ══════════════════════════════

async function handleRepair(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'repair-plan' }, async () => {
        let failureText: string;
        if (args.latestFailure) {
            const sessions = await loadRecentSessions(1);
            if (sessions.length === 0 || !sessions[0]!.description) { console.error('Error: No recent failures found.'); process.exit(1); }
            failureText = sessions[0]!.description!;
        } else if (args.taskText) { failureText = args.taskText; }
        else { console.error('Error: Provide failure text or use --latest-failure.'); process.exit(1); }
        const repairPlan = await buildRepairPlan(failureText, process.cwd());
        if (args.json) { console.log(JSON.stringify(repairPlan, null, 2)); return; }
        console.log(`Failures: ${repairPlan.failures.length}  Risk: ${repairPlan.risk}`);
        for (const f of repairPlan.failures.slice(0, 8)) console.log(`  ${f.source}/${f.file ?? '?'}:${f.line ?? '?'} ${f.message.substring(0, 80)}`);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleAtlas(args: CliArgs): Promise<void> {
    const subcommand = args.taskText ?? (args.file ?? 'list');
    if (subcommand === 'invariants') { for (const inv of ATOMIC_INVARIANTS.values()) console.log(`  ${inv.id} ${inv.name} [${inv.family}]`); }
    else if (subcommand === 'transitions') { for (const t of ALL_TRANSITIONS.values()) console.log(`  ${t.transitionId} ${t.name} [${t.kind}]`); }
    else { const entries = await listRecentAtlasEntries(20); for (const e of entries) console.log(`  ${e.receiptBitId} ${e.claimStatus}`); }
}

async function handleRun(args: CliArgs): Promise<void> {
    if (!args.description || !args.files) { console.error('Error: --description and --files are required'); process.exit(1); }
    await handlePropose(args);
    const records = await listGateRecords();
    const record = args.proposalId ? await loadSession(args.proposalId) : (records.length > 0 ? records[records.length - 1] : undefined);
    if (!record) { console.log('Proposal not found.'); return; }
    const proposalId = record.proposal.proposalId;
    console.log(`\n═══ Pipeline Prepared ═══`);
    printRecord(record);
    console.log(`\n  ⚠ The copilot cannot self-approve or bypass review.`);
    console.log(`  Next: cohbit-copilot review ${proposalId} --approve --reviewer <name>`);
    console.log(`  Then: cohbit-copilot authorize ${proposalId}`);
    console.log(`  Then: cohbit-copilot apply ${proposalId}`);
    console.log(`  Then: cohbit-copilot test ${proposalId}`);
    console.log(`  Then: cohbit-copilot receipt ${proposalId}\n`);
}

async function handleObligations(args: CliArgs): Promise<void> {
    await loadObligationStore();
    const statusFilter = (args.testCommand as ObligationLifecycleStatus | undefined) ?? undefined;
    const obligations = statusFilter ? queryObligationsByStatus(statusFilter) : getAllObligations();
    if (args.json) { console.log(JSON.stringify({ count: obligations.length }, null, 2)); }
    else { for (const o of obligations.slice(0, 50)) console.log(`  [${o.finding.priority}] ${o.finding.file}:${o.finding.line} — ${o.finding.riskKind} — ${o.currentStatus}`); }
    process.exit(0);
}

async function handleDashboard(args: CliArgs): Promise<void> {
    await loadObligationStore();
    const dashboard = generateDashboard();
    if (args.json) { console.log(JSON.stringify(dashboard, null, 2)); }
    else { console.log(`  Total: ${dashboard.health.total} | Open: ${dashboard.health.open} | Needs Fix: ${dashboard.health.needsRepair} | Resolved: ${dashboard.health.resolved}`); }
    process.exit(0);
}

async function handleExplainFinding(args: CliArgs): Promise<void> {
    const findingId = args.proposalId ?? '';
    if (!findingId) { console.error('Error: Finding ID required.'); process.exit(1); }
    console.log(`Finding: ${findingId} — A finding is a surface-detected pattern, not a verified defect.`);
    process.exit(0);
}

async function handleExplainObligation(args: CliArgs): Promise<void> {
    const obligationId = args.proposalId ?? '';
    if (!obligationId) { console.error('Error: Obligation ID required.'); process.exit(1); }
    console.log(`Obligation: ${obligationId} — An obligation is a recognized responsibility to investigate, not a confirmed defect.`);
    process.exit(0);
}

async function handleLesson(args: CliArgs): Promise<void> {
    const subcommand = args.taskText ?? 'list';
    if (subcommand === 'list') {
        await seedLessonsIfEmpty();
        const all = await listLessons();
        for (const l of all) console.log(`  ${l.lessonId} [${l.severity}] ${l.title}`);
    } else if (subcommand === 'receipts') {
        const { listTeachingReceipts, formatTeachingReceipt } = await import('./teaching.js');
        const receipts = await listTeachingReceipts();
        for (const r of receipts) console.log(formatTeachingReceipt(r));
    }
    process.exit(0);
}

async function handlePolarity(args: CliArgs): Promise<void> {
    const { listPolarityRecords, comparePolarityRecords, formatLearningRecord, formatComparison } = await import('../packages/tlt-atlas/src/L16_learning_polarity.js');
    const subcommand = args.taskText ?? 'list';
    if (subcommand === 'compare') {
        const records = await listPolarityRecords();
        const byHash = new Map<string, typeof records>();
        for (const r of records) { const group = byHash.get(r.corpusHash) || []; group.push(r); byHash.set(r.corpusHash, group); }
        for (const [, group] of byHash) {
            group.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
            if (group.length >= 2) console.log(formatComparison(comparePolarityRecords(group[1]!, group[0]!), group[1]!.recordId, group[0]!.recordId));
        }
    } else {
        const records = await listPolarityRecords();
        for (const r of records) console.log(`  ${r.recordId} ${r.polarity} confidence:${r.confidence}`);
    }
    process.exit(0);
}

async function handleQuiz(args: CliArgs): Promise<void> {
    const topic = args.taskText ?? '';
    if (!topic) { console.error('Error: Topic required.'); process.exit(1); }
    const quiz = generateQuiz(topic);
    if (!quiz) { console.error(`No quiz available for: "${topic}"`); process.exit(1); }
    console.log(formatQuizOutput(quiz));
    process.exit(0);
}

async function handleMemory(args: CliArgs): Promise<void> {
    if (args.taskText === 'stability' || args.taskText === undefined) {
        const report = await buildMemoryStabilityReport();
        if (args.json) {
            console.log(renderMemoryStabilityJson(report));
        } else {
            console.log(renderMemoryStabilityMarkdown(report));
        }
    } else {
        console.log('Usage: cohbit-copilot memory stability [--json]');
    }
    process.exit(0);
}

// ─── v14.2 Handlers ────────────────────────────────────────────

async function handleInit(_args: CliArgs): Promise<void> {
    console.log(initConfig(false));
    process.exit(0);
}

async function handleStart(_args: CliArgs): Promise<void> {
    console.log(renderCommandHub());
    console.log('\n  (Run "cohbit-copilot start --select <1-9>" for automated selection)');
    process.exit(0);
}

async function handleSystem(args: CliArgs): Promise<void> {
    const subcommand = args.taskText ?? 'explain';
    if (subcommand === 'about') {
        console.log(formatAbout());
    } else if (subcommand === 'explain' || subcommand === undefined) {
        console.log(formatSystemExplain());
    } else {
        console.log(`Unknown system subcommand: ${subcommand}`);
    }
    process.exit(0);
}

async function handleAccess(args: CliArgs): Promise<void> {
    const subcommand = args.taskText ?? 'show';
    if (subcommand === 'show' || subcommand === undefined) {
        console.log(formatAccessStatus());
    } else if (subcommand === 'set') {
        const profile = args.proposalId ?? args.testCommand ?? '';
        if (!profile) {
            console.log('Error: Profile name required. Usage: cohbit-copilot access set <profile>');
            console.log('Available: observer | learner | reviewer | operator | maintainer');
        } else {
            console.log(setProfile(profile));
        }
    } else {
        console.log(`Unknown access subcommand: ${subcommand}`);
    }
    process.exit(0);
}

async function handleDemo(args: CliArgs): Promise<void> {
    const subcommand = args.taskText ?? 'starter';
    if (subcommand === 'starter' || subcommand === undefined) {
        console.log(runStarterDemo());
    } else {
        console.log(`Unknown demo subcommand: ${subcommand}. Try: cohbit-copilot demo starter`);
    }
    process.exit(0);
}

async function handleNetwork(args: CliArgs): Promise<void> {
    const raw = args.taskText ?? "status";
    if (raw === "status" || raw === undefined) {
        console.log(formatNetworkStatus());
    } else if (raw.startsWith("set")) {
        const mode = raw.slice("set".length).trim() || (args.proposalId ?? args.testCommand ?? "");
        if (!mode) console.log("Error: Network mode required. Usage: cohbit-copilot network set offline|local-lan");
        else console.log(setNetworkMode(mode));
    } else { console.log("Unknown network subcommand: " + raw); }
    process.exit(0);
}

// ─── v14.5 Handlers ────────────────────────────────────────────

// ─── Repair Review Handlers ────────────────────────────────────

async function handleRepairReview(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'repair-review' }, async () => {
        const subcommand = args.taskText ?? 'summary';
        if (subcommand === 'list') {
            const status = (args.testCommand as any) ?? 'all';
            const priority = args.spend as any;
            const tasks = listRepairs({ status, priority, limit: args.json ? 50 : 50 });
            console.log(formatRepairList(tasks));
        } else if (subcommand === 'show') {
            const id = args.proposalId ?? '';
            if (!id) { console.error('Error: Repair ID required.'); process.exit(1); }
            const detail = showRepair(id);
            if (!detail) { console.error(`No repair found for "${id}".`); process.exit(1); }
            console.log(formatRepairDetail(detail));
        } else if (subcommand === 'explain') {
            const id = args.proposalId ?? '';
            if (!id) { console.error('Error: Repair ID required.'); process.exit(1); }
            const explanation = explainRepair(id);
            if (!explanation) { console.error(`No repair found for "${id}".`); process.exit(1); }
            console.log(explanation);
        } else if (subcommand === 'approve') {
            const id = args.proposalId ?? '';
            if (!id) { console.error('Error: Repair ID required.'); process.exit(1); }
            const result = approveRepair(id);
            console.log(result.success ? `✅ ${result.reason}` : `❌ ${result.reason}`);
        } else if (subcommand === 'reject') {
            const id = args.proposalId ?? '';
            if (!id) { console.error('Error: Repair ID required.'); process.exit(1); }
            const reason = args.comments ?? 'rejected by operator';
            const result = rejectRepair(id, reason);
            console.log(result.success ? `❌ ${result.reason}` : `⚠ ${result.reason}`);
        } else if (subcommand === 'summary') {
            console.log(formatRepairSummary());
        } else {
            console.log(`Unknown repair-review subcommand: ${subcommand}`);
            console.log('Usage: cohbit-copilot repair-review [list|show|explain|approve|reject|summary] [id]');
        }
        process.exit(0);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

async function handleProposeFromRepair(args: CliArgs): Promise<void> {
    const governed = await runGoverned({ workflowId: 'propose-from-repair' }, async () => {
        const repairId = args.proposalId ?? '';
        if (!repairId) { console.error('Error: Repair ID required.'); process.exit(1); }
        const detail = showRepair(repairId);
        if (!detail) { console.error(`No repair found for "${repairId}".`); process.exit(1); }
        const t = detail.task;
        if (t.status !== 'completed') {
            console.error(`Repair ${t.repairTaskId} is in status "${t.status}". It must be approved (completed) before proposing.`);
            console.error('Run: cohbit-copilot repair-review approve ' + t.repairTaskId);
            process.exit(1);
        }

        const fileEntries = [];
        if (t.proposalId) {
            const existingRecord = await loadSession(t.proposalId);
            if (existingRecord) {
                for (const f of existingRecord.proposal.files) {
                    let beforeContent: string;
                    try { beforeContent = await fs.readFile(f.path, 'utf-8'); } catch { beforeContent = ''; }
                    fileEntries.push({
                        path: f.path,
                        action: f.action,
                        beforeContent: beforeContent || null,
                        afterContent: beforeContent,
                        diff: '(from repair)',
                    });
                }
            }
        }

        if (fileEntries.length === 0) {
            fileEntries.push({
                path: t.sourceRecordId,
                action: 'modify' as const,
                beforeContent: '(unknown)',
                afterContent: '(pending from repair)',
                diff: `Repair: ${t.problem}`,
            });
        }

        const spend = { numer: 0, denom: 1 };
        const defect = { numer: 0, denom: 1 };
        const authority = { numer: 0, denom: 1 };

        const record = propose({
            description: `Repair: ${t.problem}`,
            files: fileEntries,
            estimatedSpend: spend,
            estimatedDefect: defect,
            requiredAuthority: authority,
            policyHash: 'repair-' + t.repairTaskId,
        });

        t.proposalId = record.proposal.proposalId;

        await saveSession(record);
        console.log(`Proposal created from repair ${t.repairTaskId}: ${record.proposal.proposalId}`);
        printRecord(record);
        console.log(`\n  ⚠ The copilot cannot self-approve or bypass review.`);
        console.log(`  Next: cohbit-copilot review ${record.proposal.proposalId} --approve --reviewer <name>`);
        console.log(`  Then: cohbit-copilot authorize ${record.proposal.proposalId}`);
        console.log(`  Then: cohbit-copilot apply ${record.proposal.proposalId}`);
    });
    if ('error' in governed) { console.error(`Resource governor: ${governed.error}`); process.exit(1); }
}

// ─── Entry Point ───────────────────────────────────────────────

async function main(): Promise<void> {
    const rawArgs = process.argv.slice(2);
    if (rawArgs.length === 0) { printHelp(); process.exit(0); }
    const args = parseArgs(rawArgs);
    if (args.help) { printHelp(); process.exit(0); }

    try {
        switch (args.command) {
            case 'propose': await handlePropose(args); break;
            case 'review': await handleReview(args); break;
            case 'authorize': await handleAuthorize(args); break;
            case 'apply': await handleApply(args); break;
            case 'test': await handleTest(args); break;
            case 'rollback': await handleRollback(args); break;
            case 'receipt': await handleReceipt(args); break;
            case 'status': await handleStatus(args); break;
            case 'run': await handleRun(args); break;
            case 'recent': await handleRecent(); break;
            case 'session': await handleSessionShow(args); break;
            case 'inspect': await handleInspect(args); break;
            case 'env': await handleEnv(args); break;
            case 'plan': await handlePlan(args); break;
            case 'test-recommend': await handleTestRecommend(args); break;
            case 'build-patch': await handleBuildPatch(args); break;
            case 'work': await handleWork(args); break;
            case 'repair': await handleRepair(args); break;
            case 'atlas': await handleAtlas(args); break;
            case 'audit': await handleAudit(args); break;
            case 'obligations': await handleObligations(args); break;
            case 'dashboard': await handleDashboard(args); break;
            case 'teach': await handleTeach(args); break;
            case 'explain-finding': await handleExplainFinding(args); break;
            case 'explain-obligation': await handleExplainObligation(args); break;
            case 'lesson': await handleLesson(args); break;
            case 'quiz': await handleQuiz(args); break;
            case 'curriculum': await handleCurriculum(args); break;
            case 'memory': await handleMemory(args); break;
            case 'init': await handleInit(args); break;
            case 'start': await handleStart(args); break;
            case 'system': await handleSystem(args); break;
            case 'access': await handleAccess(args); break;
            case 'demo': await handleDemo(args); break;
            case 'network': await handleNetwork(args); break;
            case 'repair-review': await handleRepairReview(args); break;
            case 'propose-repair': await handleProposeFromRepair(args); break;
            case 'help': printHelp(); break;
            default:
                console.error(`Unknown command: ${args.command}`);
                process.exit(1);
        }
    } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}

main();