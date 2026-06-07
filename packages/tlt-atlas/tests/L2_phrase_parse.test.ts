// @cohbit/tlt-atlas v0.3.0 — L2 Phrase Parse Tests
// Verifies phrase parse creation, tokenization, phrase type validation, and missing referent detection.

import { describe, it, expect } from 'vitest';
import {
    createPhraseParse, isValidPhraseType, createMakeItSafeParse, tokenize,
    VALID_PHRASE_TYPES,
    type PhraseParse, type PhraseType, type ParseStatus,
} from '../src/L2_phrase_parse.js';

describe('v0.3 — Phrase Type Registry', () => {
    it('has 11 phrase types registered', () => {
        expect(VALID_PHRASE_TYPES.size).toBe(11);
    });

    it('isValidPhraseType returns true for valid types', () => {
        expect(isValidPhraseType('imperative')).toBe(true);
        expect(isValidPhraseType('question')).toBe(true);
        expect(isValidPhraseType('warning')).toBe(true);
        expect(isValidPhraseType('translation_request')).toBe(true);
        expect(isValidPhraseType('unknown')).toBe(true);
    });

    it('isValidPhraseType returns false for invalid types', () => {
        expect(isValidPhraseType('greeting')).toBe(false);
        expect(isValidPhraseType('')).toBe(false);
    });
});

describe('v0.3 — Phrase Parse Creation', () => {
    it('creates a phrase parse with all required fields', () => {
        const parse = createPhraseParse({
            artifactId: 'LANG_ART_000001',
            phraseType: 'imperative',
            tokens: ['Make', 'it', 'safe'],
            structure: { verb: 'make', object: 'it', targetQuality: 'safe' },
            missingReferents: ['it'],
            missingContext: ['safety_domain'],
        });

        expect(parse.parseId).toMatch(/^LPARSE_\d{6}$/);
        expect(parse.artifactId).toBe('LANG_ART_000001');
        expect(parse.phraseType).toBe('imperative');
        expect(parse.tokens).toEqual(['Make', 'it', 'safe']);
        expect(parse.structure.verb).toBe('make');
        expect(parse.structure.object).toBe('it');
        expect(parse.structure.targetQuality).toBe('safe');
        expect(parse.missingReferents).toContain('it');
        expect(parse.missingContext).toContain('safety_domain');
        expect(parse.parseStatus).toBe('parsed_with_ambiguity');
        expect(parse.createdAt).toBeDefined();
    });

    it('marks parse as "parsed" when no missing referents or context', () => {
        const parse = createPhraseParse({
            artifactId: 'LANG_ART_000002',
            phraseType: 'definition',
            tokens: ['A', 'function', 'is', 'a', 'callable', 'unit'],
            structure: { subject: 'function' },
        });

        expect(parse.parseStatus).toBe('parsed');
        expect(parse.missingReferents).toEqual([]);
        expect(parse.missingContext).toEqual([]);
    });

    it('allows explicit ParseStatus override', () => {
        const parse = createPhraseParse({
            artifactId: 'LANG_ART_000003',
            phraseType: 'question',
            tokens: ['What', 'is', 'this?'],
            parseStatus: 'unparseable',
        });

        expect(parse.parseStatus).toBe('unparseable');
    });

    it('generates unique parse IDs', () => {
        const p1 = createPhraseParse({ artifactId: 'A1', phraseType: 'imperative', tokens: ['Go'] });
        const p2 = createPhraseParse({ artifactId: 'A2', phraseType: 'imperative', tokens: ['Stop'] });

        expect(p1.parseId).not.toBe(p2.parseId);
    });
});

describe('v0.3 — Make It Safe Canonical Parse', () => {
    it('produces the canonical parse for "Make it safe."', () => {
        const parse = createMakeItSafeParse('LANG_ART_000004');

        expect(parse.phraseType).toBe('imperative');
        expect(parse.tokens).toEqual(['Make', 'it', 'safe']);
        expect(parse.structure.verb).toBe('make');
        expect(parse.structure.object).toBe('it');
        expect(parse.structure.targetQuality).toBe('safe');
        expect(parse.missingReferents).toContain('it');
        expect(parse.missingContext).toContain('safety_domain');
        expect(parse.parseStatus).toBe('parsed_with_ambiguity');
    });
});

describe('v0.3 — Tokenization', () => {
    it('splits on whitespace', () => {
        expect(tokenize('Make it safe')).toEqual(['Make', 'it', 'safe']);
    });

    it('handles multi-line input', () => {
        expect(tokenize('Line one\nLine two')).toEqual(['Line', 'one', 'Line', 'two']);
    });

    it('handles multiple consecutive spaces', () => {
        expect(tokenize('Hello   world')).toEqual(['Hello', 'world']);
    });

    it('returns empty for whitespace-only', () => {
        expect(tokenize('   ')).toEqual([]);
    });

    it('preserves case', () => {
        expect(tokenize('MAKE IT SAFE')).toEqual(['MAKE', 'IT', 'SAFE']);
    });
});