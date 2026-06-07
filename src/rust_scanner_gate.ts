// CohBit-Copilot v12.1 — Rust Scanner Gate
// Process-based bridge between TypeScript orchestration and Rust audit scanner.
//
// Operating law:
//   Rust scanner evidence may strengthen review confidence.
//   It does not prove a defect, authorize repair, or replace human review.
//   TypeScript T_rust_risk_scanner.ts remains the primary audit path.

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { isRustVerifierAvailable } from './rust_receipt_gate.js';

// ─── Types ─────────────────────────────────────────────────────

export interface RustScannerFinding {
    file: string;
    line: number;
    riskKind: string;
    matchedText: string;
}

export interface RustScannerResult {
    rustAvailable: boolean;
    filesScanned: number;
    findings: RustScannerFinding[];
    evidence: string;
    error?: string;
}

// ─── Rust scanner bridge ────────────────────────────────────────

/**
 * Scans Rust source files using the Rust audit scanner binary.
 * 
 * 1. Writes file paths + content to scanner_payload.json
 * 2. Spawns: cargo run --bin scanner_gate -- scanner_payload.json
 * 3. Parses structured JSON output
 * 4. Cleans up temp files
 */
export async function scanWithRust(
    files: Array<{ path: string; text: string }>,
): Promise<RustScannerResult> {
    if (!isRustVerifierAvailable()) {
        return {
            rustAvailable: false,
            filesScanned: 0,
            findings: [],
            evidence: 'Rust scanner not available: cargo not found in PATH',
            error: 'cargo not found',
        };
    }

    const sdkDir = path.resolve(process.cwd(), 'sdks', 'rust');
    const payloadFile = path.join(sdkDir, 'scanner_payload.json');

    try {
        const payload = { files };
        await fs.writeFile(payloadFile, JSON.stringify(payload, null, 2), 'utf-8');

        let output: string;
        try {
            output = execSync(
                `cargo run --manifest-path "${path.join(sdkDir, 'Cargo.toml')}" --bin scanner_gate -- "${payloadFile}"`,
                { timeout: 60000, cwd: sdkDir, encoding: 'utf-8', windowsHide: true },
            ) as string;
        } catch (err: any) {
            output = (err.stdout || '') + '\n' + (err.stderr || '');
            return {
                rustAvailable: true,
                filesScanned: 0,
                findings: [],
                evidence: `Rust scanner error: ${err.message || String(err)}`,
                error: err.message,
            };
        }

        // Parse JSON output
        try {
            const jsonMatch = output.match(/\{[\s\S]*"findings"[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    rustAvailable: true,
                    filesScanned: parsed.files_scanned || 0,
                    findings: (parsed.findings || []).map((f: any) => ({
                        file: f.file,
                        line: f.line,
                        riskKind: f.risk_kind || f.riskKind,
                        matchedText: f.matched_text || f.matchedText || '',
                    })),
                    evidence: parsed.evidence || `Rust scanner found ${parsed.findings?.length || 0} findings.`,
                };
            }
        } catch {
            // Fallback
        }

        return {
            rustAvailable: true,
            filesScanned: files.length,
            findings: [],
            evidence: `Rust scanner ran but produced no parseable findings.`,
        };
    } catch (err: any) {
        return {
            rustAvailable: true,
            filesScanned: 0,
            findings: [],
            evidence: `Rust scanner error: ${err.message || String(err)}`,
            error: err.message,
        };
    } finally {
        try { await fs.unlink(payloadFile); } catch { /* best-effort */ }
    }
}