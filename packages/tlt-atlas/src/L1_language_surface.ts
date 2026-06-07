// @cohbit/tlt-atlas — L1 Language Surface Layer
// Identifies the visible language form of human language input.
//
// Spec source: TLT Bilingual Language Atlas v0.2 §5
// Governing law:
//   Surface fluency ≠ meaning certainty.
//   Representation type does not determine proof status.

// ─── Types ─────────────────────────────────────────────────────

/** Language mode categories — how language is being used. */
export type LanguageMode =
    | 'english'
    | 'spanish'
    | 'english_spanish_mixed'
    | 'plain_english'
    | 'technical_english'
    | 'academic_english'
    | 'maintenance_english'
    | 'public_facing_english'
    | 'internal_noetican_language'
    | 'copilot_instruction_language';

/** Register — the social/contextual tone of language use. */
export type Register =
    | 'casual_command'
    | 'formal_request'
    | 'technical_explanation'
    | 'academic_prose'
    | 'field_directive'
    | 'public_statement'
    | 'internal_notation'
    | 'mentor_guidance'
    | 'urgent_warning'
    | 'clarification_request';

/** A language surface record describing the visible form. */
export interface LanguageSurfaceRecord {
    surfaceId: string;
    artifactId: string;
    detectedLanguage: string;
    languageMode: LanguageMode;
    surfaceText: string;
    register: Register;
    codeSwitching: boolean;
    spellingNoise: boolean;
    possibleAmbiguity: boolean;
    status: 'detected';
}

// ─── Language Mode Registry ────────────────────────────────────

/** Descriptions for each language mode. */
export const LANGUAGE_MODE_DESCRIPTIONS: Record<LanguageMode, string> = {
    english: 'Standard English with no specific domain framing.',
    spanish: 'Standard Spanish with no specific domain framing.',
    english_spanish_mixed: 'Code-switched or mixed English-Spanish text.',
    plain_english: 'Simplified, accessible English without technical jargon.',
    technical_english: 'Domain-specific technical English (code, math, systems).',
    academic_english: 'Formal academic register with citations and precise terminology.',
    maintenance_english: 'Field/maintenance language — practical, procedural, safety-aware.',
    public_facing_english: 'Language intended for public audiences (LinkedIn, blog, press).',
    internal_noetican_language: 'Noetican Labs internal terminology (CohBit, CTRL, TTC, etc.).',
    copilot_instruction_language: 'Commands and instructions directed at CohBit-copilot.',
};

/** All valid language modes. */
export const VALID_LANGUAGE_MODES: Set<LanguageMode> = new Set(
    Object.keys(LANGUAGE_MODE_DESCRIPTIONS) as LanguageMode[]
);

// ─── Register Descriptions ─────────────────────────────────────

/** Descriptions for each register. */
export const REGISTER_DESCRIPTIONS: Record<Register, string> = {
    casual_command: 'Brief, direct imperative or request.',
    formal_request: 'Polite, structured request with context.',
    technical_explanation: 'Precise explanation of a technical concept or system.',
    academic_prose: 'Formal academic writing with structured argument.',
    field_directive: 'Practical work instruction directed at a specific task.',
    public_statement: 'Statement intended for broad public or professional audience.',
    internal_notation: 'Shorthand or technical notation for internal team use.',
    mentor_guidance: 'Supportive, educational tone guiding learning or correction.',
    urgent_warning: 'Time-sensitive or safety-critical alert.',
    clarification_request: 'Question or request for more precise information.',
};

/** All valid registers. */
export const VALID_REGISTERS: Set<Register> = new Set(
    Object.keys(REGISTER_DESCRIPTIONS) as Register[]
);

// ─── Factory ───────────────────────────────────────────────────

let surfaceCounter = 0;

/** Generate a unique surface record ID. */
export function generateSurfaceId(): string {
    surfaceCounter += 1;
    return `SURF_${String(surfaceCounter).padStart(6, '0')}`;
}

/**
 * Create a LanguageSurfaceRecord from an artifact and detection results.
 */
export function createLanguageSurfaceRecord(params: {
    artifactId: string;
    detectedLanguage: string;
    languageMode: LanguageMode;
    surfaceText: string;
    register: Register;
    codeSwitching?: boolean;
    spellingNoise?: boolean;
    possibleAmbiguity?: boolean;
}): LanguageSurfaceRecord {
    return {
        surfaceId: generateSurfaceId(),
        artifactId: params.artifactId,
        detectedLanguage: params.detectedLanguage,
        languageMode: params.languageMode,
        surfaceText: params.surfaceText,
        register: params.register,
        codeSwitching: params.codeSwitching ?? false,
        spellingNoise: params.spellingNoise ?? false,
        possibleAmbiguity: params.possibleAmbiguity ?? false,
        status: 'detected',
    };
}

/** Check if a string is a valid language mode. */
export function isValidLanguageMode(mode: string): mode is LanguageMode {
    return VALID_LANGUAGE_MODES.has(mode as LanguageMode);
}

/** Check if a string is a valid register. */
export function isValidRegister(register: string): register is Register {
    return VALID_REGISTERS.has(register as Register);
}