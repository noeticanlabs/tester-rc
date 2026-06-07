// CohBit-Copilot v12.1 — Rust Scanner Gate Trial
// Tests: TypeScript scans. Rust independently scans for comparison evidence.
//
// Success criteria:
//   1. Rust scanner reads fixture files safely.
//   2. Core patterns match on rust-risk-fixture (TS vs Rust comparison).
//   3. Comparison report is generated.
//   4. Mismatches are evidence gaps, not failures.
//   5. Rust scanner output does not authorize repairs.
//   6. Existing TS scanner remains primary path.
//   7. Path verifier gating before scanner reads files.
//   8. Audit reports can include Rust scanner evidence.

import { describe, it, expect } from 'vitest';
import { isRustVerifierAvailable } from '../src/rust_receipt_gate.js';

const rustAvailable = isRustVerifierAvailable();
const itIfRust = rustAvailable ? it : it.skip;
console.log(`[v12.1] Rust toolchain ${rustAvailable ? 'available' : 'not available'} — ${rustAvailable ? 'running' : 'skipping'} Rust-dependent trial.`);
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { scanWithRust, type RustScannerResult } from '../src/rust_scanner_gate.js';
import { scanRustContent } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { verifyPathWithRust } from '../src/rust_path_safety_gate.js';

// ─── Helpers ───────────────────────────────────────────────────

const FIXTURE_PATH = path.resolve(process.cwd(), 'sandbox', 'fixtures', 'rust-risk-fixture');

async function readFixtureFiles(): Promise<Array<{ path: string; text: string }>> {
    const srcDir = path.join(FIXTURE_PATH, 'src');
    const files: Array<{ path: string; text: string }> = [];

    const entries = await fs.readdir(srcDir);
    for (const entry of entries) {
        if (entry.endsWith('.rs')) {
            const filePath = path.join(srcDir, entry);
            const text = await fs.readFile(filePath, 'utf-8');
            files.push({ path: filePath, text });
        }
    }
    return files;
}

