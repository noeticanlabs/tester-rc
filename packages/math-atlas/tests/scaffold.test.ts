import { describe, it, expect } from 'vitest';
import { ATLAS_NAME, ATLAS_VERSION, ATLAS_KIND } from '../src/index.js';
describe('Math Atlas Scaffold', () => {
    it('package loads', () => { expect(ATLAS_NAME).toBe('@cohbit/math-atlas'); });
    it('version is 1.7.0 (full stack M0-M17)', () => { expect(ATLAS_VERSION).toBe('1.7.0'); });
    it('kind is math-atlas', () => { expect(ATLAS_KIND).toBe('math-atlas'); });
});