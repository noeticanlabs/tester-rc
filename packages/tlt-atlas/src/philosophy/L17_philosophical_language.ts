// CohBit-Copilot v14.1 — L17 Philosophical Language
// TLT Atlas Layer: Detects, classifies, and bounds philosophical language.
//
// Operating Law:
//   Philosophy is disciplined reflection over meaning.
//   It may form concepts, expose assumptions, and guide inquiry.
//   It may not certify truth, prove claims, authorize action,
//   or become canon without receipt-bearing admission.
//
//   Philosophy may guide attention before it may govern commitment.

import { createHash } from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────

export type PhilosophyLanguageMode =
    | "reflective"
    | "conceptual"
    | "normative"
    | "interpretive"
    | "metaphorical"
    | "critical"
    | "foundational"
    | "public_facing";

export type PhilosophyTruthStatus =
    | "not_truth_claim"
    | "theoretical_claim"
    | "interpretive_claim"
    | "argument_supported"
    | "formally_defined"
    | "evidence_linked"
    | "canon_approved";

export type PhilosophyClaimType =
    | "philosophical_thesis"
    | "conceptual_model"
    | "formal_definition"
    | "normative_principle"
    | "epistemic_principle"
    | "metaphysical_claim"
    | "argument_step"
    | "objection"
    | "reply"
    | "analogy"
    | "formal_bridge_schema"
    | "public_facing_statement"
    | "canon_candidate"
    | "interpretive_claim";

export interface PhilosophicalLanguageRecord {
    recordId: string;
    sourceId: string;
    text: string;

    isPhilosophical: boolean;
    languageMode: PhilosophyLanguageMode;
    truthStatus: PhilosophyTruthStatus;
    claimType: PhilosophyClaimType;

    positiveSignals: string[];
    warnings: string[];
    limitations: string[];

    publicSafe: boolean;
    canonCandidate: boolean;
    canonApproved: boolean;

    evidenceCeiling:
    | "conceptual"
    | "argument_supported"
    | "source_supported"
    | "receipt_linked"
    | "canon_approved";

    createdAt: string;
}

// ─── Hashing Helper ──────────────────────────────────────────────

/**
 * Deterministic SHA-256 hash for record identity.
 */
export function hashText(text: string): string {
    return createHash("sha256").update(text).digest("hex");
}

// ─── Classifier ──────────────────────────────────────────────────

/**
 * Classifies a text as philosophical language, identifying its mode,
 * truth status, claim type, positive signals, warnings, and limitations.
 *
 * The classifier is pattern-based and operates at the surface_detected
 * evidence level. It does not assert truth, make commitments, or authorize
 * claims. Output is advisory and reflective only.
 */
