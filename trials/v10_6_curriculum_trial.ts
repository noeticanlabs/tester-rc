// CohBit-Copilot v10.6 — Doctrine Curriculum Analytics
// Runs full pipeline (ingestion → graph → summaries → polarity)
// against the Noetican Doctrine Curriculum corpus.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { transformToTltGraph, buildTltEdges } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import { generateAllSummaries, renderSummaryToText } from '../packages/tlt-atlas/src/T_summary_generator.js';
import { resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { resetViolationCounter } from '../packages/tlt-atlas/src/T_claim_guard.js';
import { resetLeakCounter } from '../packages/tlt-atlas/src/T_public_internal_boundary.js';
import { classifyIngestion, formatLearningRecord } from '../packages/tlt-atlas/src/L16_learning_polarity.js';

const CURRICULUM_DIR = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\Doctrine curriuclum';

function main() {
    console.log('=== CohBit-Copilot v10.6 — Doctrine Curriculum Analytics ===\n');

    resetViolationCounter(); resetLeakCounter(); resetVoiceCounter();

    const artifacts: { path: string; language: string; text: string }[] = [];
    const skipped: string[] = [];

    for (const entry of fs.readdirSync(CURRICULUM_DIR)) {
        const fp = path.join(CURRICULUM_DIR, entry);
        const ext = path.extname(entry).toLowerCase();
        if (ext !== '.txt' && ext !== '.md') { skipped.push(`${entry} (bad ext)`); continue; }
        const stat = fs.statSync(fp);
        if (!stat.isFile()) continue;
        const text = fs.readFileSync(fp, 'utf-8');
        if (!text.trim()) { skipped.push(`${entry} (empty)`); continue; }
        artifacts.push({ path: fp, language: 'markdown', text });
    }

    console.log(`── INGESTION ──`);
    console.log(`  Files read: ${artifacts.length} | Skipped: ${skipped.length}`);
    for (const s of skipped) console.log(`    skip: ${s}`);
    for (const a of artifacts) console.log(`    read: ${path.basename(a.path)} | ${(a.text.length / 1024).toFixed(1)}KB`);

    console.log(`\n── GRAPH ──`);
    const result = transformToTltGraph(artifacts);
    const edges = buildTltEdges(result.nodes);
    result.edges.length = 0; for (const e of edges) result.edges.push(e);
    console.log(`  Nodes: ${result.summary.totalNodes} | Edges: ${result.edges.length} | Artifacts: ${result.artifactsProcessed}`);
    const nodeTypes: Record<string, number> = {};
    for (const n of result.nodes) nodeTypes[n.nodeType] = (nodeTypes[n.nodeType] || 0) + 1;
    console.log(`  Node types: ${JSON.stringify(nodeTypes)}`);

    console.log(`\n── SUMMARIES (all 5 modes) ──`);
    const summaries = generateAllSummaries(result);
    const modes = ['internal', 'public', 'technical', 'linkedin', 'reviewer'] as const;
    for (const m of modes) {
        const s = summaries[m];
        console.log(`  ${m}: sections=${s.sections.length} warnings=${s.totalWarnings} downgrades=${s.downgradeCount} limitations=${s.limitationCount} canonSafe=${s.canonSafe}`);
    }

    console.log(`\n── POLARITY ──`);
    const record = classifyIngestion(result, 'curriculum-v10.6',
        { linkedin: summaries.linkedin, public: summaries.public });
    console.log(formatLearningRecord(record));

    // Sample LinkedIn summary
    console.log(`\n── SAMPLE: LinkedIn Summary (first 500 chars) ──`);
    console.log(renderSummaryToText(summaries.linkedin).substring(0, 500));
    console.log('...(truncated)');

    console.log(`\n── VERDICT ──`);
    console.log(`  Polarity: ${record.polarity}${record.secondaryPolarity ? ' (secondary: ' + record.secondaryPolarity + ')' : ''}`);
    console.log(`  Confidence: ${record.confidence} (score: ${record.confidenceScore})`);
    console.log(record.allModesCanonSafe ? '\n✓ Curriculum passes canon safety.' : '\n⚠ Some modes failed canon safety.');
}

main();