// @cohbit/code-atlas v0.0.0 — Scaffold Tests
// Verifies the package loads, exports are defined, and no domain logic is yet present.

import { describe, it, expect } from 'vitest';
import { ATLAS_NAME, ATLAS_VERSION, ATLAS_KIND } from '../src/index.js';

describe('v0.0.0 — Code Atlas Scaffold', () => {
    it('package loads with correct identity', () => {
        expect(ATLAS_NAME).toBe('@cohbit/code-atlas');
    });

    it('version is 1.2.0 (full layer stack L0-L12)', () => {
        expect(ATLAS_VERSION).toBe('1.2.0');
    });

    it('atlas kind is code-atlas', () => {
        expect(ATLAS_KIND).toBe('code-atlas');
    });

    it('exports are defined and of expected type', () => {
        expect(typeof ATLAS_NAME).toBe('string');
        expect(typeof ATLAS_VERSION).toBe('string');
        expect(typeof ATLAS_KIND).toBe('string');
    });
});