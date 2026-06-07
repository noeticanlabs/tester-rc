// CohBit-Copilot v12.0 — Rust Deterministic ID Verification Gate
// Process-based bridge between TypeScript orchestration and Rust ID kernel.
//
// Operating law:
//   Rust may verify deterministic ID facts.
//   Rust verifier output is evidence, not authority.
//   TypeScript ID functions remain the primary generators.

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { isRustVerifierAvailable } from './rust_receipt_gate.js';

// ─── Types ─────────────────────────────────────────────────────

export interface RustIdVerificationResult {
    rustAvailable: boolean;
    verified: boolean;
    totalVectors: number;
    passed: number;
    mismatches: number;
    evidence: string;
    error: string | undefined;
}

// ─── Rust ID verifier bridge ────────────────────────────────────

/**
 * Verifies deterministic ID conformance vectors against the Rust ID kernel.
 * 
 * 1. Writes id_conformance.json vectors to sdks/rust/id_gate_payload.json
 * 2. Spawns: cargo run --bin id_gate -- id_gate_payload.json
 * 3. Parses output for VERIFIED/MISMATCH
 * 4. Cleans up the temp payload file
 * 
 * If cargo is not available, returns { rustAvailable: false }.
 */
export async function verifyIdsWithRust(): Promise<RustIdVerificationResult> {
    if (!isRustVerifierAvailable()) {
        return {
            rustAvailable: false,
            verified: false,
            totalVectors: 0,
            passed: 0,
            mismatches: 0,
            evidence: 'Rust ID gate not available: cargo not found in PATH',
            error: 'cargo not found',
        };
    }

    const sdkDir = path.resolve(process.cwd(), 'sdks', 'rust');
    const vectorsFile = path.resolve(process.cwd(), 'test_vectors', 'id_conformance.json');
    const payloadFile = path.join(sdkDir, 'id_gate_payload.json');

    try {
        // Copy conformance vectors to the SDK directory
        const vectorsContent = await fs.readFile(vectorsFile, 'utf-8');
        await fs.writeFile(payloadFile, vectorsContent, 'utf-8');

        let output: string;
        try {
            output = execSync(
                `cargo run --manifest-path "${path.join(sdkDir, 'Cargo.toml')}" --bin id_gate -- "${payloadFile}"`,
                { timeout: 60000, cwd: sdkDir, encoding: 'utf-8', windowsHide: true },
            ) as string;
        } catch (err: any) {
            // Exit code 1 means mismatch — capture output for parsing
            output = (err.stdout || '') + '\n' + (err.stderr || '');
        }

        // Parse: count VERIFIED matches
        const verifiedMatches = output.match(/VERIFIED/g);
        const mismatchMatches = output.match(/MISMATCH/g);
        const totalMatch = output.match(/(\d+)\/(\d+) vectors match/);

        const totalVectors = totalMatch ? parseInt(totalMatch[2]!, 10) : 0;
        const passed = verifiedMatches ? verifiedMatches.length : 0;
        const mismatches = mismatchMatches ? mismatchMatches.length : 0;
        const verified = mismatches === 0 && passed > 0;

        return {
            rustAvailable: true,
            verified,
            totalVectors,
            passed,
            mismatches,
            evidence: verified
                ? `Rust ID gate: all ${passed}/${totalVectors} vectors match. IDs verified.`
                : `Rust ID gate: ${mismatches} mismatch(es) in ${totalVectors} vectors.`,
            error: verified ? undefined : `${mismatches} vectors did not match`,
        };
    } catch (err: any) {
        return {
            rustAvailable: true,
            verified: false,
            totalVectors: 0,
            passed: 0,
            mismatches: 0,
            evidence: `Rust ID gate error: ${err.message || String(err)}`,
            error: err.message || String(err),
        };
    } finally {
        try { await fs.unlink(payloadFile); } catch { /* best-effort cleanup */ }
    }
}