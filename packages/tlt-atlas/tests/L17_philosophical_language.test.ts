// CohBit-Copilot v14.1 — L17 Philosophical Language Tests
// 10-criterion unit test suite for the philosophy submodule.

import { describe, it, expect } from "vitest";
import {
    classifyPhilosophicalLanguage,
    hashText,
} from "../src/philosophy/L17_philosophical_language.js";
import { detectPhilosophyOverclaim } from "../src/philosophy/philosophy_guards.js";
import { extractPhilosophyPolaritySignals } from "../src/philosophy/philosophy_polarity.js";
import { philosophyTeachingExplanation } from "../src/philosophy/philosophy_teaching.js";

describe("L17 — Philosophical Language", () => {

    // ── Criterion 1: Classifies philosophical thesis language ──
    it("classifies philosophical thesis language", () => {
        const record = classifyPhilosophicalLanguage(
            "The meaning of computation is deeply connected to the nature of truth."
        );
        expect(record.isPhilosophical).toBe(true);
        expect(record.claimType).toBe("philosophical_thesis");
        expect(record.languageMode).toBe("reflective");
        expect(record.truthStatus).toBe("theoretical_claim");
    });

    // ── Criterion 2: Classifies analogy language ──────────────
    it("classifies analogy language", () => {
        const record = classifyPhilosophicalLanguage(
            "The governed patch pipeline is like a structural analogy for controlled change."
        );
        expect(record.isPhilosophical).toBe(true);
        expect(record.claimType).toBe("analogy");
        expect(record.languageMode).toBe("metaphorical");
        expect(record.positiveSignals).toContain("analogy_detected");
    });

    // ── Criterion 3: Detects analogy-as-identity ─────────────
    it("detects analogy treated as identity", () => {
        const record = classifyPhilosophicalLanguage(
            "The analogy of gates to doors is identical to the real mechanism of security."
        );
        expect(record.warnings).toContain("analogy_collapse");
    });

    // ── Criterion 4: Detects proof language without proof status ──
    it("detects proof language without proof status", () => {
        const record = classifyPhilosophicalLanguage(
            "This framework proves that governance guarantees safety."
        );
        expect(record.warnings).toContain("proof_language_requires_formal_status");
    });

    // ── Criterion 5: Detects canon language without receipt ──
    it("detects canon language without receipt", () => {
        const record = classifyPhilosophicalLanguage(
            "This principle should be treated as canonical doctrine."
        );
        expect(record.warnings).toContain("canon_language_without_admission_receipt");
    });

    // ── Criterion 6: Marks philosophy as conceptual by default ──
    it("marks philosophy as conceptual/theoretical by default", () => {
        const record = classifyPhilosophicalLanguage("The nature of being is becoming.");
        expect(record.evidenceCeiling).toBe("conceptual");
        expect(record.truthStatus).toBe("theoretical_claim");
    });

    // ── Criterion 7: Produces positive signals for bounded reflective language ──
    it("produces positive signals for bounded reflective language", () => {
        const record = classifyPhilosophicalLanguage(
            "Reflection on the meaning of receipt-based governance suggests some useful lenses."
        );
        expect(record.positiveSignals).toContain("treated_as_reflective_language_not_truth");
        expect(record.positiveSignals).toContain("bounded_philosophical_language");
    });

    // ── Criterion 8: Produces negative signals for overclaim ──
    it("produces negative signals for overclaim", () => {
        const record = classifyPhilosophicalLanguage(
            "This proves that the literal mechanism of reality is governed by receipts."
        );
        expect(record.warnings.length).toBeGreaterThan(0);

        const polarity = extractPhilosophyPolaritySignals(record);
        expect(polarity.negative.length).toBeGreaterThan(0);
    });

    // ── Criterion 9: Does not canonize anything automatically ──
    it("never auto-canonizes", () => {
        const record = classifyPhilosophicalLanguage(
            "This should be canon, it is the fundamental truth."
        );
        expect(record.canonApproved).toBe(false);
        expect(record.evidenceCeiling).toBe("conceptual");
    });

    // ── Criterion 10: Output remains teaching-safe ──────────
    it("output remains teaching-safe", () => {
        const bounded = classifyPhilosophicalLanguage(
            "A philosophical thesis offers a conceptual lens for reflection, not a proof."
        );
        expect(bounded.publicSafe).toBe(true);

        const overclaim = classifyPhilosophicalLanguage(
            "This proves reality and guarantees truth as canonical fact."
        );
        expect(overclaim.publicSafe).toBe(false);
    });

    // ── Hash determinism ────────────────────────────────────
    it("produces deterministic hashes", () => {
        const a = hashText("test");
        const b = hashText("test");
        expect(a).toBe(b);
        expect(a.length).toBe(64);
    });

    // ── Overclaim guard ──────────────────────────────────────
    it("detectPhilosophyOverclaim flags proof and canon violations", () => {
        const warnings = detectPhilosophyOverclaim(
            "This proves that the analogy is identical. It should be canon."
        );
        expect(warnings).toContain("philosophical_claim_using_proof_language");
        expect(warnings).toContain("canon_status_without_receipt");
    });

    // ── Teaching explanation ─────────────────────────────────
    it("provides teaching explanations for all 5 topics", () => {
        for (const topic of [
            "why philosophy is not proof",
            "why analogy is not identity",
            "what makes a claim canon-ready",
            "what is a philosophical thesis",
            "why reflective language needs boundaries",
        ]) {
            const explanation = philosophyTeachingExplanation(topic);
            expect(explanation.length).toBeGreaterThan(50);
            expect(typeof explanation).toBe("string");
        }
    });

    // ── Non-philosophical text ──────────────────────────────
    it("does not classify non-philosophical text as philosophical", () => {
        const record = classifyPhilosophicalLanguage(
            "The function returns a number after incrementing by one."
        );
        expect(record.isPhilosophical).toBe(false);
    });
});