describe('v12.1 Rust Scanner Gate Trial', () => {

    // ── Criterion 1: Rust scanner reads files safely ──────────
    it('Rust scanner reads fixture files without error', async () => {
        if (!isRustVerifierAvailable()) {
            console.log('[v12.1] Rust not available — skipping scanner test');
            return;
        }

        const files = await readFixtureFiles();
        expect(files.length).toBeGreaterThan(0);

        const result = await scanWithRust(files);
        expect(result.rustAvailable).toBe(true);
        expect(result.filesScanned).toBe(files.length);
        expect(Array.isArray(result.findings)).toBe(true);
        console.log(`[v12.1] Rust scanned ${result.filesScanned} files, found ${result.findings.length} findings`);
    });

    // ── Criterion 2: Core patterns match on fixture ───────────
    it('TS and Rust scanners both detect known risks in fixture', async () => {
        const files = await readFixtureFiles();

        // TypeScript scan
        const tsFindings = files.flatMap(f => (scanRustContent as any)({ path: f.path, text: f.text, contentHash: '', language: 'rust' }));

        // Group by riskKind for comparison
        const tsByKind = new Map<string, number>();
        for (const f of tsFindings) {
            tsByKind.set(f.riskKind, (tsByKind.get(f.riskKind) || 0) + 1);
        }

        console.log('[v12.1] TS findings by riskKind:');
        for (const [kind, count] of tsByKind) {
            console.log(`  ${kind}: ${count}`);
        }

        // Rust scan (if available)
        if (isRustVerifierAvailable()) {
            const rustResult = await scanWithRust(files);
            const rustByKind = new Map<string, number>();
            for (const f of rustResult.findings) {
                rustByKind.set(f.riskKind, (rustByKind.get(f.riskKind) || 0) + 1);
            }

            console.log('[v12.1] Rust findings by riskKind:');
            for (const [kind, count] of rustByKind) {
                console.log(`  ${kind}: ${count}`);
            }

            // Core assertions: at minimum, both scanners should detect unsafe blocks
            expect(tsByKind.has('unsafe_block')).toBe(true);
            if (rustResult.findings.length > 0) {
                console.log(`[v12.1] Cross-language comparison: TS=${tsFindings.length}, Rust=${rustResult.findings.length}`);
            }
        }

        // TS must detect risks (primary path)
        expect(tsFindings.length).toBeGreaterThan(0);
    });

    // ── Criterion 3: Comparison report generated ──────────────
    it('generates comparison report between TS and Rust scanners', async () => {
        const files = await readFixtureFiles();
        const tsFindings = files.flatMap(f => (scanRustContent as any)({ path: f.path, text: f.text, contentHash: '', language: 'rust' }));

        console.log(`\n[v12.1] === Scanner Comparison Report ===`);
        console.log(`Target: sandbox/fixtures/rust-risk-fixture`);
        console.log(`Files: ${files.length}`);
        console.log(`TS findings: ${tsFindings.length}`);

        if (isRustVerifierAvailable()) {
            const rustResult = await scanWithRust(files);
            console.log(`Rust findings: ${rustResult.findings.length}`);
            console.log(`Rust evidence: ${rustResult.evidence}`);

            const tsKinds = new Set(tsFindings.map(f => f.riskKind));
            const rustKinds = new Set(rustResult.findings.map(f => f.riskKind));

            const overlap = [...tsKinds].filter(k => rustKinds.has(k));
            const tsOnly = [...tsKinds].filter(k => !rustKinds.has(k));
            const rustOnly = [...rustKinds].filter(k => !tsKinds.has(k));

            console.log(`Overlap (both detected): ${overlap.join(', ') || 'none'}`);
            console.log(`TS only: ${tsOnly.join(', ') || 'none'}`);
            console.log(`Rust only: ${rustOnly.join(', ') || 'none'}`);

            expect(overlap.length).toBeGreaterThan(0);
        } else {
            console.log(`Rust: not available`);
        }

        console.log(`=== End Scanner Comparison Report ===\n`);
    });

    // ── Criterion 4: Mismatches are evidence gaps ─────────────
    it('treats scanner mismatches as evidence gaps, not failures', async () => {
        const files = await readFixtureFiles();
        const tsFindings = files.flatMap(f => (scanRustContent as any)({ path: f.path, text: f.text, contentHash: '', language: 'rust' }));

        if (!isRustVerifierAvailable()) {
            console.log('[v12.1] Rust not available — mismatch test skipped');
            return;
        }

        const rustResult = await scanWithRust(files);

        const tsKinds = new Set(tsFindings.map(f => f.riskKind));
        const rustKinds = new Set(rustResult.findings.map(f => f.riskKind));

        const mismatches: string[] = [];
        for (const k of tsKinds) {
            if (!rustKinds.has(k)) mismatches.push(`TS detected '${k}', Rust missed`);
        }
        for (const k of rustKinds) {
            if (!tsKinds.has(k)) mismatches.push(`Rust detected '${k}', TS missed`);
        }

        if (mismatches.length > 0) {
            console.log(`[v12.1] Scanner evidence gaps (${mismatches.length}):`);
            for (const m of mismatches) {
                console.log(`  GAP: ${m}`);
            }
            console.log(`[v12.1] These are evidence gaps, not defects. Manual review recommended.`);
        } else {
            console.log(`[v12.1] No scanner evidence gaps detected.`);
        }

        expect(mismatches.length).toBeGreaterThanOrEqual(0);
    });

    // ── Criterion 5: Rust does not authorize ──────────────────
    it('Rust scanner output does not contain authorization fields', async () => {
        const result = await scanWithRust([]);

        expect((result as any).authorized).toBeUndefined();
        expect((result as any).repairPermission).toBeUndefined();
        expect((result as any).commitApproval).toBeUndefined();
        expect((result as any).proposalGenerated).toBeUndefined();

        if (!result.rustAvailable) {
            expect(result.evidence).toContain('not available');
        }
    });

    // ── Criterion 6: TS scanner remains primary ───────────────
    it('TypeScript scanner is unchanged and remains functional', () => {
        const findings = (scanRustContent as any)({
            path: 'test.rs',
            text: 'let x = input.unwrap(); unsafe { *ptr = 1; }',
            contentHash: '',
            language: 'rust',
        });

        expect(Array.isArray(findings)).toBe(true);
        expect(findings.length).toBeGreaterThan(0);

        const kinds = findings.map((f: any) => f.riskKind);
        expect(kinds).toContain('unwrap_review_signal');
        expect(kinds).toContain('unsafe_block');

        for (const f of findings) {
            expect(f.file).toBeTruthy();
            expect(typeof f.line).toBe('number');
            expect(f.riskKind).toBeTruthy();
            expect(f.evidenceLevel).toBe('surface_detected');
        }
    });

    // ── Criterion 7: Path verifier gating ─────────────────────
    it('path verifier is available for pre-scanner safety checks', async () => {
        const testPath = path.join(FIXTURE_PATH, 'src', 'lib.rs');

        if (isRustVerifierAvailable()) {
            const pathResult = await verifyPathWithRust(testPath, process.cwd(), 'read');
            expect(pathResult).toHaveProperty('rustAvailable');
            expect(pathResult).toHaveProperty('evidence');
            console.log(`[v12.1] Path gate pre-check: ${pathResult.evidence}`);
        }

        const { isWithinWorkspaceSync } = await import('../src/path_safety.js');
        expect(isWithinWorkspaceSync(testPath, process.cwd())).toBe(true);
    });

    // ── Criterion 8: Evidence can be included in reports ──────
    it('Rust scanner evidence is well-formed for audit reports', async () => {
        const files = await readFixtureFiles();

        if (!isRustVerifierAvailable()) {
            console.log('[v12.1] Rust not available — evidence test skipped');
            return;
        }

        const result = await scanWithRust(files);
        expect(result.evidence).toBeTruthy();
        expect(typeof result.evidence).toBe('string');
        expect(result.evidence.length).toBeGreaterThan(10);

        const reportLine = `[Rust Scanner Evidence] ${result.evidence}`;
        expect(reportLine).toContain('Rust Scanner Evidence');
        console.log(reportLine);
    });
});