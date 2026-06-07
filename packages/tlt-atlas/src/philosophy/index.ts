
// CohBit-Copilot v14.1 — Philosophy Submodule
// TLT Atlas Layer 17: Philosophical Language classification and governance.
//
// Operating Law:
//   Philosophy may guide attention before it may govern commitment.

export {
    classifyPhilosophicalLanguage,
    hashText,
    type PhilosophicalLanguageRecord,
    type PhilosophyLanguageMode,
    type PhilosophyTruthStatus,
    type PhilosophyClaimType,
} from "./L17_philosophical_language.js";

export { detectPhilosophyOverclaim } from "./philosophy_guards.js";

export {
    extractPhilosophyPolaritySignals,
    type PhilosophyPolaritySignal,
    type PhilosophyPolarityResult,
} from "./philosophy_polarity.js";

export {
    PHILOSOPHY_TEACHING_TOPICS,
    philosophyTeachingExplanation,
    type PhilosophyTeachingTopic,
} from "./philosophy_teaching.js";