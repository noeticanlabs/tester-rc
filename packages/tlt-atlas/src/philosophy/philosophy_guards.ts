// CohBit-Copilot v14.1 — Philosophy Guards
// Overclaim detection for philosophical language.
//
// Operating Law:
//   Philosophical language may not use proof terminology, assert literal truth,
//   collapse analogies into identity, or claim canon status without receipt.
//
//   These guards detect those boundary violations at the surface_detected level.
//   They do not authorize, certify, or govern — they flag for human attention.

/**
 * Detects philosophical overclaim patterns in text.
 * Returns an array of warning codes for human review.
 */
export function detectPhilosophyOverclaim(text: string): string[] {
    const lower = text.toLowerCase();
    const warnings: string[] = [];

    if (/\bproves\b|\bproven\b|\bguarantees\b|\bcertifies\b/.test(lower)) {
        warnings.push("philosophical_claim_using_proof_language");
    }

    if (/\bliteral mechanism\b|\bis reality\b|\bstructure of reality\b/.test(lower)) {
        warnings.push("reflective_frame_stated_as_literal_truth");
    }

    if (/\banalogy\b/.test(lower) && /\bidentical\b|\bsame as\b/.test(lower)) {
        warnings.push("analogy_treated_as_identity");
    }

    if (/\bcanon\b|\bcanonical\b/.test(lower) && !/\breceipt\b|\breview\b|\badmission\b/.test(lower)) {
        warnings.push("canon_status_without_receipt");
    }

    return warnings;
}