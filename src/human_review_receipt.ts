// CohBit-Copilot Human Review Receipts (v6.1)
// Annotates atlas memory entries with human review decisions.
// v6.1: adds proposalAllowed flag so human review can unlock proposal generation.
// Does not modify source code, generate patches, or promote evidence.
//
// Operating law:
//   Human review may classify memory and enable proposal eligibility.
//   It may not rewrite history, silently delete findings, generate repairs, or authorize mutation.
//   A review receipt is an annotation, not a gate-pipeline receipt.
//   Proposal allowed does not mean proposal applied.

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ─── Types ─────────────────────────────────────────────────────

export type ReviewDecision =
    | 'accepted_risk'
    | 'false_positive'
    | 'needs_repair'
    | 'deferred'
    | 'not_applicable';

export const VALID_REVIEW_DECISIONS: ReadonlySet<ReviewDecision> = new Set([
    'accepted_risk',
    'false_positive',
    'needs_repair',
    'deferred',
    'not_applicable',
]);

export interface HumanReviewReceipt {
    reviewId: string;                          // deterministic sha256(atlasEntryId + reviewer + reviewedAt)
    atlasEntryId: string;                       // links to stored atlas entry
    reviewer: string;                           // human identifier
    decision: ReviewDecision;
    rationale: string;                          // required — no decision without reason
    proposalAllowed: boolean;                   // v6.1: human may enable proposal generation
    reviewedAt: string;                         // ISO 8601
    evidenceLevel: 'human_reviewed';
    sourceEvidenceLevel: 'surface_detected';    // original evidence level of the finding
    commitStatus: 'not_applicable';             // always — annotation, not gate commit
}

// ─── Deterministic ID ─────────────────────────────────────────

function deterministicReviewId(atlasEntryId: string, reviewer: string, reviewedAt: string): string {
    const input = `${atlasEntryId}:${reviewer}:${reviewedAt}`;
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 32);
}

// ─── Validation ───────────────────────────────────────────────

export function validateReviewReceipt(receipt: HumanReviewReceipt): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!receipt.atlasEntryId || receipt.atlasEntryId.length < 8) {
        errors.push('atlasEntryId is required and must be at least 8 characters');
    }
    if (!receipt.reviewer || receipt.reviewer.trim().length === 0) {
        errors.push('reviewer is required');
    }
    if (!receipt.rationale || receipt.rationale.trim().length === 0) {
        errors.push('rationale is required — no decision without reason');
    }
    if (!VALID_REVIEW_DECISIONS.has(receipt.decision)) {
        errors.push(`decision must be one of: ${[...VALID_REVIEW_DECISIONS].join(', ')}`);
    }
    if (!receipt.reviewedAt || isNaN(Date.parse(receipt.reviewedAt))) {
        errors.push('reviewedAt must be a valid ISO 8601 date');
    }
    if (receipt.evidenceLevel !== 'human_reviewed') {
        errors.push('evidenceLevel must be exactly "human_reviewed"');
    }
    if (receipt.commitStatus !== 'not_applicable') {
        errors.push('commitStatus must be exactly "not_applicable" — review receipts are annotations, not gate commits');
    }
    if (typeof receipt.proposalAllowed !== 'boolean') {
        errors.push('proposalAllowed must be a boolean');
    }

    const expectedId = deterministicReviewId(receipt.atlasEntryId, receipt.reviewer, receipt.reviewedAt);
    if (receipt.reviewId !== expectedId) {
        errors.push(`reviewId mismatch: expected ${expectedId}, got ${receipt.reviewId}`);
    }

    return { valid: errors.length === 0, errors };
}

// ─── Create ────────────────────────────────────────────────────

export function createReviewReceipt(
    atlasEntryId: string,
    reviewer: string,
    decision: ReviewDecision,
    rationale: string,
    proposalAllowed = false,
): HumanReviewReceipt {
    const reviewedAt = new Date().toISOString();
    const reviewId = deterministicReviewId(atlasEntryId, reviewer, reviewedAt);

    return {
        reviewId,
        atlasEntryId,
        reviewer,
        decision,
        rationale,
        proposalAllowed,
        reviewedAt,
        evidenceLevel: 'human_reviewed',
        sourceEvidenceLevel: 'surface_detected',
        commitStatus: 'not_applicable',
    };
}

// ─── Storage ───────────────────────────────────────────────────

function reviewsDir(): string {
    return path.join(process.cwd(), '.cohbit', 'atlas', 'reviews');
}

function reviewFilePath(atlasEntryId: string): string {
    return path.join(reviewsDir(), `${atlasEntryId}.json`);
}

async function ensureReviewsDir(): Promise<void> {
    await fs.mkdir(reviewsDir(), { recursive: true });
}

/**
 * Store a human review receipt.
 * Writes to .cohbit/atlas/reviews/<atlasEntryId>.json.
 */
export async function storeReviewReceipt(receipt: HumanReviewReceipt): Promise<void> {
    const validation = validateReviewReceipt(receipt);
    if (!validation.valid) {
        throw new Error(`Invalid review receipt: ${validation.errors.join('; ')}`);
    }

    await ensureReviewsDir();
    const filePath = reviewFilePath(receipt.atlasEntryId);
    await fs.writeFile(filePath, JSON.stringify(receipt, null, 2), 'utf-8');
}

/**
 * Retrieve a review receipt by atlas entry ID.
 */
export async function getReviewReceipt(atlasEntryId: string): Promise<HumanReviewReceipt | null> {
    try {
        const content = await fs.readFile(reviewFilePath(atlasEntryId), 'utf-8');
        return JSON.parse(content) as HumanReviewReceipt;
    } catch {
        return null;
    }
}

/**
 * List all stored review receipts.
 */
export async function listReviewReceipts(): Promise<HumanReviewReceipt[]> {
    const results: HumanReviewReceipt[] = [];
    try {
        const files = await fs.readdir(reviewsDir());
        for (const file of files) {
            if (!file.endsWith('.json')) continue;
            try {
                const content = await fs.readFile(path.join(reviewsDir(), file), 'utf-8');
                results.push(JSON.parse(content) as HumanReviewReceipt);
            } catch {
                // Skip unreadable entries
            }
        }
    } catch {
        // Directory may not exist yet
    }
    return results;
}