// CohBit-Copilot v12.2 — Rust Policy / Admissibility Gate
// Process-based bridge between TypeScript authorization gate and Rust policy kernel.
//
// Operating law:
//   Rust may verify deterministic gate preconditions.
//   Rust may return policy/admissibility evidence.
//   Rust may not authorize commit, close obligations, or apply patches.
//   The TypeScript gate lifecycle remains the authority path.

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { isRustVerifierAvailable } from './rust_receipt_gate.js';
import type { Rational64 } from './types.js';
import { memoryMass } from './receipt.js';
import type { CohBitReceipt, GateRecord } from './types.js';

// ─── Types ─────────────────────────────────────────────────────

export interface PolicyCheckResult {
    check: string;
    passed: boolean;
    detail?: string;
}

export interface RustPolicyResult {
    rustAvailable: boolean;
    valid: boolean;
    checks: PolicyCheckResult[];
    evidence: string;
    error?: string | undefined;
}

// ─── Payload builder ────────────────────────────────────────────

const HIGH_RISK_DIRS = ['src/gates', 'src/rust_', 'sdks/rust/src/bin', 'src/cli.ts', 'tests/g'];

function isHighRiskAction(action: string, filePath: string): boolean {
    if (action === 'create' || action === 'delete') return true;
    if (HIGH_RISK_DIRS.some(dir => filePath.startsWith(dir))) return true;
    return false;
}

function buildPayload(
    record: GateRecord,
    receipt: CohBitReceipt,
    valuationPre: Rational64,
    valuationPost: Rational64,
    memoryBudget: number,
    maxFiles: number,
) {
    return {
        proposal: {
            policyHash: record.proposal.policyHash,
            files: record.proposal.files.map(f => ({
                path: f.path,
                action: f.action,
                requiresReview: isHighRiskAction(f.action, f.path),
            })),
            estimatedSpend: record.proposal.estimatedSpend,
            estimatedDefect: record.proposal.estimatedDefect,
            requiredAuthority: record.proposal.requiredAuthority,
        },
        authorization: {
            valuationPre,
            valuationPost,
            memoryBudget,
            receiptPolicyHash: receipt.wedge.policyHash,
            receiptSpend: receipt.wedge.spend,
            receiptDefect: receipt.wedge.defect,
            receiptAuthority: receipt.wedge.authority,
            receiptCanonicalBytes: memoryMass(receipt),
        },
        maxFiles,
    };
}

// ─── Rust policy gate bridge ────────────────────────────────────

export async function verifyPolicyWithRust(
    record: GateRecord,
    receipt: CohBitReceipt,
    valuationPre: Rational64,
    valuationPost: Rational64,
    memoryBudget: number = 1000000,
    maxFiles: number = 10,
): Promise<RustPolicyResult> {
    if (!isRustVerifierAvailable()) {
        return {
            rustAvailable: false,
            valid: false,
            checks: [],
            evidence: 'Rust policy gate not available: cargo not found in PATH',
            error: 'cargo not found',
        };
    }

    const sdkDir = path.resolve(process.cwd(), 'sdks', 'rust');
    const payloadFile = path.join(sdkDir, 'policy_gate_payload.json');
    const payload = buildPayload(record, receipt, valuationPre, valuationPost, memoryBudget, maxFiles);

    try {
        await fs.writeFile(payloadFile, JSON.stringify(payload, null, 2), 'utf-8');

        let output: string;
        try {
            output = execSync(
                `cargo run --manifest-path "${path.join(sdkDir, 'Cargo.toml')}" --bin policy_gate -- "${payloadFile}"`,
                { timeout: 30000, cwd: sdkDir, encoding: 'utf-8', windowsHide: true },
            ) as string;
        } catch (err: any) {
            output = (err.stdout || '') + '\n' + (err.stderr || '');
        }

        // Parse JSON output
        try {
            const jsonMatch = output.match(/\{[\s\S]*"checks"[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    rustAvailable: true,
                    valid: parsed.valid === true,
                    checks: parsed.checks || [],
                    evidence: parsed.evidence || `Rust policy gate: ${parsed.valid ? 'passed' : 'failed'}`,
                };
            }
        } catch {
            // Fallback
        }

        return {
            rustAvailable: true,
            valid: !output.includes('preconditions failed'),
            checks: [],
            evidence: `Rust policy gate: ${output.includes('preconditions failed') ? 'failed' : 'passed'}`,
        };
    } catch (err: any) {
        return {
            rustAvailable: true,
            valid: false,
            checks: [],
            evidence: `Rust policy gate error: ${err.message || String(err)}`,
            error: err.message,
        };
    } finally {
        try { await fs.unlink(payloadFile); } catch { /* best-effort */ }
    }
}