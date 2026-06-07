// @cohbit/tooling — T19 Benchmark Runner
// Measures the performance of key tooling pipeline functions.
// All inputs are synthetic, in-memory. No filesystem mutation.

import { scanRepository } from './T3_scanner.js';
import { routeContent } from './T5_router.js';
import { scanRisks } from './T7_risk_scanner.js';
import { guardRetrieval, type RetrievalCandidate } from './T15_retrieval_guard.js';
import { generateAuditMarkdown } from './T17_audit.js';

// ─── Types ─────────────────────────────────────────────────────

export interface BenchmarkResult {
    benchmarkId: string;
    toolFamily: string;
    inputSize: number;
    elapsedMs: number;
    passed: boolean;
    metrics: Record<string, number | string>;
    warnings: string[];
}

export interface BenchmarkSuite {
    suiteId: string;
    ranAt: string;
    results: BenchmarkResult[];
    totalElapsedMs: number;
    summary: { passed: number; failed: number; slowest: string };
}

// ─── Synthetic inputs ──────────────────────────────────────────

const CODE_FILES_SYNTH = (n: number): string[] => Array.from({ length: n }, (_, i) => `src/module_${i}.ts`);
const MIXED_FILES_SYNTH = (n: number): string[] => {
    const types = ['src/code.ts', 'docs/readme.md', 'proof/lemma.lean', 'notes/math_theorem.txt', 'receipts/entry.json'];
    return Array.from({ length: n }, (_, i) => types[i % types.length]!);
};
const RISKY_CONTENT = 'The simulation proves the theorem conclusively. This guarantees correctness.';
const CLEAN_CONTENT = 'function add(a: number, b: number): number { return a + b; }';
const LARGE_CONTENT = 'x'.repeat(100000) + '\nif (x === null) return;\nThe simulation proves the theorem.\nsorry, pending proof.';

function syntheticCandidates(n: number): RetrievalCandidate[] {
    return Array.from({ length: n }, (_, i) => ({
        sourceId: `BENCH_${String(i).padStart(4, '0')}`,
        invariants: ['INV_006', 'INV_009'],
        evidenceLevel: i % 5 === 0 ? 'proof_assistant_checked' : i % 3 === 0 ? 'unit_tested' : 'simulation_supported',
        claimStatus: i % 7 === 0 ? 'stale' : 'receipted',
        domain: 'code' as const,
        hasReceipt: i % 7 !== 0,
        isStale: i % 7 === 0,
        content: i % 2 === 0 ? CLEAN_CONTENT : RISKY_CONTENT,
    }));
}

// ─── Timing utility ────────────────────────────────────────────

function timeIt(fn: () => void): number {
    const start = performance.now();
    fn();
    return Math.round(performance.now() - start);
}

function runTrials(fn: () => void, trials = 3): { min: number; max: number; median: number } {
    const times: number[] = [];
    for (let i = 0; i < trials; i++) {
        times.push(timeIt(fn));
    }
    times.sort((a, b) => a - b);
    return {
        min: times[0]!,
        max: times[times.length - 1]!,
        median: times[Math.floor(trials / 2)]!,
    };
}

// ─── Benchmarks ────────────────────────────────────────────────

let benchIdCounter = 0;
function nextBenchId(): string { benchIdCounter += 1; return `BENCH_${String(benchIdCounter).padStart(4, '0')}`; }

export function benchmarkScanner(sizes: number[] = [10, 100, 1000]): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];
    for (const size of sizes) {
        const files = MIXED_FILES_SYNTH(size);
        const trials = runTrials(() => { scanRepository(files); });
        const result = scanRepository(files);
        results.push({
            benchmarkId: nextBenchId(), toolFamily: 'T3-Scanner', inputSize: size,
            elapsedMs: trials.median, passed: result.status === 'scan_complete' && result.filesScanned === size,
            metrics: {
                filesScanned: result.filesScanned, codeFiles: result.detectedArtifacts.codeFiles,
                mathDocs: result.detectedArtifacts.mathDocs, proofFiles: result.detectedArtifacts.proofFiles,
                minMs: trials.min, maxMs: trials.max,
            },
            warnings: result.warnings,
        });
    }
    return results;
}

export function benchmarkRouter(counts: number[] = [10, 50, 200]): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];
    const basePaths = CODE_FILES_SYNTH(5);
    for (const count of counts) {
        const paths = [...basePaths, ...Array.from({ length: count }, (_, i) => `src/file_${i}.ts`)];
        const trials = runTrials(() => { for (const p of paths) routeContent(p); });
        const confidences: Record<string, number> = {};
        for (const p of paths) { const r = routeContent(p); confidences[r.confidence] = (confidences[r.confidence] ?? 0) + 1; }
        results.push({
            benchmarkId: nextBenchId(), toolFamily: 'T5-Router', inputSize: paths.length,
            elapsedMs: trials.median, passed: true,
            metrics: { ...confidences, minMs: trials.min, maxMs: trials.max },
            warnings: [],
        });
    }
    return results;
}

