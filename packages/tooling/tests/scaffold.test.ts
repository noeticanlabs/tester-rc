import { describe, it, expect } from 'vitest';
import { TOOLING_NAME, TOOLING_VERSION } from '../src/index.js';
describe('Tooling Scaffold', () => {
    it('package loads', () => { expect(TOOLING_NAME).toBe('@cohbit/tooling'); });
    it('version is 0.8.0', () => { expect(TOOLING_VERSION).toBe('0.8.0'); });
});