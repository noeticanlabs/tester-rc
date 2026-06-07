// @cohbit/code-atlas — L0 Raw Code Artifact Layer
// Preserves original code artifacts before any interpretation.
//
// Spec source: Noetican Code Invariant Atlas v0.2 §A
// Governing law:
//   No artifact can enter later layers unless it has:
//   artifact_id, language, artifact_type, content_ref or inline content,
//   source_hash status, created_at, trust_level, origin, ingestion_status.

import * as crypto from 'node:crypto';

// ─── Types ─────────────────────────────────────────────────────

/** The kind of code artifact being stored. */
export type ArtifactKind =
    | 'code_snippet'
    | 'source_file'
    | 'repository_reference'
    | 'compiler_output'
    | 'error_trace';

/** Trust level of the artifact source. */
export type TrustLevel =
    | 'unverified_source'
    | 'user_paste'
    | 'generated_output'
    | 'trusted_repo'
    | 'repair_attempt';

/** Ingestion pipeline status. */
export type IngestionStatus =
    | 'stored'
    | 'indexed'
    | 'hash_verified'
    | 'pending';

/** A preserved code artifact — the evidence source. */
export interface CodeArtifact {
    artifactId: string;
    artifactKind: ArtifactKind;
    language: string;
    contentRef?: string | undefined;
    inlineContent?: string | undefined;
    sourceHash?: string | undefined;
    trustLevel: TrustLevel;
    origin: string;
    ingestionStatus: IngestionStatus;
    createdAt: string;
}

/** Input for creating a CodeArtifact. */
export interface CreateCodeArtifactInput {
    artifactKind: ArtifactKind;
    language: string;
    contentRef?: string | undefined;
    inlineContent?: string | undefined;
    trustLevel?: TrustLevel | undefined;
    origin?: string | undefined;
}

// ─── Factories ─────────────────────────────────────────────────

let artifactCounter = 0;

/** Generate a unique artifact ID. */
export function generateArtifactId(): string {
    artifactCounter += 1;
    return `ART-${String(artifactCounter).padStart(6, '0')}`;
}

/**
 * Create a CodeArtifact from input.
 * Computes a SHA-256 hash from inlineContent or leaves sourceHash undefined
 * for contentRef-only artifacts.
 */
export function createCodeArtifact(input: CreateCodeArtifactInput): CodeArtifact {
    if (!input.language) {
        throw new Error('CodeArtifact requires a language.');
    }
    if (!input.contentRef && !input.inlineContent) {
        throw new Error('CodeArtifact requires contentRef or inlineContent.');
    }

    const sourceHash = input.inlineContent
        ? hashArtifactContent(input.inlineContent)
        : undefined;

    return {
        artifactId: generateArtifactId(),
        artifactKind: input.artifactKind,
        language: input.language,
        contentRef: input.contentRef,
        inlineContent: input.inlineContent,
        sourceHash,
        trustLevel: input.trustLevel ?? 'unverified_source',
        origin: input.origin ?? 'manual_entry',
        ingestionStatus: 'stored',
        createdAt: new Date().toISOString(),
    };
}

/** SHA-256 hash of artifact content. */
export function hashArtifactContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Validate that an artifact has all required base fields. */
export function isValidArtifact(artifact: CodeArtifact): boolean {
    return (
        typeof artifact.artifactId === 'string' &&
        artifact.artifactId.length > 0 &&
        typeof artifact.language === 'string' &&
        artifact.language.length > 0 &&
        typeof artifact.artifactKind === 'string' &&
        typeof artifact.trustLevel === 'string' &&
        typeof artifact.origin === 'string' &&
        typeof artifact.ingestionStatus === 'string' &&
        typeof artifact.createdAt === 'string'
    );
}