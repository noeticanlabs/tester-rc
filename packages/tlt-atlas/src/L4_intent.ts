// @cohbit/tlt-atlas — L4 Intent Classification Layer
// Determines what the speaker is trying to accomplish.
//
// Spec source: TLT Bilingual Language Atlas v0.2 §L4
// Governing law:
//   Intent classification is not meaning certainty.
//   It is a structured guess with declared confidence.

// ─── Types ─────────────────────────────────────────────────────

export type IntentConfidence = number; // 0.0 to 1.0

export interface IntentClass {
    intentId: string;
    name: string;
    definition: string;
}

export interface IntentRecord {
    intentRecordId: string;
    artifactId: string;
    primaryIntent: string;
    secondaryIntents: string[];
    confidence: IntentConfidence;
    ambiguity: string;
    status: 'intent_candidate';
    createdAt: string;
}

// ─── Intent Registry (INTENT_001–INTENT_015) ───────────────────

export const INTENT_001: IntentClass = {
    intentId: 'INTENT_001', name: 'Translate',
    definition: 'The speaker wants a phrase or concept expressed in another language.',
};

export const INTENT_002: IntentClass = {
    intentId: 'INTENT_002', name: 'ExplainSimply',
    definition: 'The speaker wants a concept explained in accessible, plain language.',
};

export const INTENT_003: IntentClass = {
    intentId: 'INTENT_003', name: 'ExplainTechnically',
    definition: 'The speaker wants a precise technical explanation with appropriate terminology.',
};

export const INTENT_004: IntentClass = {
    intentId: 'INTENT_004', name: 'RewriteTone',
    definition: 'The speaker wants the same meaning expressed with a different tone, register, or formality level.',
};

export const INTENT_005: IntentClass = {
    intentId: 'INTENT_005', name: 'MakePublicSafe',
    definition: 'The speaker wants language reviewed for public-audience safety, avoiding overclaim or internal terminology leak.',
};

export const INTENT_006: IntentClass = {
    intentId: 'INTENT_006', name: 'MakeClaimAccurate',
    definition: 'The speaker wants a claim strengthened, weakened, or qualified to match its evidence level.',
};

export const INTENT_007: IntentClass = {
    intentId: 'INTENT_007', name: 'CreateInstruction',
    definition: 'The speaker wants a step-by-step procedural or instructional output.',
};

export const INTENT_008: IntentClass = {
    intentId: 'INTENT_008', name: 'RepairLanguage',
    definition: 'The speaker wants language corrected, clarified, or improved while preserving original intent.',
};

export const INTENT_009: IntentClass = {
    intentId: 'INTENT_009', name: 'AskClarifyingQuestion',
    definition: 'The speaker or system needs to ask a question to resolve ambiguity before proceeding.',
};

export const INTENT_010: IntentClass = {
    intentId: 'INTENT_010', name: 'ConvertToProcedure',
    definition: 'The speaker wants natural language converted into a structured procedure or workflow.',
};

export const INTENT_011: IntentClass = {
    intentId: 'INTENT_011', name: 'ConvertToCodeInstruction',
    definition: 'The speaker wants natural language translated into a code-level instruction or patch.',
};

export const INTENT_012: IntentClass = {
    intentId: 'INTENT_012', name: 'ConvertToProofInstruction',
    definition: 'The speaker wants natural language translated into a proof obligation or formal specification.',
};

export const INTENT_013: IntentClass = {
    intentId: 'INTENT_013', name: 'PreserveMeaningAcrossLanguage',
    definition: 'The speaker wants meaning preserved through translation, not just word-for-word mapping.',
};

export const INTENT_014: IntentClass = {
    intentId: 'INTENT_014', name: 'DetectAmbiguity',
    definition: 'The speaker wants ambiguous language identified and flagged before interpretation.',
};

export const INTENT_015: IntentClass = {
    intentId: 'INTENT_015', name: 'PreventOverclaim',
    definition: 'The speaker wants language checked to ensure it does not assert more than evidence supports.',
};

// ─── Registry ──────────────────────────────────────────────────

export const INTENT_CLASSES: Map<string, IntentClass> = new Map([
    ['INTENT_001', INTENT_001], ['INTENT_002', INTENT_002], ['INTENT_003', INTENT_003],
    ['INTENT_004', INTENT_004], ['INTENT_005', INTENT_005], ['INTENT_006', INTENT_006],
    ['INTENT_007', INTENT_007], ['INTENT_008', INTENT_008], ['INTENT_009', INTENT_009],
    ['INTENT_010', INTENT_010], ['INTENT_011', INTENT_011], ['INTENT_012', INTENT_012],
    ['INTENT_013', INTENT_013], ['INTENT_014', INTENT_014], ['INTENT_015', INTENT_015],
]);

export function getIntentClass(id: string): IntentClass | undefined {
    return INTENT_CLASSES.get(id);
}

// ─── Factory ───────────────────────────────────────────────────

let intentCounter = 0;

function generateIntentRecordId(): string {
    intentCounter += 1;
    return `INTREC_${String(intentCounter).padStart(6, '0')}`;
}

export function createIntentRecord(params: {
    artifactId: string;
    primaryIntent: string;
    secondaryIntents?: string[];
    confidence?: IntentConfidence;
    ambiguity?: string;
}): IntentRecord {
    return {
        intentRecordId: generateIntentRecordId(),
        artifactId: params.artifactId,
        primaryIntent: params.primaryIntent,
        secondaryIntents: params.secondaryIntents ?? [],
        confidence: params.confidence ?? 0.5,
        ambiguity: params.ambiguity ?? 'Intent classification pending further context.',
        status: 'intent_candidate',
        createdAt: new Date().toISOString(),
    };
}

/**
 * Canonical example: classify the intent of "Make it safe."
 */
export function createMakeItSafeIntentRecord(artifactId: string): IntentRecord {
    return createIntentRecord({
        artifactId,
        primaryIntent: 'INTENT_008',
        secondaryIntents: ['INTENT_006', 'INTENT_014'],
        confidence: 0.74,
        ambiguity: 'The phrase does not specify what kind of safety is intended.',
    });
}