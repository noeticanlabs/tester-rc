// CohBit-Copilot v10.3 — Bidirectional Learning Polarity Trial
// Verifies L16 polarity classification on three corpus types:
//   TAP (negative + positive secondary)
//   Dictionary (positive)
//   Adversarial Markdown (negative)
//
// Success criteria:
//   1. TAP corpus classified as negative with positive secondary signals
//   2. Dictionary corpus classified as positive with zero false positives
//   3. Adversarial markdown classified as negative
//   4. Confidence scores computed across all three
//   5. Positive signals cross-checked by negative track

import * as fs from 'node:fs';
import * as path from 'node:path';
import { transformToTltGraph, buildTltEdges } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import { generateAllSummaries } from '../packages/tlt-atlas/src/T_summary_generator.js';
import { resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { resetViolationCounter } from '../packages/tlt-atlas/src/T_claim_guard.js';
import { resetLeakCounter } from '../packages/tlt-atlas/src/T_public_internal_boundary.js';
import { classifyIngestion, formatLearningRecord } from '../packages/tlt-atlas/src/L16_learning_polarity.js';

const TAP_DIR = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\TAP';
const DICT_DIR = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\English-Dictionary-Database-main';

function readArtifacts(dir: string, maxBytes: number = 20_000_000): { path: string; language: string; text: string }[] {
    const artifacts: { path: string; language: string; text: string }[] = [];
    for (const entry of fs.readdirSync(dir)) {
        const fp = path.join(dir, entry);
        const ext = path.extname(entry).toLowerCase();
        if (!['.txt', '.json', '.csv', '.html', '.md', '.py', '.txt'].includes(ext)) continue;
        if (entry.includes('.jsonl') || entry.includes('training')) continue;
        const stat = fs.statSync(fp);
        if (!stat.isFile() || stat.size > maxBytes) continue;
        const text = fs.readFileSync(fp, 'utf-8');
        if (!text.trim()) continue;
        artifacts.push({ path: fp, language: ext === '.json' ? 'json' : ext === '.csv' ? 'csv' : ext === '.html' ? 'html' : 'markdown', text });
    }
    return artifacts;
}

async function main() {
    console.log('=== CohBit-Copilot v10.3 — Bidirectional Learning Polarity Trial ===\n');

    const checks: { label: string; passed: boolean }[] = [];

    // ─── TAP Corpus ──────────────────────────────────────────────
    console.log('── 1. TAP CORPUS ──\n');
    resetViolationCounter(); resetLeakCounter(); resetVoiceCounter();
    const tapArtifacts = readArtifacts(TAP_DIR);
    const tapResult = transformToTltGraph(tapArtifacts);
    const tapEdges = buildTltEdges(tapResult.nodes);
    tapResult.edges.length = 0; for (const e of tapEdges) tapResult.edges.push(e);
    const tapSummaries = generateAllSummaries(tapResult);

    const tapRecord = classifyIngestion(tapResult, 'tap-corpus-v9.2b', { linkedin: tapSummaries.linkedin, public: tapSummaries.public });
    console.log(formatLearningRecord(tapRecord));

    const c1a = tapRecord.primaryPolarity === 'negative';
    const c1b = tapRecord.secondaryPolarity === 'positive';
    const c1c = tapRecord.negativeSignals.length > 0;
    console.log(c1a ? '  ✓' : '  ⚠', `TAP primary polarity: ${tapRecord.primaryPolarity}`);
    console.log(c1b ? '  ✓' : '  ⚠', `TAP secondary polarity: ${tapRecord.secondaryPolarity ?? 'none'} (expected: positive)`);
    console.log(c1c ? '  ✓' : '  ⚠', `TAP negative signals: ${tapRecord.negativeSignals.length} (>0 expected)`);
    checks.push({ label: 'TAP: negative primary, positive secondary', passed: c1a && c1b && c1c });

    // ─── Dictionary Corpus ───────────────────────────────────────
    console.log('\n── 2. DICTIONARY CORPUS ──\n');
    resetViolationCounter(); resetLeakCounter(); resetVoiceCounter();
    const dictArtifacts = readArtifacts(DICT_DIR);
    const dictResult = transformToTltGraph(dictArtifacts);
    const dictEdges = buildTltEdges(dictResult.nodes);
    dictResult.edges.length = 0; for (const e of dictEdges) dictResult.edges.push(e);
    const dictSummaries = generateAllSummaries(dictResult);

    const dictRecord = classifyIngestion(dictResult, 'dict-corpus-v9.2b', { linkedin: dictSummaries.linkedin, public: dictSummaries.public });
    console.log(formatLearningRecord(dictRecord));

    const c2a = dictRecord.primaryPolarity === 'positive';
    const c2b = dictRecord.zeroFalsePositives;
    const c2c = dictRecord.negativeSignals.length === 0;
    console.log(c2a ? '  ✓' : '  ⚠', `Dictionary polarity: ${dictRecord.primaryPolarity}`);
    console.log(c2b ? '  ✓' : '  ⚠', `Dictionary zero false positives: ${dictRecord.zeroFalsePositives}`);
    console.log(c2c ? '  ✓' : '  ⚠', `Dictionary negative signals: ${dictRecord.negativeSignals.length} (0 expected)`);
    checks.push({ label: 'Dictionary: positive, zero false positives', passed: c2a && c2b && c2c });

    // ─── Adversarial Markdown ────────────────────────────────────
    console.log('\n── 3. ADVERSARIAL MARKDOWN ──\n');
    resetViolationCounter(); resetLeakCounter(); resetVoiceCounter();
    const advText = `# Overconfident Claims

The theorem is verified and ready for public release.
This system is proven safe for production deployment.
We have completed the formal verification of all components.
The CohBit primitive guarantees admissibility under all conditions.

## Mixed Evidence

This approach appears to be consistent with existing results.
Further testing is recommended before deployment.
A formal proof is planned but not yet completed.`;

    const advArtifacts = [{ path: 'test.md', language: 'markdown', text: advText }];
    const advResult = transformToTltGraph(advArtifacts);
    const advEdges = buildTltEdges(advResult.nodes);
    advResult.edges.length = 0; for (const e of advEdges) advResult.edges.push(e);
    const advSummaries = generateAllSummaries(advResult);

    const advRecord = classifyIngestion(advResult, 'adversarial-markdown-v10.3', { linkedin: advSummaries.linkedin, public: advSummaries.public });
    console.log(formatLearningRecord(advRecord));

    const c3a = advRecord.primaryPolarity === 'negative';
    const c3b = advRecord.negativeSignals.includes('claim_strength_mismatch');
    const c3c = advRecord.confidence === 'low';
    console.log(c3a ? '  ✓' : '  ⚠', `Adversarial polarity: ${advRecord.primaryPolarity}`);
    console.log(c3b ? '  ✓' : '  ⚠', `Adversarial has claim_strength_mismatch: ${advRecord.negativeSignals.includes('claim_strength_mismatch')}`);
    console.log(c3c ? '  ✓' : '  ⚠', `Adversarial confidence: ${advRecord.confidence}`);
    checks.push({ label: 'Adversarial: negative, claim_strength_mismatch, low confidence', passed: c3a && c3b && c3c });

    // ─── Cross-check verification ───────────────────────────────
    console.log('\n── 4. CROSS-CHECK VERIFICATION ──');
    const c4 = dictRecord.crossCheckedByNegativeTrack && tapRecord.crossCheckedByNegativeTrack && advRecord.crossCheckedByNegativeTrack;
    console.log(c4 ? '  ✓' : '  ⚠', `All records cross-checked by negative track`);
    checks.push({ label: 'All records cross-checked by negative track', passed: c4 });

    const c5 = dictRecord.admittedToPositiveTrack && tapRecord.admittedToPositiveTrack;
    console.log(c5 ? '  ✓' : '  ⚠', `Dictionary and TAP each have admitted positive signals`);
    checks.push({ label: 'Dictionary and TAP have admitted positive signals', passed: c5 });

    // ─── Summary ─────────────────────────────────────────────────
    const passed = checks.filter(c => c.passed).length;
    console.log(`\n═══ VERIFICATION SUMMARY ═══\n${passed}/${checks.length} checks passed.`);
    console.log(passed === checks.length
        ? '\n✓ v10.3 BIDIRECTIONAL LEARNING POLARITY TRIAL PASSED.'
        : '\n⚠ Some checks failed.');

    if (passed !== checks.length) process.exit(1);
}

main().catch(err => { console.error('v10.3 trial failed:', err); process.exit(1); });