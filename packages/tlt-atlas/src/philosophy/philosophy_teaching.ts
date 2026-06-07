// CohBit-Copilot v14.1 — Philosophy Teaching Topics
// Teaching integration: topics and explanatory content for philosophical language.
//
// Operating Law:
//   Teaching topics frame philosophical concepts for reflective learning.
//   They do not assert truth, make commitments, or authorize claims.
//   All teaching output is advisory and conceptual.

export const PHILOSOPHY_TEACHING_TOPICS = [
    "why philosophy is not proof",
    "why analogy is not identity",
    "what makes a claim canon-ready",
    "what is a philosophical thesis",
    "why reflective language needs boundaries",
] as const;

export type PhilosophyTeachingTopic = (typeof PHILOSOPHY_TEACHING_TOPICS)[number];

export function philosophyTeachingExplanation(topic: string): string {
    const t = topic.toLowerCase();

    if (t.includes("proof")) {
        return "A philosophical claim is a candidate way of seeing. It may help frame meaning, but it does not become truth, proof, implementation, or canon without stronger evidence.";
    }

    if (t.includes("analogy") && t.includes("identity")) {
        return "An analogy explains structure by comparing things. It does not mean they are identical. Analogy is a reflective tool for understanding, not a logical claim about sameness.";
    }

    if (t.includes("canon")) {
        return "A philosophical claim becomes a canon candidate only when it has a clear definition, explicit boundary, objection handling, evidence status, and a receipt-bearing admission review.";
    }

    if (t.includes("thesis")) {
        return "A philosophical thesis is a proposed way of understanding or interpreting something. It is a conceptual lens, not a factual statement. Theses are debated; they are not proven.";
    }

    if (t.includes("boundary") || t.includes("reflective")) {
        return "Reflective language helps us think about meaning, ask questions, and frame possibilities. But reflection is not governance. Philosophy may guide attention, but it may not commit actions or authorize changes.";
    }

    return "Philosophy is disciplined reflection over meaning. It may form concepts, expose assumptions, and guide inquiry. It may not certify truth, prove claims, authorize action, or become canon without receipt-bearing admission.";
}