// CohBit-Copilot Retrieval Filter (v5.0)
// Filters retrieval candidates by review status.
// Does not modify candidates or promote evidence.
//
// Operating law:
//   Filtering may distinguish reviewed from unreviewed memory.
//   It may not certify, promote, or mutate.

import type { RetrievalCandidate } from '../packages/tooling/src/T15_retrieval_guard.js';

export interface FilteredRetrieval {
    reviewed: RetrievalCandidate[];
    unreviewed: RetrievalCandidate[];
    total: number;
}

/**
 * Split retrieval candidates into reviewed and unreviewed sets.
 * Uses a set of atlasEntryIds that have stored review receipts.
 */
export function filterByReviewStatus(
    candidates: RetrievalCandidate[],
    reviewedEntryIds: Set<string>,
): FilteredRetrieval {
    const reviewed: RetrievalCandidate[] = [];
    const unreviewed: RetrievalCandidate[] = [];

    for (const c of candidates) {
        if (reviewedEntryIds.has(c.sourceId)) {
            reviewed.push(c);
        } else {
            unreviewed.push(c);
        }
    }

    return {
        reviewed,
        unreviewed,
        total: candidates.length,
    };
}