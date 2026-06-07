// CohBit-Copilot v11.8 — Rust Receipt Verification Gate
// Process-based bridge between TypeScript orchestration and Rust trust kernel.
//
// Operating law:
//   Rust may verify deterministic receipt facts.
//   Rust verifier output is evidence.
//   Rust verifier output is not commit authority.
//   Commit state still requires the governed gate lifecycle.
//
// Design:
//   This module writes a single receipt payload to sdks/rust/gate_payload.json,
//   spawns `cargo test test_gate_payload -- --nocapture`, and parses the output.
//   The Rust test (sdks/rust/tests/conformance.rs) loads the file and verifies.
//   If cargo/rust is not available, the gate degrades gracefully.

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import type { CohBitReceipt } from './types.js';
import { hashReceipt } from './receipt.js';

// ─── Types ─────────────────────────────────────────────────────

export interface RustVerificationResult {
    rustAvailable: boolean;
    verified: boolean;
    tsHash: string;
    rustHash: string;
    evidence: string;
    error: string | undefined;
}

// ─── Payload builder ────────────────────────────────────────────

interface GatePayload {
    name: string;
    hash_expected: string;
    input: {
        valuationPre: { numer: number; denom: number };
        valuationPost: { numer: number; denom: number };
        version: string;
        domainId: string;
        policyHash: string;
        fromState: string;
        actionHash: string;
        toState: string;
        spend: { numer: number; denom: number };
        defect: { numer: number; denom: number };
        prescribedEnvelope: { numer: number; denom: number };
        authority: { numer: number; denom: number };
        certificateHash: string;
    };
}

function buildPayload(receipt: CohBitReceipt, tsHash: string): GatePayload {
    return {
        name: `v11_8_gate_${receipt.bitId.substring(0, 12)}`,
        hash_expected: tsHash,
        input: {
            valuationPre: { numer: receipt.valuationPre.numer, denom: receipt.valuationPre.denom },
            valuationPost: { numer: receipt.valuationPost.numer, denom: receipt.valuationPost.denom },
            version: receipt.wedge.version,
            domainId: receipt.wedge.domainId,
            policyHash: receipt.wedge.policyHash,
            fromState: receipt.wedge.fromState,
            actionHash: receipt.wedge.actionHash,
            toState: receipt.wedge.toState,
            spend: { numer: receipt.wedge.spend.numer, denom: receipt.wedge.spend.denom },
            defect: { numer: receipt.wedge.defect.numer, denom: receipt.wedge.defect.denom },
            prescribedEnvelope: { numer: receipt.wedge.prescribedEnvelope.numer, denom: receipt.wedge.prescribedEnvelope.denom },
            authority: { numer: receipt.wedge.authority.numer, denom: receipt.wedge.authority.denom },
            certificateHash: receipt.wedge.certificateHash,
        },
    };
}

// ─── Tool check ─────────────────────────────────────────────────

function isCargoAvailable(): boolean {
    try {
        execSync('cargo --version', { stdio: 'pipe', timeout: 5000 });
        return true;
    } catch {
        return false;
    }
}

// ─── Rust verifier bridge ───────────────────────────────────────

/**
 * Verifies a receipt against the Rust SDK conformance test.
 * 
 * 1. Writes the receipt payload to sdks/rust/gate_payload.json
 * 2. Spawns: cargo test test_gate_payload -- --nocapture
 * 3. Parses output for VERIFIED <hash> or MISMATCH
 * 4. Cleans up the temp payload file
 * 
 * If cargo is not available, returns { rustAvailable: false }.
 */
export async function verifyReceiptWithRust(
    receipt: CohBitReceipt,
): Promise<RustVerificationResult> {
    const tsHash = hashReceipt(receipt);

    if (!isCargoAvailable()) {
        return {
            rustAvailable: false,
            verified: false,
            tsHash,
            rustHash: '',
            evidence: 'Rust verifier not available: cargo not found in PATH',
            error: 'cargo not found',
        };
    }

    const sdkDir = path.resolve(process.cwd(), 'sdks', 'rust');
    const payloadFile = path.join(sdkDir, 'gate_payload.json');

    const payload = buildPayload(receipt, tsHash);

    try {
        await fs.writeFile(payloadFile, JSON.stringify([payload], null, 2), 'utf-8');

        let output: string;
        try {
            output = execSync(
                `cargo test --manifest-path "${path.join(sdkDir, 'Cargo.toml')}" test_gate_payload -- --nocapture`,
                { timeout: 60000, cwd: sdkDir, encoding: 'utf-8', windowsHide: true },
            ) as string;
        } catch (err: any) {
            // cargo test exits non-zero on test failure — capture stderr for parsing
            output = (err.stdout || '') + '\n' + (err.stderr || '');
        }

        // Parse: "VERIFIED <hash>" or "MISMATCH expected:<hash> got:<hash>"
        const verifiedMatch = output.match(/VERIFIED\s+([a-f0-9]+)/);
        const mismatchMatch = output.match(/MISMATCH\s+expected:([a-f0-9]+)\s+got:([a-f0-9]+)/);

        if (verifiedMatch) {
            return {
                rustAvailable: true,
                verified: true,
                tsHash,
                rustHash: verifiedMatch[1]!,
                evidence: `Rust verifier confirmed receipt hash: ${verifiedMatch[1]}`,
                error: undefined,
            };
        }

        if (mismatchMatch) {
            return {
                rustAvailable: true,
                verified: false,
                tsHash,
                rustHash: mismatchMatch[2]!,
                evidence: `Rust verifier MISMATCH: expected ${mismatchMatch[1]}, got ${mismatchMatch[2]}`,
                error: `Hash mismatch: expected ${mismatchMatch[1]}, got ${mismatchMatch[2]}`,
            };
        }

        // Fallback: check if test output indicates pass/fail
        const passed = !output.includes('FAILED') && output.includes('test test_gate_payload ... ok');
        return {
            rustAvailable: true,
            verified: passed,
            tsHash,
            rustHash: '',
            evidence: passed
                ? 'Rust verifier passed (test exited ok)'
                : `Rust verifier failed: ${output.substring(0, 500)}`,
            error: passed ? undefined : (output.substring(0, 500) as string | undefined),
        };
    } catch (err: any) {
        return {
            rustAvailable: true,
            verified: false,
            tsHash,
            rustHash: '',
            evidence: `Rust verifier error: ${err.message || String(err)}`,
            error: err.message || String(err),
        };
    } finally {
        try { await fs.unlink(payloadFile); } catch { /* best-effort cleanup */ }
    }
}

/** Synchronous availability check for gate pipeline use */
export function isRustVerifierAvailable(): boolean {
    return isCargoAvailable();
}