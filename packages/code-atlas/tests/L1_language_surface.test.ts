// @cohbit/code-atlas v0.2.0 — L1 Language Surface Tests
// Verifies language profiles, surface patterns, and registry queries.

import { describe, it, expect } from 'vitest';
import {
    LANG_PYTHON, LANG_TYPESCRIPT, LANG_RUST, LANG_C, LANG_LEAN,
    LANGUAGE_REGISTRY, getLanguage, listLanguages,
    SURFACE_PATTERNS, getSurfacePatternsForLanguage, getSurfacePatternsForInvariant,
    type LanguageProfile,
} from '../src/L1_language_surface.js';

describe('v0.2 — Language Profiles', () => {
    it('all 5 languages are registered', () => {
        expect(LANGUAGE_REGISTRY.size).toBe(5);
        expect(listLanguages()).toHaveLength(5);
    });

    it('each language has required fields', () => {
        for (const lang of LANGUAGE_REGISTRY.values()) {
            expect(lang.languageId).toBeTruthy();
            expect(lang.name).toBeTruthy();
            expect(lang.atlasRole).toBeTruthy();
            expect(lang.nativeStrengths.length).toBeGreaterThan(0);
            expect(lang.nativeRisks.length).toBeGreaterThan(0);
            expect(lang.preferredFailureEncoding.length).toBeGreaterThan(0);
            expect(lang.defaultVerifierRoutes.length).toBeGreaterThan(0);
        }
    });

    it('retrieves language by ID', () => {
        const rust = getLanguage('LANG_RUST');
        expect(rust).toBeDefined();
        expect(rust!.name).toBe('Rust');
        expect(rust!.atlasRole).toBe('safe_systems');
    });

    it('returns undefined for unknown language', () => {
        expect(getLanguage('LANG_UNKNOWN')).toBeUndefined();
    });

    it('Rust preferred failure encoding includes Option and Result', () => {
        const rust = LANG_RUST;
        expect(rust.preferredFailureEncoding).toContain('Option<T>');
        expect(rust.preferredFailureEncoding).toContain('Result<T,E>');
    });

    it('Lean has formal verification role', () => {
        expect(LANG_LEAN.atlasRole).toBe('formal_verification');
        expect(LANG_LEAN.nativeRisks).toContain('sorry_placeholder');
    });

    it('each language profile has a unique languageId', () => {
        const ids = [...LANGUAGE_REGISTRY.values()].map(l => l.languageId);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('v0.2 — Surface Patterns', () => {
    it('has at least 10 surface patterns registered', () => {
        expect(SURFACE_PATTERNS.length).toBeGreaterThanOrEqual(10);
    });

    it('filters patterns by language', () => {
        const pythonPatterns = getSurfacePatternsForLanguage('python');
        expect(pythonPatterns.length).toBeGreaterThanOrEqual(2);
        for (const p of pythonPatterns) {
            expect(p.language).toBe('python');
        }
    });

    it('filters patterns by invariant', () => {
        const branchPatterns = getSurfacePatternsForInvariant('INV_006');
        expect(branchPatterns.length).toBeGreaterThanOrEqual(5); // at least 5 if variants
        for (const p of branchPatterns) {
            expect(p.mapsToInvariant).toBe('INV_006');
        }
    });

    it('every surface pattern has all required fields', () => {
        for (const p of SURFACE_PATTERNS) {
            expect(p.surfaceId).toBeTruthy();
            expect(p.language).toBeTruthy();
            expect(p.surfacePattern).toBeTruthy();
            expect(p.mapsToInvariant).toBeTruthy();
            expect(p.notes).toBeTruthy();
        }
    });

    it('INV_006 ConditionalBranch has if expressions for all 5 languages', () => {
        const branchPatterns = getSurfacePatternsForInvariant('INV_006');
        const languages = new Set(branchPatterns.map(p => p.language));
        expect(languages.has('python')).toBe(true);
        expect(languages.has('typescript')).toBe(true);
        expect(languages.has('rust')).toBe(true);
        expect(languages.has('c')).toBe(true);
        expect(languages.has('lean')).toBe(true);
    });
});