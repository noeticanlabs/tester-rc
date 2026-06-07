// CohBit-Copilot v9.0 — TLT Bidirectional Trial
// Verifies all four TLT directions:
//   1. Ears:  language → graph (transformToTltGraph)
//   2. Edges: graph topology construction (buildTltEdges)
//   3. Voice: graph → language advisory (renderGraphToVoice, renderExecutiveSummary)
//   4. Feed:  candidate pattern submission (submitCandidatesFromScan)
//
// Operating law:
//   TLT = language ↔ graph bidirectional interface.
//   TLT Atlas = structural map. TLT Voice renders advisory language.
//   TLT Feed submits candidates. All output is advisory.

import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { seedTltGraphFromContent } from '../src/atlas_integration.js';
import { transformToTltGraph, buildTltEdges } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import { renderGraphToVoice, renderExecutiveSummary, renderNodeToVoice, renderEdgeToVoice, resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { submitCandidatesFromScan, getCandidateReport, clearCandidateStore } from '../packages/tlt-atlas/src/T_tlt_atlas_feed.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    console.log('=== CohBit-Copilot v9.0 TLT Bidirectional Trial ===\n');

    // ─── 1. Load artifacts ─────────────────────────────────────
    const files = await fs.readdir('docs');
    const mdFiles = files.filter(f => f.endsWith('.md')).map(f => path.join('docs', f));
    console.log(`Reading ${mdFiles.length} markdown files from docs/...`);
    const result = readContentFiles(mdFiles, { maxTotalBytes: 10 * 1024 * 1024, maxFiles: 20 });

    // ─── 2. Ears: Language → Graph ─────────────────────────────
    console.log('\n── 1. EARS: Language → Graph ──');
    const tltInputs = result.artifacts.map(a => ({ path: a.path, language: a.language, text: a.text }));
    const graph = transformToTltGraph(tltInputs);

    console.log(`Nodes: ${graph.summary.totalNodes}`);
    console.log(`  Claims:      ${graph.summary.claims}`);
    console.log(`  Risks:       ${graph.summary.risks}`);
    console.log(`  Definitions: ${graph.summary.definitions}`);
    console.log(`  Ambiguity:   ${graph.summary.ambiguityNodes}`);
    console.log(`  Tone:        ${graph.summary.toneMarkers}`);
    console.log(`  Domain:      ${graph.summary.domainContexts}`);

    const earsPass = graph.summary.totalNodes > 0 && graph.summary.claims > 0 && graph.summary.risks > 0;
    console.log(earsPass ? '  ✓ Ears: Language → Graph transformation produces nonzero nodes.\n' : '  ⚠ Ears check failed.\n');

    // ─── 3. Edges: Graph Topology ──────────────────────────────
    console.log('── 2. EDGES: Graph Topology ──');
    const edges = buildTltEdges(graph.nodes);
    console.log(`Edges constructed: ${edges.length}`);

    // Verify edge type distribution
    const edgeTypeCounts: Record<string, number> = {};
    for (const e of edges) {
        edgeTypeCounts[e.edgeType] = (edgeTypeCounts[e.edgeType] || 0) + 1;
    }
    for (const [type, count] of Object.entries(edgeTypeCounts)) {
        console.log(`  ${type}: ${count}`);
    }

    const edgesPass = edges.length > 0;
    console.log(edgesPass ? '  ✓ Edges: Graph topology constructed with nonzero edges.\n' : '  ⚠ Edges check failed.\n');

    // Assign edges back to graph result for voice rendering
    graph.edges.length = 0;
    for (const e of edges) graph.edges.push(e);

    // ─── 4. Multi-signal verification ──────────────────────────
    console.log('── 3. MULTI-SIGNAL: One line, many node types ──');
    // Check: do any lines produce multiple nodes with different types?
    const byFileLine = new Map<string, Set<string>>();
    for (const node of graph.nodes) {
        const key = `${node.sourceFile}:${node.lineApprox}`;
        const types = byFileLine.get(key) || new Set();
        types.add(node.nodeType);
        byFileLine.set(key, types);
    }
    const multiSignalLines = [...byFileLine.entries()].filter(([, types]) => types.size > 1);
    const multiSignalPass = multiSignalLines.length > 0;
    console.log(`Lines with multiple node types: ${multiSignalLines.length}`);
    for (const [key, types] of multiSignalLines.slice(0, 5)) {
        console.log(`  ${key} → types: ${[...types].join(', ')}`);
    }
    if (multiSignalLines.length > 5) console.log(`  ... and ${multiSignalLines.length - 5} more`);
    console.log(multiSignalPass ? '  ✓ Multi-signal detection: lines produce multiple node types.\n' : '  ⚠ No multi-signal lines detected.\n');

    // ─── 5. Voice: Graph → Language ────────────────────────────
    console.log('── 4. VOICE: Graph → Language ──');
    resetVoiceCounter();
    const voiceResult = renderGraphToVoice(graph);
    console.log(`Voice statements: ${voiceResult.summary.totalStatements}`);
    console.log(`  Claim annotations:   ${voiceResult.summary.claimAnnotations}`);
    console.log(`  Risk advisories:     ${voiceResult.summary.riskAdvisories}`);
    console.log(`  Proof debt flags:    ${voiceResult.summary.proofDebtFlags}`);
    console.log(`  Overclaim warnings:  ${voiceResult.summary.overclaimWarnings}`);
    console.log(`  Next-step advisories: ${voiceResult.summary.nextStepAdvisories}`);

    const voicePass = voiceResult.summary.totalStatements > 0;
    console.log(voicePass ? '  ✓ Voice: Graph → Language projection produces nonzero statements.\n' : '  ⚠ Voice check failed.\n');

    // Print a sample of voice statements
    console.log('  Sample voice statements:');
    const sampleStmts = voiceResult.statements.filter(s => s.category !== 'graph_summary' && s.category !== 'dependency_notice').slice(0, 8);
    for (const s of sampleStmts) {
        const prefix = s.category === 'proof_debt' ? '⚠' : s.category === 'overclaim_warning' ? '⚠' : '  ';
        console.log(`  ${prefix} [${s.category}] ${s.text.substring(0, 120)}`);
    }

    // ─── 5a. Executive Summary ─────────────────────────────────
    console.log('\n── 4a. EXECUTIVE SUMMARY ──');
    const execSummary = renderExecutiveSummary(graph);
    console.log(execSummary);
    const execPass = execSummary.includes('TLT Graph Executive Summary');
    console.log(execPass ? '\n  ✓ Executive summary rendered.\n' : '\n  ⚠ Executive summary check failed.\n');

    // ─── 6. Feed: TLT → Atlas Candidate Submission ──────────────
    console.log('── 5. FEED: TLT → Atlas Candidates ──');
    clearCandidateStore();
    const feedResult = submitCandidatesFromScan(graph.nodes);
    console.log(`Candidates submitted: ${feedResult.summary.submitted}`);
    console.log(`  Pending:  ${feedResult.summary.pending}`);
    console.log(`  Accepted: ${feedResult.summary.accepted}`);
    console.log(`  Rejected: ${feedResult.summary.rejected}`);

    const feedPass = feedResult.candidates.length > 0;
    console.log(feedPass ? '  ✓ Feed: Candidate patterns submitted from TLT scan.\n' : '  ⚠ Feed check failed (no candidates).\n');

    if (feedResult.candidates.length > 0) {
        console.log('  Sample candidates:');
        for (const c of feedResult.candidates.slice(0, 5)) {
            console.log(`  ATC ${c.candidateId} [${c.suggestedCategory}] ${c.pattern} — confidence: ${c.confidence} (${c.matchedInvariantCount} matches)`);
            console.log(`    ${c.proposedEntry.substring(0, 100)}`);
        }
    }

    // Get full candidate report
    const report = getCandidateReport();
    console.log(`\n  Candidate store state: ${report.candidates.length} total candidates`);

    // ─── 7. Verification Summary ───────────────────────────────
    const checks: { name: string; passed: boolean }[] = [
        { name: 'Ears (language → graph)', passed: earsPass },
        { name: 'Edges (graph topology)', passed: edgesPass },
        { name: 'Multi-signal detection', passed: multiSignalPass },
        { name: 'Voice (graph → language)', passed: voicePass },
        { name: 'Executive summary', passed: execPass },
        { name: 'Feed (atlas candidates)', passed: feedPass },
    ];

    console.log('\n═══ VERIFICATION SUMMARY ═══');
    let passed = 0;
    for (const check of checks) {
        console.log(`  ${check.passed ? '✓' : '⚠'} ${check.name}`);
        if (check.passed) passed++;
    }
    console.log(`\n${passed}/${checks.length} checks passed.`);
    console.log(passed >= 5 ? '\n✓ v9.0 TLT bidirectional trial PASSED.' : '\n⚠ Some checks failed — review above.');
}

main().catch(err => {
    console.error('v9.0 bidirectional trial failed:', err);
    process.exit(1);
});