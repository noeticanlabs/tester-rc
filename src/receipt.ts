// Cohbit-Copilot Receipt System
// Deterministic receipt identity — matching SPEC.md §8:
// "A receipt R must deterministically bind source, target, spend, defect,
//  authority, and verifier evidence."

import * as crypto from 'node:crypto';
import type {
    CohBitReceipt,
    Wedge,
    Rational64,
    GmiStatus,
    LanguageReceipt,
} from './types.js';
import { isAdmissible } from './types.js';

// ─── Canonical Serialization ───────────────────────────────────
// SPEC.md Canonical Mandate: M_mem is defined strictly over the byte
// length of the canonical serialization. Non-canonical encodings forbidden.

function canonicalRational(r: Rational64): string {
    // Reduce to simplest form for deterministic serialization
    const g = gcd(Math.abs(r.numer), r.denom);
    const sign = r.numer < 0 ? -1 : 1;
    return `${sign * Math.abs(r.numer) / g}/${r.denom / g}`;
}

function gcd(a: number, b: number): number {
    if (a === 0 || b === 0) return 1;
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a;
}

// Canonical ordering of keys for deterministic serialization
function canonicalWedge(w: Wedge): string {
    return [
        `v:${w.version}`,
        `d:${w.domainId}`,
        `p:${w.policyHash}`,
        `f:${w.fromState}`,
        `a:${w.actionHash}`,
        `t:${w.toState}`,
        `s:${canonicalRational(w.spend)}`,
        `e:${canonicalRational(w.defect)}`,
        `z:${canonicalRational(w.prescribedEnvelope)}`,
        `u:${canonicalRational(w.authority)}`,
        `c:${w.certificateHash}`,
    ].join('|');
}

function canonicalReceipt(r: CohBitReceipt): string {
    return [
        `pre:${canonicalRational(r.valuationPre)}`,
        `post:${canonicalRational(r.valuationPost)}`,
        `w:[${canonicalWedge(r.wedge)}]`,
    ].join('|');
}

// ─── Receipt Hashing ───────────────────────────────────────────
// Deterministic SHA-256 hash matching test obligation:
//   receipt_hash_is_deterministic

export function hashReceipt(receipt: CohBitReceipt): string {
    const canonical = canonicalReceipt(receipt);
    return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeReceiptId(receipt: CohBitReceipt): string {
    return hashReceipt(receipt); // bitId = deterministic hash
}

// ─── Byte-Length Canonical Mass ────────────────────────────────
// M_mem(b) = |CanonicalBytes(b)|
export function memoryMass(receipt: CohBitReceipt): number {
    return Buffer.byteLength(canonicalReceipt(receipt), 'utf8');
}

// ─── Receipt Builder ───────────────────────────────────────────
// Builds a CohBitReceipt from a verified transition

export interface ReceiptBuilderInput {
    valuationPre: Rational64;
    valuationPost: Rational64;
    spend: Rational64;
    defect: Rational64;
    authority: Rational64;
    prescribedEnvelope: Rational64;
    fromState: string;
    toState: string;
    version: string;
    domainId: string;
    policyHash: string;
    actionHash: string;
    certificateHash: string;
}

export function buildReceipt(input: ReceiptBuilderInput): CohBitReceipt | { error: string } {
    // Verify admissibility before building
    if (!isAdmissible(
        input.valuationPre,
        input.valuationPost,
        input.spend,
        input.defect,
        input.authority,
    )) {
        return { error: 'Admissibility check failed: V(post) + s > V(pre) + d + a' };
    }

    if (input.defect.numer > input.defect.denom * input.prescribedEnvelope.numer / input.prescribedEnvelope.denom) {
        return { error: 'Defect exceeds prescribed envelope' };
    }

    const wedge: Wedge = {
        version: input.version,
        domainId: input.domainId,
        policyHash: input.policyHash,
        fromState: input.fromState,
        actionHash: input.actionHash,
        toState: input.toState,
        spend: input.spend,
        defect: input.defect,
        prescribedEnvelope: input.prescribedEnvelope,
        authority: input.authority,
        certificateHash: input.certificateHash,
    };

    const receipt: Omit<CohBitReceipt, 'bitId'> = {
        valuationPre: input.valuationPre,
        valuationPost: input.valuationPost,
        wedge,
    };

    const bitId = computeReceiptId({ ...receipt, bitId: '' } as CohBitReceipt);

    const full: CohBitReceipt = {
        ...receipt,
        bitId,
    };

    return full;
}

// ─── GMI Status Verification ───────────────────────────────────
// Maps to gmi_status.schema.json
export function verifyGmiStatus(
    receipt: CohBitReceipt,
    expectedHash: string,
): GmiStatus {
    const computedHash = hashReceipt(receipt);
    const hashVerified = computedHash === expectedHash;
    const signatureVerified = false; // v0.4: signature verification not yet implemented
    const transitionAdmissible = isAdmissible(
        receipt.valuationPre,
        receipt.valuationPost,
        receipt.wedge.spend,
        receipt.wedge.defect,
        receipt.wedge.authority,
    );

    return {
        blockHeight: 0, // Copilot sessions are not blockchain-based
        receiptHash: computedHash,
        hashVerified,
        signatureVerified,
        transitionAdmissible,
    };
}

// ─── Session Receipt (LanguageReceipt wrapper) ─────────────────
// Produces a LanguageReceipt for a completed governed patch cycle
export function buildLanguageReceipt(
    receiptId: string,
    candidateId: number,
    candidateKind: string,
    domain: string,
    valuationBefore: number,
    valuationAfter: number,
    spend: number,
    defect: number,
    authority: number,
    decision: 'Commit' | 'FallbackCommit' | 'Quarantine' | 'RepairNeeded' | 'Reject',
): LanguageReceipt {
    const raw: Record<string, unknown> = {
        receiptId,
        candidateId,
        candidateKind,
        decision,
        domain,
        valuationBefore,
        valuationAfter,
        spend,
        defect,
        authority,
        timestamp: new Date().toISOString(),
    };

    const hashBytes = Array.from(
        crypto.createHash('sha256')
            .update(JSON.stringify(raw), 'utf8')
            .digest(),
    );

    return {
        receiptId,
        candidateId,
        candidateKind,
        decision,
        domain,
        safetyLevel: decision === 'Commit' ? 'ACCEPTED' : 'FLAGGED',
        verifierResults: [],
        invariantChecks: [],
        committedText: decision === 'Commit' ? JSON.stringify(raw) : null,
        quarantinedText: decision === 'Quarantine' ? JSON.stringify(raw) : null,
        claimsChecked: [],
        valuationBefore,
        valuationAfter,
        spend,
        defect,
        authority,
        learnerScore: null,
        learnerDecision: null,
        replyLoopState: null,
        hash: hashBytes,
    };
}