export function classifyPhilosophicalLanguage(
    text: string,
    sourceId = "unknown"
): PhilosophicalLanguageRecord {
    const lower = text.toLowerCase();

    const isPhilosophical =
        /\bmeaning\b|\btruth\b|\breality\b|\bbeing\b|\bbecoming\b|\bethics\b|\bought\b|\bshould\b|\bconceptual\b|\bthesis\b|\banalogy\b|\bontology\b|\bepistemic\b/.test(
            lower
        );

    const warnings: string[] = [];
    const positiveSignals: string[] = [];
    const limitations: string[] = [];
    const negate = (s: string) =>
        !new RegExp(`\\bno ${s}\\b|\\bnot ${s}\\b|\\bnever ${s}\\b|\\bwithout ${s}\\b`).test(lower);

    let languageMode: PhilosophyLanguageMode = "reflective";
    let truthStatus: PhilosophyTruthStatus = "theoretical_claim";
    let claimType: PhilosophyClaimType = "philosophical_thesis";

    // ── Analogy Detection ────────────────────────────────
    if (/\banalogy\b|\blike\b|\bas if\b|\bstructural analogy\b/.test(lower)) {
        languageMode = "metaphorical";
        claimType = "analogy";
        positiveSignals.push("analogy_detected");
    }

    // ── Definition Detection ────────────────────────────
    if (/\bdefinition\b|\bdefined as\b|\bmeans\b/.test(lower)) {
        claimType = "formal_definition";
        truthStatus = "formally_defined";
        positiveSignals.push("definition_language_detected");
    }

    // ── Normative Detection ─────────────────────────────
    if (/\bshould\b|\bought\b|\bresponsibility\b|\bduty\b|\bmust\b/.test(lower)) {
        languageMode = "normative";
        claimType = "normative_principle";
    }

    // ── Critical / Interpretive Detection ────────────────
    if (/\bquestion\b|\bchallenge\b|\bobjection\b|\bproblem\b|\bconcern\b/.test(lower) && negate("claim")) {
        languageMode = "critical";
        claimType = "objection";
    }

    if (/\binterpretation\b|\breading\b|\blens\b|\bframe\b/.test(lower)) {
        languageMode = "interpretive";
        claimType = "interpretive_claim";
        positiveSignals.push("interpretive_language_detected");
    }

    // ── Public Facing Detection ─────────────────────────
    if (/\bpublic\b|\baudience\b|\bexternal\b|\bcommunication\b/.test(lower)) {
        languageMode = "public_facing";
        claimType = "public_facing_statement";
    }

    // ── Warning: Proof Language Without Proof ────────────
    if (/\bproves\b|\bproven\b|\bguarantees\b|\bcertifies\b|\btheorem\b/.test(lower)) {
        warnings.push("proof_language_requires_formal_status");
        limitations.push(
            "Philosophical language does not become proof without formal derivation or verification."
        );
    }

    // ── Warning: Philosophy Stated as Truth ──────────────
    if (/\bis reality\b|\bthe structure of reality\b|\bliteral mechanism\b/.test(lower)) {
        warnings.push("philosophy_stated_as_truth");
        limitations.push(
            "This should be framed as a conceptual lens unless supported by stronger evidence."
        );
    }

    // ── Warning: Analogy Collapse ────────────────────────
    if (/\banalogy\b/.test(lower) && /\bis identical to\b|\bis the same as\b/.test(lower)) {
        warnings.push("analogy_collapse");
        limitations.push("Analogy may explain structure but must not imply identity.");
    }

    // ── Warning: Canon Without Receipt ───────────────────
    if (/\bcanon\b|\bcanonical\b/.test(lower) && !/\breceipt\b|\breview\b|\badmitted\b/.test(lower)) {
        warnings.push("canon_language_without_admission_receipt");
        limitations.push("Canon status requires explicit review, receipt, and admission.");
    }

    // ── Warning: Foundational Claim Without Boundary ─────
    if (/\bfoundation\b|\bfundamental\b|\bfirst principle\b/.test(lower) && !/\bdefined\b|\bassumption\b|\bworking\b/.test(lower)) {
        warnings.push("foundational_claim_without_boundary");
        limitations.push(
            "Foundational language should explicitly mark assumptions or declare a working boundary."
        );
    }

    // ── Warning: Metaphysical Claim Without Framing ──────
    if (/\bmetaphysical\b|\bessence\b|\bnature of\b/.test(lower) && !/\blens\b|\bconceptual\b|\bframe\b/.test(lower)) {
        warnings.push("metaphysical_claim_without_framing");
        limitations.push("Metaphysical language should be framed as a conceptual lens, not literal description.");
    }

    // ── Positive Signals (if no warnings) ────────────────
    if (warnings.length === 0) {
        positiveSignals.push("bounded_philosophical_language");
    }

    // ── Always include reflective signal ────────────────
    positiveSignals.push("treated_as_reflective_language_not_truth");

    return {
        recordId: `PHIL_${hashText(sourceId + text).slice(0, 16)}`,
        sourceId,
        text,
        isPhilosophical,
        languageMode,
        truthStatus,
        claimType,
        positiveSignals,
        warnings,
        limitations,
        publicSafe: warnings.length === 0,
        canonCandidate: /\bcanon candidate\b/.test(lower),
        canonApproved: false,
        evidenceCeiling: "conceptual",
        createdAt: new Date().toISOString(),
    };
}