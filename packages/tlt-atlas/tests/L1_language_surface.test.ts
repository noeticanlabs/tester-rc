// @cohbit/tlt-atlas v0.2.0 — L1 Language Surface Tests
// Verifies language modes, registers, surface record creation, and validation.

import { describe, it, expect } from 'vitest';
import {
    LANGUAGE_MODE_DESCRIPTIONS, VALID_LANGUAGE_MODES, isValidLanguageMode,
    REGISTER_DESCRIPTIONS, VALID_REGISTERS, isValidRegister,
    createLanguageSurfaceRecord, generateSurfaceId,
    type LanguageMode, type Register, type LanguageSurfaceRecord,
} from '../src/L1_language_surface.js';

describe('v0.2 — Language Modes', () => {
    it('all 10 language modes are registered', () => {
        expect(VALID_LANGUAGE_MODES.size).toBe(10);
        expect(Object.keys(LANGUAGE_MODE_DESCRIPTIONS)).toHaveLength(10);
    });

    it('each language mode has a description', () => {
        for (const mode of VALID_LANGUAGE_MODES) {
            expect(LANGUAGE_MODE_DESCRIPTIONS[mode]).toBeTruthy();
        }
    });

    it('isValidLanguageMode returns true for valid modes', () => {
        expect(isValidLanguageMode('english')).toBe(true);
        expect(isValidLanguageMode('spanish')).toBe(true);
        expect(isValidLanguageMode('technical_english')).toBe(true);
        expect(isValidLanguageMode('copilot_instruction_language')).toBe(true);
    });

    it('isValidLanguageMode returns false for invalid modes', () => {
        expect(isValidLanguageMode('french')).toBe(false);
        expect(isValidLanguageMode('')).toBe(false);
        expect(isValidLanguageMode('arbitrary')).toBe(false);
    });
});

describe('v0.2 — Registers', () => {
    it('all 10 registers are registered', () => {
        expect(VALID_REGISTERS.size).toBe(10);
        expect(Object.keys(REGISTER_DESCRIPTIONS)).toHaveLength(10);
    });

    it('each register has a description', () => {
        for (const reg of VALID_REGISTERS) {
            expect(REGISTER_DESCRIPTIONS[reg]).toBeTruthy();
        }
    });

    it('isValidRegister returns true for valid registers', () => {
        expect(isValidRegister('casual_command')).toBe(true);
        expect(isValidRegister('technical_explanation')).toBe(true);
        expect(isValidRegister('public_statement')).toBe(true);
        expect(isValidRegister('urgent_warning')).toBe(true);
    });

    it('isValidRegister returns false for invalid registers', () => {
        expect(isValidRegister('poetic')).toBe(false);
        expect(isValidRegister('')).toBe(false);
        expect(isValidRegister('random')).toBe(false);
    });
});

describe('v0.2 — Language Surface Record', () => {
    it('creates a surface record with all required fields', () => {
        const record = createLanguageSurfaceRecord({
            artifactId: 'LANG_ART_000001',
            detectedLanguage: 'english',
            languageMode: 'technical_english',
            surfaceText: 'Modify it to reduce risk without losing the main function.',
            register: 'technical_explanation',
        });

        expect(record.surfaceId).toMatch(/^SURF_\d{6}$/);
        expect(record.artifactId).toBe('LANG_ART_000001');
        expect(record.detectedLanguage).toBe('english');
        expect(record.languageMode).toBe('technical_english');
        expect(record.surfaceText).toBe('Modify it to reduce risk without losing the main function.');
        expect(record.register).toBe('technical_explanation');
        expect(record.codeSwitching).toBe(false);
        expect(record.spellingNoise).toBe(false);
        expect(record.possibleAmbiguity).toBe(false);
        expect(record.status).toBe('detected');
    });

    it('accepts optional ambiguity and code-switching flags', () => {
        const record = createLanguageSurfaceRecord({
            artifactId: 'LANG_ART_000002',
            detectedLanguage: 'english_spanish_mixed',
            languageMode: 'english_spanish_mixed',
            surfaceText: 'Hazlo más seguro por favor',
            register: 'casual_command',
            codeSwitching: true,
            spellingNoise: false,
            possibleAmbiguity: true,
        });

        expect(record.codeSwitching).toBe(true);
        expect(record.possibleAmbiguity).toBe(true);
    });

    it('generates unique surface IDs', () => {
        const r1 = createLanguageSurfaceRecord({
            artifactId: 'ART_A', detectedLanguage: 'english',
            languageMode: 'plain_english', surfaceText: 'Hello',
            register: 'casual_command',
        });
        const r2 = createLanguageSurfaceRecord({
            artifactId: 'ART_B', detectedLanguage: 'english',
            languageMode: 'plain_english', surfaceText: 'World',
            register: 'casual_command',
        });

        expect(r1.surfaceId).not.toBe(r2.surfaceId);
    });
});