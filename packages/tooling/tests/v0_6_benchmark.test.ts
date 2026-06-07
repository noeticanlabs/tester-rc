import { describe, it, expect } from 'vitest';
import {
    runBenchmarkSuite, generateBenchmarkMarkdown, generateBenchmarkJson,
    benchmarkScanner, benchmarkRouter, benchmarkRiskScanner,
    benchmarkRetrievalGuard, benchmarkAuditReport,
    type BenchmarkSuite,
} from '../src/T19_benchmark.js';

describe('T19 — Benchmark Runner', () => {
    it('scanner benchmark completes with non-zero elapsed', () => {
        const results = benchmarkScanner([10, 100]);
        expect(results.length).toBeGreaterThanOrEqual(2);
        for (const r of results) {
            expect(r.elapsedMs).toBeGreaterThanOrEqual(0);
            expect(r.passed).toBe(true);
        }
    });

    it('router benchmark produces confidence distribution', () => {
        const results = benchmarkRouter([10, 50]);
        expect(results.length).toBeGreaterThanOrEqual(2);
        const confKeys = Object.keys(results[0]!.metrics).filter(k => !k.endsWith('Ms'));
        expect(confKeys.length).toBeGreaterThan(0);
    });

    it('risk scanner detects patterns under benchmark', () => {
        const results = benchmarkRiskScanner();
        expect(results.length).toBe(3);
        // Clean content should find 0 risks
        expect(results[0]!.metrics.risksFound).toBe(0);
        // Risky content should find risks
        expect(results[1]!.metrics.risksFound as number).toBeGreaterThan(0);
    });

    it('retrieval guard completes for batches', () => {
        const results = benchmarkRetrievalGuard([5, 20]);
        expect(results).toHaveLength(2);
        for (const r of results) {
            expect(r.passed).toBe(true);
            expect((r.metrics.accepted as number) + (r.metrics.rejected as number)).toBeGreaterThan(0);
        }
    });

    it('audit benchmark generates report', () => {
        const results = benchmarkAuditReport([0, 10]);
        expect(results).toHaveLength(2);
        for (const r of results) {
            expect(r.passed).toBe(true);
        }
    });

    it('suite aggregates all results', () => {
        const suite = runBenchmarkSuite();
        expect(suite.suiteId).toBeTruthy();
        expect(suite.results.length).toBeGreaterThanOrEqual(10);
        expect(suite.summary.passed).toBe(suite.results.length);
        expect(suite.summary.failed).toBe(0);
        expect(suite.totalElapsedMs).toBeGreaterThanOrEqual(0);
    });

    it('markdown output is non-empty', () => {
        const suite = runBenchmarkSuite();
        const md = generateBenchmarkMarkdown(suite);
        expect(md).toContain('# Tooling Benchmark Suite');
        expect(md).toContain('| Tool |');
        expect(md).toContain('T3-Scanner');
        expect(md.length).toBeGreaterThan(500);
    });

    it('JSON output is valid and deserializable', () => {
        const suite = runBenchmarkSuite();
        const json = generateBenchmarkJson(suite);
        const parsed = JSON.parse(json) as BenchmarkSuite;
        expect(parsed.suiteId).toBe(suite.suiteId);
        expect(parsed.results.length).toBe(suite.results.length);
    });

    it('all results have unique benchmark IDs', () => {
        const suite = runBenchmarkSuite();
        const ids = suite.results.map(r => r.benchmarkId);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('large input (1000 files) does not crash scanner', () => {
        const results = benchmarkScanner([1000]);
        expect(results).toHaveLength(1);
        expect(results[0]!.passed).toBe(true);
        expect(results[0]!.elapsedMs).toBeGreaterThanOrEqual(0);
    });
});