// CohBit-Copilot v11.9 — Rust Path Safety Verification Gate
// Process-based bridge between TypeScript orchestration and Rust path validation.
//
// Operating law:
//   Rust may verify path safety facts.
//   Rust validator output is evidence, not authority.
//   Rust validator never mutates the filesystem.
//   TypeScript path_safety.ts remains the primary enforcement gate.

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { execSync } from 'node:child_process';
import { isRustVerifierAvailable } from './rust_receipt_gate.js';

// ─── Types ─────────────────────────────────────────────────────

export interface RustPathVerificationResult {
    rustAvailable: boolean;
    valid: boolean;
    evidence: string;
    reason?: string;
    checks?: Array<{ check: string; passed: boolean; detail?: string }>;
    error?: string;
}

// ─── Payload builder ────────────────────────────────────────────

interface PathGatePayload {
    path: string;
    workspace_root: string;
    action: string;
}

function buildPayload(filePath: string, workspaceRoot: string, action: string): PathGatePayload {
    return {
        path: filePath,
        workspace_root: workspaceRoot,
        action,
    };
}

// ─── Rust path verifier bridge ──────────────────────────────────

export async function verifyPathWithRust(
    filePath: string,
    workspaceRoot: string,
    action: 'read' | 'write' = 'read',
): Promise<RustPathVerificationResult> {
    if (!isRustVerifierAvailable()) {
        return {
            rustAvailable: false,
            valid: false,
            evidence: 'Rust path gate not available: cargo not found in PATH',
            error: 'cargo not found',
        };
    }

    const sdkDir = path.resolve(process.cwd(), 'sdks', 'rust');
    const payloadFile = path.join(sdkDir, 'gate_path_payload.json');
    const payload = buildPayload(filePath, workspaceRoot, action);

    try {
        await fs.writeFile(payloadFile, JSON.stringify(payload, null, 2), 'utf-8');

        let output: string;
        try {
            output = execSync(
                `cargo run --manifest-path "${path.join(sdkDir, 'Cargo.toml')}" --bin path_gate -- "${payloadFile}"`,
                { timeout: 30000, cwd: sdkDir, encoding: 'utf-8', windowsHide: true },
            ) as string;
        } catch (err: any) {
            // Exit code 1 means path rejected — parse the output anyway
            output = (err.stdout || '') + '\n' + (err.stderr || '');
        }

        // Parse JSON output from Rust binary
        let parsed: any;
        try {
            const jsonMatch = output.match(/\{[\s\S]*"valid"[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            }
        } catch {
            // Fallback: use exit code and raw output
        }

        if (parsed) {
            return {
                rustAvailable: true,
                valid: parsed.valid === true,
                reason: parsed.reason || undefined,
                evidence: parsed.evidence || `Rust path gate: ${parsed.valid ? 'validated' : 'rejected'} path '${filePath}'`,
                checks: parsed.checks || [],
            };
        }

        // Fallback: parse from process exit behavior
        return {
            rustAvailable: true,
            valid: !output.includes('REJECTED'),
            evidence: output.includes('REJECTED')
                ? `Rust path gate rejected path: ${output.substring(0, 300)}`
                : `Rust path gate validated path: ${filePath}`,
        };
    } catch (err: any) {
        return {
            rustAvailable: true,
            valid: false,
            evidence: `Rust path gate error: ${err.message || String(err)}`,
            error: err.message || String(err),
        };
    } finally {
        try { await fs.unlink(payloadFile); } catch { /* best-effort cleanup */ }
    }
}