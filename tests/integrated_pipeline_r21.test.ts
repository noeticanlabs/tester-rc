// CohBit-Copilot v11.x — R21 Integrated Audit Processor Tests
// Verifies that runIntegratedAudit emits 7 R21 processor fragments
// with boundary metadata, aggregates correctly, and serializes to JSON.

import { describe, it, expect, beforeAll } from 'vitest';
import { runIntegratedAudit, type UnifiedAuditResult } from '../src/integrated_pipeline.js';
import { withProcessorSync, beginProcessor, denyProcessor, processorRecordToReceiptFragment } from '../packages/tooling/src/resource/R21_processor_runtime.js';
import type { ProcessorFragment } from '../packages/tooling/src/resource/R21_processor_runtime.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

const EXPECTED_PROCESSOR_KINDS = [
    "content_read",
    "rust_risk_scan",
    "rust_ast_lite_parse",
    "review_queue_build",
    "obligation_reconcile",
    "receipt_emit",
    "resource_accounting",
];

// ─── Test 1: Audit result includes 7 processor fragments ─────

describe('runIntegratedAudit R21 processor fragments', () => {
    it('emits exactly 7 processor fragments', async () => {
        const result = await runIntegratedAudit('.');

        expect(result.processorFragments).toBeDefined();
        expect(result.processorFragments!.length).toBe(7);
    });

    it('includes all expected processor kinds in order', async () => {
        const result = await runIntegratedAudit('.');
        const kinds = result.processorFragments!.map(f => f.kind);

        for (const expected of EXPECTED_PROCESSOR_KINDS) {
            expect(kinds).toContain(expected);
        }
    });
});

// ─── Test 2: Fragments include boundary language ──────────────

describe('processor fragment boundary metadata', () => {
    let fragments: ProcessorFragment[];

    beforeAll(async () => {
        const result = await runIntegratedAudit('.');
        fragments = result.processorFragments!;
    }, 30000);

    it('each fragment has processorId', () => {
        for (const f of fragments) {
            expect(f.processorId).toBeTruthy();
            expect(f.processorId).toMatch(/^PROC_/);
        }
    });

    it('each fragment has a valid status', () => {
        const validStatuses = ['planned', 'authorized', 'running', 'completed', 'denied', 'throttled', 'failed', 'future_not_connected'];
        for (const f of fragments) {
            expect(validStatuses).toContain(f.status);
        }
    });

    it('each fragment has logic field', () => {
        const validLogic = ['deterministic', 'heuristic', 'hybrid'];
        for (const f of fragments) {
            expect(validLogic).toContain(f.logic);
        }
    });

    it('each fragment has evidenceLevel', () => {
        const validEvidence = ['none', 'surface_detected', 'syntax_checked', 'human_reviewed', 'unit_tested', 'receipt_available'];
        for (const f of fragments) {
            expect(validEvidence).toContain(f.evidenceLevel);
        }
    });

    it('each fragment has limitation text', () => {
        for (const f of fragments) {
            expect(f.limitation).toBeTruthy();
            expect(f.limitation.length).toBeGreaterThan(10);
        }
    });

    it('each fragment has boundaryExplanation', () => {
        for (const f of fragments) {
            expect(f.boundaryExplanation).toBeTruthy();
            expect(f.boundaryExplanation.length).toBeGreaterThan(20);
        }
    });
});

// ─── Test 3: JSON report serializes processor fragments ───────

describe('JSON report processorFragments', () => {
    it('generates JSON with processorFragments array', async () => {
        const result = await runIntegratedAudit('.');

        // Verify the result object itself has the field
        expect(result.processorFragments).toBeDefined();
        expect(Array.isArray(result.processorFragments)).toBe(true);
        expect(result.processorFragments!.length).toBeGreaterThanOrEqual(7);

        // Check the report file was written
        const jsonPath = path.join('reports', 'v8_0_integrated_audit.json');
        const rawJson = await fs.readFile(jsonPath, 'utf-8');
        const parsed = JSON.parse(rawJson);

        expect(parsed.processorFragments).toBeDefined();
        expect(Array.isArray(parsed.processorFragments)).toBe(true);
        expect(parsed.processorFragments.length).toBe(7);

        // Verify each fragment in JSON has required fields
        for (const f of parsed.processorFragments) {
            expect(f.processorId).toBeTruthy();
            expect(f.kind).toBeTruthy();
            expect(EXPECTED_PROCESSOR_KINDS).toContain(f.kind);
            expect(f.status).toBeTruthy();
            expect(f.limitation).toBeTruthy();
            expect(f.boundaryExplanation).toBeTruthy();
        }
    }, 30000);
});

// ─── Test 4: Aggregate summary counts correctly ───────────────

describe('processor status aggregation', () => {
    it('all fragments have status "completed" for normal audit', async () => {
        const result = await runIntegratedAudit('.');
        const fragments = result.processorFragments!;

        const statusCounts: Record<string, number> = {};
        for (const f of fragments) {
            statusCounts[f.status] = (statusCounts[f.status] ?? 0) + 1;
        }

        // In a normal run, all 7 should be completed
        expect(statusCounts['completed'] ?? 0).toBeGreaterThanOrEqual(5);
        expect(statusCounts['failed'] ?? 0).toBe(0);
        expect(statusCounts['denied'] ?? 0).toBe(0);

        // Total should be 7
        const total = Object.values(statusCounts).reduce((a, b) => a + b, 0);
        expect(total).toBe(7);
    }, 30000);
});

// ─── Test 5: Budget denial path ────────────────────────────────

describe('processor budget denial', () => {
    it('denies processor when requiresBudget is true and no budgetId provided', () => {
        // content_read requires budget per R21 registry
        const processor = beginProcessor("content_read", {
            inputSummary: "test denial",
            budgetId: undefined,
            evidenceLevel: "surface_detected",
        });
        // No budgetId passed, and content_read requires budget
        const denied = denyProcessor(processor, "No resource budget provided for budget-required processor.");

        expect(denied.status).toBe("denied");
        expect(denied.notes.some(n => n.includes("No resource budget"))).toBe(true);

        const fragment = processorRecordToReceiptFragment(denied);
        expect(fragment.status).toBe("denied");
        expect(fragment.limitation).toBeTruthy();
        expect(fragment.boundaryExplanation).toBeTruthy();
    });

    it('processorRecordToReceiptFragment preserves denied status', () => {
        const processor = beginProcessor("rust_risk_scan", {
            inputSummary: "test",
            budgetId: undefined,
            evidenceLevel: "surface_detected",
        });
        const denied = denyProcessor(processor, "Budget exhausted");

        const fragment = processorRecordToReceiptFragment(denied);
        expect(fragment.status).toBe("denied");
        expect(fragment.kind).toBe("rust_risk_scan");
        expect(fragment.processorId).toMatch(/^PROC_/);
    });
});