// @cohbit/tlt-atlas v0.5.0 — L4 Intent Classification Tests
import { describe, it, expect } from 'vitest';
import {
    INTENT_CLASSES, getIntentClass, createIntentRecord, createMakeItSafeIntentRecord,
} from '../src/L4_intent.js';

describe('v0.5 — Intent Registry', () => {
    it('has 15 intent classes registered', () => {
        expect(INTENT_CLASSES.size).toBe(15);
    });

    it('retrieves intent by ID', () => {
        expect(getIntentClass('INTENT_008')!.name).toBe('RepairLanguage');
        expect(getIntentClass('INTENT_999')).toBeUndefined();
    });

    it('each intent has required fields', () => {
        for (const intent of INTENT_CLASSES.values()) {
            expect(intent.intentId).toMatch(/^INTENT_\d{3}$/);
            expect(intent.name).toBeTruthy();
            expect(intent.definition).toBeTruthy();
        }
    });
});

describe('v0.5 — Intent Record Creation', () => {
    it('creates intent record with all required fields', () => {
        const record = createIntentRecord({
            artifactId: 'LANG_ART_000001',
            primaryIntent: 'INTENT_008',
            secondaryIntents: ['INTENT_006', 'INTENT_014'],
            confidence: 0.74,
        });

        expect(record.intentRecordId).toMatch(/^INTREC_\d{6}$/);
        expect(record.primaryIntent).toBe('INTENT_008');
        expect(record.secondaryIntents).toEqual(['INTENT_006', 'INTENT_014']);
        expect(record.confidence).toBe(0.74);
        expect(record.status).toBe('intent_candidate');
        expect(record.createdAt).toBeDefined();
    });

    it('defaults confidence to 0.5', () => {
        const record = createIntentRecord({ artifactId: 'A1', primaryIntent: 'INTENT_001' });
        expect(record.confidence).toBe(0.5);
    });
});

describe('v0.5 — Make It Safe Canonical Intent', () => {
    it('classifies "Make it safe." as RepairLanguage + MakeClaimAccurate + DetectAmbiguity', () => {
        const record = createMakeItSafeIntentRecord('LANG_ART_000004');
        expect(record.primaryIntent).toBe('INTENT_008');
        expect(record.secondaryIntents).toContain('INTENT_006');
        expect(record.secondaryIntents).toContain('INTENT_014');
        expect(record.confidence).toBe(0.74);
        expect(record.ambiguity).toContain('safety');
    });
});