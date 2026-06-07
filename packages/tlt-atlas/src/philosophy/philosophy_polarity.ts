// CohBit-Copilot v14.1 — Philosophy Polarity Signals
// Extracts positive and negative polarity indicators from philosophical language records.
//
// Operating Law:
//   Polarity signals are reflective quality indicators, not proof of validity.
//   They help classify philosophical language along positive/negative axes
//   for teaching, review, and curriculum annotation.

import type { PhilosophicalLanguageRecord } from "./L17_philosophical_language.js";

export type PhilosophyPolaritySignal =
    | "clear_thesis"
    | "bounded_claim"
    | "defined_terms"
    | "explicit_limitation"
    | "objection_acknowledged"
    | "analogy_labeled_as_analogy"
    | "evidence_status_visible"
    | "philosophy_stated_as_truth"
    | "analogy_collapse"
    | "proof_language_without_proof"
    | "canon_claim_without_receipt"
    | "undefined_foundation";

export interface PhilosophyPolarityResult {
    positive: PhilosophyPolaritySignal[];
    negative: PhilosophyPolaritySignal[];
}

/**
 * Extracts polarity signals from a classified philosophical language record.
 * Positive signals indicate well-bounded reflective language.
 * Negative signals indicate overclaim or boundary violations.
 */
export function extractPhilosophyPolaritySignals(
    record: PhilosophicalLanguageRecord
): PhilosophyPolarityResult {
    const positive: PhilosophyPolaritySignal[] = [];
    const negative: PhilosophyPolaritySignal[] = [];

    if (record.claimType === "philosophical_thesis") positive.push("clear_thesis");
    if (record.limitations.length > 0) positive.push("explicit_limitation");
    if (record.truthStatus === "theoretical_claim") positive.push("bounded_claim");
    if (record.claimType === "analogy") positive.push("analogy_labeled_as_analogy");

    for (const warning of record.warnings) {
        if (warning.includes("truth")) negative.push("philosophy_stated_as_truth");
        if (warning.includes("analogy")) negative.push("analogy_collapse");
        if (warning.includes("proof")) negative.push("proof_language_without_proof");
        if (warning.includes("canon")) negative.push("canon_claim_without_receipt");
    }

    return { positive, negative };
}