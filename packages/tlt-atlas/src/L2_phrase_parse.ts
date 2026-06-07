// @cohbit/tlt-atlas — L2 Phrase / Syntax Parse Layer
// Breaks language input into structural components.
//
// Spec source: TLT Bilingual Language Atlas v0.2 §6
// Governing law:
//   Parsing structure does not prove meaning.
//   Missing referents and missing context must be declared.

// ─── Types ─────────────────────────────────────────────────────

/** The grammatical/functional type of a phrase. */
export type PhraseType =
    | 'imperative'
    | 'question'
    | 'definition'
    | 'warning'
    | 'request'
    | 'refusal'
    | 'permission'
    | 'prohibition'
    | 'clarification'
    | 'translation_request'
    | 'unknown';

/** Parse status of a phrase. */
export type ParseStatus =
    | 'parsed'
    | 'parsed_with_ambiguity'
    | 'unparseable';

/** Structural breakdown of a parsed phrase. */
export interface PhraseStructure {
    verb?: string | undefined;
    object?: string | undefined;
    targetQuality?: string | undefined;
    subject?: string | undefined;
    qualifiers?: string[] | undefined;
}

/** A phrase parse record — structural interpretation of language input. */
export interface PhraseParse {
    parseId: string;
    artifactId: string;
    phraseType: PhraseType;
    tokens: string[];
    structure: PhraseStructure;
    missingReferents: string[];
    missingContext: string[];
    parseStatus: ParseStatus;
    createdAt: string;
}

// ─── Validators ────────────────────────────────────────────────

/** All recognized phrase types. */
export const VALID_PHRASE_TYPES: Set<PhraseType> = new Set([
    'imperative',
    'question',
    'definition',
    'warning',
    'request',
    'refusal',
    'permission',
    'prohibition',
    'clarification',
    'translation_request',
    'unknown',
]);

/** Check if a string is a valid phrase type. */
export function isValidPhraseType(type: string): type is PhraseType {
    return VALID_PHRASE_TYPES.has(type as PhraseType);
}

// ─── Factory ───────────────────────────────────────────────────

let phraseParseCounter = 0;

/** Generate a unique phrase parse ID. */
export function generatePhraseParseId(): string {
    phraseParseCounter += 1;
    return `LPARSE_${String(phraseParseCounter).padStart(6, '0')}`;
}

/**
 * Create a PhraseParse from an artifact and parse results.
 */
export function createPhraseParse(params: {
    artifactId: string;
    phraseType: PhraseType;
    tokens: string[];
    structure?: PhraseStructure | undefined;
    missingReferents?: string[] | undefined;
    missingContext?: string[] | undefined;
    parseStatus?: ParseStatus | undefined;
}): PhraseParse {
    const ambiguity = (params.missingReferents?.length ?? 0) > 0 ||
        (params.missingContext?.length ?? 0) > 0;

    return {
        parseId: generatePhraseParseId(),
        artifactId: params.artifactId,
        phraseType: params.phraseType,
        tokens: params.tokens,
        structure: params.structure ?? {},
        missingReferents: params.missingReferents ?? [],
        missingContext: params.missingContext ?? [],
        parseStatus: params.parseStatus ?? (ambiguity ? 'parsed_with_ambiguity' : 'parsed'),
        createdAt: new Date().toISOString(),
    };
}

/**
 * Example: parse the canonical "Make it safe." phrase.
 * Returns a parse demonstrating missing referents and ambiguity.
 */
export function createMakeItSafeParse(artifactId: string): PhraseParse {
    return createPhraseParse({
        artifactId,
        phraseType: 'imperative',
        tokens: ['Make', 'it', 'safe'],
        structure: {
            verb: 'make',
            object: 'it',
            targetQuality: 'safe',
        },
        missingReferents: ['it'],
        missingContext: ['safety_domain'],
        parseStatus: 'parsed_with_ambiguity',
    });
}

/**
 * Basic tokenization: splits on whitespace, preserves case.
 * This is a minimal tokenizer suitable for the phrase parse layer.
 */
export function tokenize(text: string): string[] {
    return text.split(/\s+/).filter(t => t.length > 0);
}