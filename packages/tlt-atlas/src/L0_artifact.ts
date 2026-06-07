// @cohbit/tlt-atlas — L0 Raw Language Artifact Layer
// Preserves original human language input before interpretation.
//
// Spec source: TLT Bilingual Language Atlas v0.2 §4
// Governing law:
//   The original phrase is evidence. Never overwrite it with interpretation.

import * as crypto from 'node:crypto';

// ─── Types ─────────────────────────────────────────────────────

/** The kind of language artifact being stored. */
export type LanguageArtifactType =
    | 'user_phrase'
    | 'spoken_transcript'
    | 'translation_request'
    | 'rewrite_request'
    | 'technical_instruction'
    | 'public_post'
    | 'internal_canon_note'
    | 'maintenance_note'
    | 'code_comment'
    | 'proof_comment'
    | 'copilot_command';

/** A preserved language artifact — the raw evidence. */
export interface LanguageArtifact {
    artifactId: string;
    sourceLanguage: string;
    artifactType: LanguageArtifactType;
    rawText: string;
    origin: string;
    artifactHash?: string | undefined;
    createdAt: string;
    status: 'stored';
}

/** Input for creating a LanguageArtifact. */
export interface CreateLanguageArtifactInput {
    sourceLanguage: string;
    artifactType: LanguageArtifactType;
    rawText: string;
    origin?: string | undefined;
}

// ─── Factories ─────────────────────────────────────────────────

let artifactCounter = 0;

/** Generate a unique language artifact ID. */
export function generateLanguageArtifactId(): string {
    artifactCounter += 1;
    return `LANG_ART_${String(artifactCounter).padStart(6, '0')}`;
}

/**
 * Create a LanguageArtifact from input.
 * Preserves the raw text exactly. Never mutates or interprets.
 * Computes a SHA-256 artifact hash for integrity tracking.
 */
export function createLanguageArtifact(input: CreateLanguageArtifactInput): LanguageArtifact {
    if (!input.sourceLanguage) {
        throw new Error('LanguageArtifact requires a sourceLanguage.');
    }
    if (!input.rawText || input.rawText.trim().length === 0) {
        throw new Error('LanguageArtifact requires non-empty rawText.');
    }

    return {
        artifactId: generateLanguageArtifactId(),
        sourceLanguage: input.sourceLanguage,
        artifactType: input.artifactType,
        rawText: input.rawText,
        origin: input.origin ?? 'manual_entry',
        artifactHash: hashLanguageArtifact(input.rawText),
        createdAt: new Date().toISOString(),
        status: 'stored',
    };
}

/** SHA-256 hash of the raw language artifact text. */
export function hashLanguageArtifact(text: string): string {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Validate that a language artifact has all required fields. */
export function isValidLanguageArtifact(artifact: LanguageArtifact): boolean {
    return (
        typeof artifact.artifactId === 'string' &&
        artifact.artifactId.length > 0 &&
        typeof artifact.sourceLanguage === 'string' &&
        artifact.sourceLanguage.length > 0 &&
        typeof artifact.artifactType === 'string' &&
        typeof artifact.rawText === 'string' &&
        artifact.rawText.length > 0 &&
        typeof artifact.origin === 'string' &&
        typeof artifact.createdAt === 'string'
    );
}

/** Valid language artifact types for validation. */
export const VALID_LANGUAGE_ARTIFACT_TYPES: Set<LanguageArtifactType> = new Set([
    'user_phrase',
    'spoken_transcript',
    'translation_request',
    'rewrite_request',
    'technical_instruction',
    'public_post',
    'internal_canon_note',
    'maintenance_note',
    'code_comment',
    'proof_comment',
    'copilot_command',
]);

/** Check if a given artifact type string is valid. */
export function isValidArtifactType(type: string): type is LanguageArtifactType {
    return VALID_LANGUAGE_ARTIFACT_TYPES.has(type as LanguageArtifactType);
}