export function benchmarkRiskScanner(texts: string[] = [CLEAN_CONTENT, RISKY_CONTENT, LARGE_CONTENT]): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];
    for (const text of texts) {
        const trials = runTrials(() => { scanRisks(text); });
        const result = scanRisks(text);
        results.push({
            benchmarkId: nextBenchId(), toolFamily: 'T7-RiskScanner', inputSize: text.length,
            elapsedMs: trials.median, passed: true,
            metrics: { risksFound: result.length, highRisks: result.filter(r => r.severity === 'high').length, minMs: trials.min, maxMs: trials.max },
            warnings: [],
        });
    }
    return results;
}

export function benchmarkRetrievalGuard(batchSizes: number[] = [5, 20, 100]): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];
    for (const size of batchSizes) {
        const candidates = syntheticCandidates(size);
        const trials = runTrials(() => { guardRetrieval(candidates); });
        const result = guardRetrieval(candidates);
        results.push({
            benchmarkId: nextBenchId(), toolFamily: 'T15-RetrievalGuard', inputSize: size,
            elapsedMs: trials.median, passed: true,
            metrics: { accepted: result.accepted.length, rejected: result.rejected.length, warnings: result.warnings.length, minMs: trials.min, maxMs: trials.max },
            warnings: result.warnings,
        });
    }
    return results;
}

export function benchmarkAuditReport(entryCounts: number[] = [0, 10, 100]): BenchmarkResult[] {
    const results: BenchmarkResult[] = [];
    for (const count of entryCounts) {
        const entries = Array.from({ length: count }, (_, i) => `receipt_${i}`);
        const trials = runTrials(() => { generateAuditMarkdown(count, entries.slice(0, 5)); });
        const md = generateAuditMarkdown(count, entries.slice(0, 5));
        results.push({
            benchmarkId: nextBenchId(), toolFamily: 'T17-Audit', inputSize: count,
            elapsedMs: trials.median, passed: md.includes('# CohBit-Copilot Audit Report'),
            metrics: { reportLength: md.length, minMs: trials.min, maxMs: trials.max },
            warnings: [],
        });
    }
    return results;
}

// ─── Suite ─────────────────────────────────────────────────────

export function runBenchmarkSuite(): BenchmarkSuite {
    const results: BenchmarkResult[] = [
        ...benchmarkScanner(),
        ...benchmarkRouter(),
        ...benchmarkRiskScanner(),
        ...benchmarkRetrievalGuard(),
        ...benchmarkAuditReport(),
    ];
    const passed = results.filter(r => r.passed).length;
    const failed = results.length - passed;
    const slowest = results.reduce((a, b) => a.elapsedMs > b.elapsedMs ? a : b);
    return {
        suiteId: `SUITE_${Date.now().toString(36)}`,
        ranAt: new Date().toISOString(),
        results,
        totalElapsedMs: results.reduce((sum, r) => sum + r.elapsedMs, 0),
        summary: { passed, failed, slowest: `${slowest.toolFamily}/${slowest.benchmarkId} (${slowest.elapsedMs}ms)` },
    };
}

export function generateBenchmarkMarkdown(suite: BenchmarkSuite): string {
    const lines = [
        `# Tooling Benchmark Suite`,
        `**Ran:** ${suite.ranAt}`,
        `**Total:** ${suite.totalElapsedMs}ms | **Passed:** ${suite.summary.passed} | **Failed:** ${suite.summary.failed}`,
        `**Slowest:** ${suite.summary.slowest}`,
        '',
        '| Tool | Input Size | Elapsed (ms) | Passed | Key Metrics |',
        '|------|-----------|-------------|--------|-------------|',
    ];
    for (const r of suite.results) {
        const metrics = Object.entries(r.metrics).filter(([k]) => !k.endsWith('Ms')).map(([k, v]) => `${k}=${v}`).join(', ');
        lines.push(`| ${r.toolFamily} | ${r.inputSize} | ${r.elapsedMs} | ${r.passed ? '✅' : '❌'} | ${metrics} |`);
    }
    lines.push('', '---', '*Report generated by @cohbit/tooling T19 Benchmark Runner.*');
    return lines.join('\n');
}

export function generateBenchmarkJson(suite: BenchmarkSuite): string {
    return JSON.stringify(suite, null, 2);
}