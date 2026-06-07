// CohBit-Copilot v9.2B — English Dictionary Corpus Ingestion
// Quick trial: runs the v9.2A summary pipeline against the
// English Dictionary Database corpus.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { transformToTltGraph, buildTltEdges } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import { generateAllSummaries, isSummarySafeForAudience, renderSummaryToText } from '../packages/tlt-atlas/src/T_summary_generator.js';
import { resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { resetViolationCounter } from '../packages/tlt-atlas/src/T_claim_guard.js';
import { resetLeakCounter } from '../packages/tlt-atlas/src/T_public_internal_boundary.js';

const DIR = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\English-Dictionary-Database-main';
const MAX_BYTES = 20_000_000;

function main() {
    console.log('=== CohBit-Copilot v9.2B — English Dictionary Trial ===\n');

    resetViolationCounter();
    resetLeakCounter();
    resetVoiceCounter();

    const artifacts: { path: string; language: string; text: string }[] = [];
    const skipped: string[] = [];

    for (const entry of fs.readdirSync(DIR)) {
        const fp = path.join(DIR, entry);
        const ext = path.extname(entry).toLowerCase();
        if (!['.csv', '.html', '.md', '.py', '.txt'].includes(ext)) {
            skipped.push(`${entry} (bad ext: ${ext})`);
            continue;
        }
        const stat = fs.statSync(fp);
        if (!stat.isFile()) continue;
        if (stat.size > MAX_BYTES) {
            skipped.push(`${entry} (too big: ${(stat.size / 1024 / 1024).toFixed(1)}MB)`);
            continue;
        }
        const text = fs.readFileSync(fp, 'utf-8');
        if (!text.trim()) {
            skipped.push(`${entry} (empty)`);
            continue;
        }
        artifacts.push({
            path: fp,
            language: ext === '.csv' ? 'csv' : ext === '.py' ? 'python' : ext === '.html' ? 'html' : 'markdown',
            text,
        });
    }

    console.log(`── INGESTION ──`);
    console.log(`  Files read: ${artifacts.length}`);
    console.log(`  Skipped: ${skipped.length}`);
    for (const s of skipped) console.log(`    skip: ${s}`);
    for (const a of artifacts) console.log(`    read: ${path.basename(a.path)} | ${(a.text.length / 1024).toFixed(1)}KB | ${a.language}`);

    if (artifacts.length === 0) {
        console.log('\n  No files ingested. Exiting.');
        process.exit(0);
    }

    console.log(`\n── GRAPH ──`);
    const result = transformToTltGraph(artifacts);
    const edges = buildTltEdges(result.nodes);
    result.edges.length = 0;
    for (const e of edges) result.edges.push(e);

    console.log(`  Nodes: ${result.summary.totalNodes} | Edges: ${result.edges.length} | Artifacts: ${result.artifactsProcessed}`);
    const nodeTypes: Record<string, number> = {};
    for (const n of result.nodes) {
        nodeTypes[n.nodeType] = (nodeTypes[n.nodeType] || 0) + 1;
    }
    console.log(`  Node types: ${JSON.stringify(nodeTypes)}`);

    console.log(`\n── SUMMARIES ──`);
    const summaries = generateAllSummaries(result);
    const modes = ['internal', 'public', 'technical', 'linkedin', 'reviewer'] as const;
    for (const m of modes) {
        const s = summaries[m];
        console.log(`  ${m}: sections=${s.sections.length} warnings=${s.totalWarnings} downgrades=${s.downgradeCount} limitations=${s.limitationCount} canonSafe=${s.canonSafe} audienceSafe=${isSummarySafeForAudience(s, m)}`);
    }

    // LinkedIn summary sample
    console.log(`\n── SAMPLE: LinkedIn (first 600 chars) ──`);
    console.log(renderSummaryToText(summaries.linkedin).substring(0, 600));
    console.log('...(truncated)');

    console.log(`\n── VERDICT ──`);
    const allSafe = modes.every(m => summaries[m].canonSafe);
    console.log(`  All canon-safe: ${allSafe ? 'yes' : 'NO'}`);
    console.log(allSafe ? '\n✓ Dictionary corpus passes canon safety.' : '\n⚠ Some modes failed canon safety.');
}

main();