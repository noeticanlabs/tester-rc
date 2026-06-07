// @cohbit/code-atlas v0.1.0 — L0 Artifact Tests
// Verifies CodeArtifact creation, hashing, and validation.

import { describe, it, expect } from 'vitest';
import {
    createCodeArtifact,
    generateArtifactId,
    hashArtifactContent,
    isValidArtifact,
    type CodeArtifact,
    type ArtifactKind,
    type TrustLevel,
} from '../src/L0_artifact.js';

// ═══════════════════════════════════════════════════════════════
// Artifact Creation
// ═══════════════════════════════════════════════════════════════
describe('v0.1 — Code Artifact Creation', () => {
    it('creates a code artifact with all required fields', () => {
        const artifact = createCodeArtifact({
            artifactKind: 'code_snippet',
            language: 'python',
            inlineContent: 'def safe_div(a, b):\n    return None if b == 0 else a / b',
        });

        expect(artifact.artifactId).toMatch(/^ART-\d{6}$/);
        expect(artifact.artifactKind).toBe('code_snippet');
        expect(artifact.language).toBe('python');
        expect(artifact.inlineContent).toBeDefined();
        expect(artifact.sourceHash).toBeDefined();
        expect(artifact.sourceHash).toHaveLength(64);
        expect(artifact.trustLevel).toBe('unverified_source');
        expect(artifact.origin).toBe('manual_entry');
        expect(artifact.ingestionStatus).toBe('stored');
        expect(artifact.createdAt).toBeDefined();
    });

    it('accepts custom trust level and origin', () => {
        const artifact = createCodeArtifact({
            artifactKind: 'source_file',
            language: 'rust',
            contentRef: 'src/lib.rs',
            trustLevel: 'trusted_repo',
            origin: 'github_clone',
        });

        expect(artifact.trustLevel).toBe('trusted_repo');
        expect(artifact.origin).toBe('github_clone');
        expect(artifact.contentRef).toBe('src/lib.rs');
    });

    it('contentRef-only artifact has no sourceHash', () => {
        const artifact = createCodeArtifact({
            artifactKind: 'repository_reference',
            language: 'typescript',
            contentRef: 'https://github.com/example/repo',
        });

        expect(artifact.contentRef).toBeDefined();
        expect(artifact.sourceHash).toBeUndefined();
    });

    it('rejects artifact without language', () => {
        expect(() =>
            createCodeArtifact({
                artifactKind: 'code_snippet' as ArtifactKind,
                language: '',
                inlineContent: 'code',
            })
        ).toThrow('CodeArtifact requires a language');
    });

    it('rejects artifact without contentRef or inlineContent', () => {
        expect(() =>
            createCodeArtifact({
                artifactKind: 'code_snippet' as ArtifactKind,
                language: 'python',
            })
        ).toThrow('CodeArtifact requires contentRef or inlineContent');
    });
});

// ═══════════════════════════════════════════════════════════════
// Hashing
// ═══════════════════════════════════════════════════════════════
describe('v0.1 — Artifact Hashing', () => {
    it('hash is deterministic for same content', () => {
        const h1 = hashArtifactContent('const x = 1;');
        const h2 = hashArtifactContent('const x = 1;');
        expect(h1).toBe(h2);
    });

    it('hash differs for different content', () => {
        const h1 = hashArtifactContent('const x = 1;');
        const h2 = hashArtifactContent('const x = 2;');
        expect(h1).not.toBe(h2);
    });

    it('hash is 64 hex characters', () => {
        const hash = hashArtifactContent('hello');
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
});

// ═══════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════
describe('v0.1 — Artifact Validation', () => {
    it('valid artifact passes validation', () => {
        const artifact = createCodeArtifact({
            artifactKind: 'code_snippet',
            language: 'lean',
            inlineContent: 'def safe_div : ℚ → ℚ → Option ℚ',
        });

        expect(isValidArtifact(artifact)).toBe(true);
    });

    it('artifact IDs are unique across creations', () => {
        const a1 = createCodeArtifact({
            artifactKind: 'code_snippet',
            language: 'python',
            inlineContent: 'x = 1',
        });
        const a2 = createCodeArtifact({
            artifactKind: 'code_snippet',
            language: 'python',
            inlineContent: 'x = 2',
        });

        expect(a1.artifactId).not.toBe(a2.artifactId);
    });
});