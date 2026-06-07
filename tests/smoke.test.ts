import { describe, it, expect } from 'vitest';
import { isAdmissible } from '../src/types.js';

describe('smoke', () => {
    it('passes basic admissibility', () => {
        expect(isAdmissible(
            { numer: 10, denom: 1 },
            { numer: 9, denom: 1 },
            { numer: 1, denom: 1 },
            { numer: 0, denom: 1 },
            { numer: 0, denom: 1 },
        )).toBe(true);
    });
});