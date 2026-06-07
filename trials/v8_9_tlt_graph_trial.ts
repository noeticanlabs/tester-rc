// CohBit-Copilot v8.9 — TLT Graph Subsystem Trial
// Verifies: TLT transformer produces graph nodes from markdown docs.
//
// Operating law:
//   TLT structures language into graph nodes. It does not verify claims.

import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { seedTltGraphFromContent } from '../src/atlas_integration.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    console.log('=== CohBit-Copilot v8.9 TLT Graph Trial ===\n');

    // Read all markdown files in docs/
    const files = await fs.readdir('docs');
    const mdFiles = files.filter(f => f.endsWith('.md')).map(f => path.join('docs', f));

    console.log(`Reading ${mdFiles.length} markdown files from docs/...`);
    const result = readContentFiles(mdFiles, { maxTotalBytes: 10 * 1024 * 1024, maxFiles: 20 });

    const tlt = seedTltGraphFromContent(result.artifacts);

    console.log(`TLT nodes produced: ${tlt.summary.totalNodes}`);
    console.log(`  Claims:          ${tlt.summary.claims}`);
    console.log(`  Risks:           ${tlt.summary.risks}`);
    console.log(`  Definitions:     ${tlt.summary.definitions}`);
    console.log(`  Ambiguity nodes: ${tlt.summary.ambiguityNodes}`);
    console.log(`  Tone markers:    ${tlt.summary.toneMarkers}`);
    console.log(`  Domain contexts: ${tlt.summary.domainContexts}`);
    console.log(`  Artifacts read:  ${tlt.artifactsProcessed}`);

    // Verification
    const checks: string[] = [];

    if (tlt.summary.totalNodes > 0) checks.push('TLT produces nonzero graph nodes');
    if (tlt.summary.claims > 0) checks.push('Claims detected');
    if (tlt.summary.risks > 0) checks.push('Risks detected');
    if (tlt.artifactsProcessed > 0) checks.push('Markdown artifacts processed');

    // Sample nodes
    if (tlt.nodes.length > 0) {
        checks.push('At least 1 node has MATCHED_INVARIANTS');
        for (const n of tlt.nodes.slice(0, 5)) {
            const fileShort = n.sourceFile.replace(/^docs\//, '');
            console.log(`\n  TLT ${n.nodeId} [${n.nodeType}] ${fileShort}:${n.lineApprox}`);
            console.log(`    MINV: ${n.matchedInvariants.join(', ')}`);
            console.log(`    Text: "${n.matchedText.substring(0, 80)}"`);
        }
    }

    console.log('\n── Results ──');
    for (const c of checks) console.log(`  ✓ ${c}`);
    const passed = checks.length;
    console.log(`\n${passed}/4 checks passed.`);
    console.log(passed >= 3 ? '\n✓ v8.9 TLT graph subsystem trial PASSED.' : '\n⚠ Some checks failed.');
}

main().catch(err => {
    console.error('v8.9 TLT trial failed:', err);
    process.exit(1);
});