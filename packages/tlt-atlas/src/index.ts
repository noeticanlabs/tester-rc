// @cohbit/tlt-atlas — TLT Bilingual Language Atlas (v10.3)
// Governed bilingual meaning-memory layer for CohBit-Copilot.
//
// Boundary rule:
//   Atlas packages classify, map, and retrieve structure.
//   They do not authorize, mutate, apply, verify final state,
//   rollback, receipt, or commit.
//
// Version: 0.0.0 — scaffolding

export const ATLAS_NAME = '@cohbit/tlt-atlas';
export const ATLAS_VERSION = '1.5.0';
export const ATLAS_KIND = 'tlt-atlas';

// Layer exports (spec v0.1 mapped to crate v0.1+)
export {
    type LanguageArtifact,
    type LanguageArtifactType,
    type CreateLanguageArtifactInput,
    createLanguageArtifact,
    generateLanguageArtifactId,
    hashLanguageArtifact,
    isValidLanguageArtifact,
    isValidArtifactType,
    VALID_LANGUAGE_ARTIFACT_TYPES,
} from './L0_artifact.js';

export {
    type LanguageMode,
    type Register,
    type LanguageSurfaceRecord,
    LANGUAGE_MODE_DESCRIPTIONS,
    VALID_LANGUAGE_MODES,
    REGISTER_DESCRIPTIONS,
    VALID_REGISTERS,
    createLanguageSurfaceRecord,
    generateSurfaceId,
    isValidLanguageMode,
    isValidRegister,
} from './L1_language_surface.js';

export {
    type PhraseType,
    type ParseStatus,
    type PhraseStructure,
    type PhraseParse,
    VALID_PHRASE_TYPES,
    isValidPhraseType,
    createPhraseParse,
    generatePhraseParseId,
    createMakeItSafeParse,
    tokenize,
} from './L2_phrase_parse.js';

export {
    type SemanticUnit,
    type SemanticRecord,
    SEMANTIC_UNITS,
    getSemanticUnit,
    createSemanticRecord,
    createMakeItSafeSemanticRecord,
} from './L3_semantic_unit.js';

export {
    type IntentConfidence,
    type IntentClass,
    type IntentRecord,
    INTENT_CLASSES,
    getIntentClass,
    createIntentRecord,
    createMakeItSafeIntentRecord,
} from './L4_intent.js';

export {
    type MeaningInvariant, MEANING_INVARIANTS, getMeaningInvariant, listReceiptRequired,
} from './L5_meaning_invariant.js';

// Layer modules to be added sequentially:
export { type ToneCategory, type ToneProfile, TONE_PROFILES, getToneProfile } from './L6_tone_register.js';
export { type Domain, type DomainProfile, DOMAIN_PROFILES, getDomainProfile } from './L7_domain_context.js';
export { type ProjectionType, type ProjectionStatus as BilingualProjectionStatus, type BilingualProjection, BILINGUAL_PROJECTIONS, getProjectionsByStatus, getAcceptedProjections } from './L8_bilingual_projection.js';
export { type RiskSeverity, type AmbiguityRisk, AMBIGUITY_RISKS, getAmbiguityRisk, listBySeverity } from './L9_ambiguity_risk.js';
export { type LangEvidenceLevel, type LangVerifierRoute, LANG_VERIFIER_ROUTES, LANG_EVIDENCE_LADDER } from './L10_verifier.js';
export { type LangReceiptStatus, type LanguageReceiptRecord, createLanguageReceipt } from './L11_receipt.js';
export { type BilingualRepairType, type BilingualRepairStatus, type BilingualRepairRecord, BILINGUAL_REPAIR_TYPES, createBilingualRepair } from './L12_repair.js';
export { type LangMemoryEdgeType, type LangMemoryEdge, type LangMemoryGraph, createLangMemoryGraph } from './L13_memory_graph.js';
export { type BilingualRetrievalResult, createRetrievalResult } from './L14_retrieval.js';
export { type LangGovernanceRecord, FORBIDDEN_LANG_COLLAPSES, createLangGovernanceRecord } from './L15_governance.js';

// ─── v14.1 Philosophy Submodule ─────────────────────────────────
export {
    classifyPhilosophicalLanguage,
    hashText as philosophyHashText,
    detectPhilosophyOverclaim,
    extractPhilosophyPolaritySignals,
    PHILOSOPHY_TEACHING_TOPICS,
    philosophyTeachingExplanation,
} from './philosophy/index.js';
export type {
    PhilosophicalLanguageRecord,
    PhilosophyLanguageMode,
    PhilosophyTruthStatus,
    PhilosophyClaimType,
    PhilosophyPolaritySignal,
    PhilosophyPolarityResult,
    PhilosophyTeachingTopic,
} from './philosophy/index.js';
