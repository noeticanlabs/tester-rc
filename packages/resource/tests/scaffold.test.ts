import { describe, it, expect } from 'vitest';
import { RESOURCE_NAME, RESOURCE_VERSION } from '../src/index.js';
describe('Resource Layer Scaffold', () => {
    it('package loads', () => { expect(RESOURCE_NAME).toBe('@cohbit/resource'); });
    it('version is 0.6.0', () => { expect(RESOURCE_VERSION).toBe('0.6.0'); });
});