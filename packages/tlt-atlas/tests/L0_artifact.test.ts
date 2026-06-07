// @cohbit/tlt-atlas v0.1.0 — L0 Artifact Tests
// Verifies LanguageArtifact creation, hashing, and validation.

import { describe, it, expect } from 'vitest';
import {
    createLanguageArtifact,
    generateLanguageArtifactId,
    hashLanguageArtifact,
    isValidLanguageArtifact,
    isValidArtifactType,
    VALID_LANGUAGE_ARTIFACT_TYPES,
    type LanguageArtifact,
    type LanguageArtifactType,
} from '../src/L0_artifact.js';

// ═══════════════════════════════════════════════════════════════
// Artifact Creation
// ═══════════════════════════════════════════════════════════════
describe('v0.1 — Language Artifact Creation', () => {
    it('creates a language artifact with all required fields', () => {
        const artifact = createLanguageArtifact({
            sourceLanguage: 'english',
            artifactType: 'user_phrase',
            rawText: 'Make it safe.',
        });

        expect(artifact.artifactId).toMatch(/^LANG_ART_\d{6}$/);
        expect(artifact.sourceLanguage).toBe('english');
        expect(artifact.artifactType).toBe('user_phrase');
        expect(artifact.rawText).toBe('Make it safe.');
        expect(artifact.origin).toBe('manual_entry');
        expect(artifact.artifactHash).toBeDefined();
        expect(artifact.artifactHash).toHaveLength(64);
        expect(artifact.createdAt).toBeDefined();
        expect(artifact.status).toBe('stored');
    });

    it('preserves raw text exactly without mutation', () => {
        const text = '  Make it SAFE!  \nWith extra whitespace.  ';
        const artifact = createLanguageArtifact({
            sourceLanguage: 'english',
            artifactType: 'user_phrase',
            rawText: text,
        });

        expect(artifact.rawText).toBe(text);
    });

    it('accepts custom origin', () => {
        const artifact = createLanguageArtifact({
            sourceLanguage: 'spanish',
            artifactType: 'translation_request',
            rawText: 'Hazlo seguro.',
            origin: 'user_interface',
        });

        expect(artifact.origin).toBe('user_interface');
    });

    it('rejects empty raw text', () => {
        expect(() =>
            createLanguageArtifact({
                sourceLanguage: 'english',
                artifactType: 'user_phrase',
                rawText: '',
            })
        ).toThrow('LanguageArtifact requires non-empty rawText');
    });

    it('rejects whitespace-only raw text', () => {
        expect(() =>
            createLanguageArtifact({
                sourceLanguage: 'english',
                artifactType: 'user_phrase',
                rawText: '   ',
            })
        ).toThrow('LanguageArtifact requires non-empty rawText');
    });

    it('rejects artifact without sourceLanguage', () => {
        expect(() =>
            createLanguageArtifact({
                sourceLanguage: '',
                artifactType: 'user_phrase',
                rawText: 'Hello',
            })
        ).toThrow('LanguageArtifact requires a sourceLanguage');
    });
});

// ═══════════════════════════════════════════════════════════════
// Hashing
// ═══════════════════════════════════════════════════════════════
describe('v0.1 — Language Artifact Hashing', () => {
    it('hash is deterministic for same text', () => {
        const h1 = hashLanguageArtifact('Make it safe.');
        const h2 = hashLanguageArtifact('Make it safe.');
        expect(h1).toBe(h2);
    });

    it('hash differs for different text', () => {
        const h1 = hashLanguageArtifact('Make it safe.');
        const h2 = hashLanguageArtifact('Make it safer.');
        expect(h1).not.toBe(h2);
    });

    it('hash is 64 hex characters', () => {
        const hash = hashLanguageArtifact('Hola mundo');
        expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
});

// ═══════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════
describe('v0.1 — Language Artifact Validation', () => {
    it('valid artifact passes validation', () => {
        const artifact = createLanguageArtifact({
            sourceLanguage: 'english',
            artifactType: 'technical_instruction',
            rawText: 'Modify the function to reduce risk without losing main function.',
        });

        expect(isValidLanguageArtifact(artifact)).toBe(true);
    });

    it('artifact IDs are unique across creations', () => {
        const a1 = createLanguageArtifact({
            sourceLanguage: 'english',
            artifactType: 'user_phrase',
            rawText: 'Hello',
        });
        const a2 = createLanguageArtifact({
            sourceLanguage: 'english',
            artifactType: 'user_phrase',
            rawText: 'World',
        });

        expect(a1.artifactId).not.toBe(a2.artifactId);
    });
});

// ═══════════════════════════════════════════════════════════════
// Artifact Type Validation
// ═══════════════════════════════════════════════════════════════
describe('v0.1 — Artifact Type Registry', () => {
    it('all 11 artifact types are in the valid set', () => {
        const expected: LanguageArtifactType[] = [
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
        ];
        expect(VALID_LANGUAGE_ARTIFACT_TYPES.size).toBe(11);
        for (const t of expected) {
            expect(VALID_LANGUAGE_ARTIFACT_TYPES.has(t)).toBe(true);
        }
    });

    it('isValidArtifactType returns true for valid types', () => {
        expect(isValidArtifactType('user_phrase')).toBe(true);
        expect(isValidArtifactType('copilot_command')).toBe(true);
        expect(isValidArtifactType('translation_request')).toBe(true);
    });

    it('isValidArtifactType returns false for invalid types', () => {
        expect(isValidArtifactType('invalid_type')).toBe(false);
        expect(isValidArtifactType('')).toBe(false);
        expect(isValidArtifactType('arbitrary_string')).toBe(false);
    });
});