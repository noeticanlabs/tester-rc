// @cohbit/tlt-atlas v0.4.0 — L3 Semantic Unit Tests
// Verifies all 20 semantic units, registry, record creation, and canonical examples.

import { describe, it, expect } from 'vitest';
import {
    SEMANTIC_UNITS, getSemanticUnit,
    createSemanticRecord, createMakeItSafeSemanticRecord,
    type SemanticUnit, type SemanticRecord,
} from '../src/L3_semantic_unit.js';

describe('v0.4 — Semantic Unit Registry', () => {
    it('all 20 semantic units are registered', () => {
        expect(SEMANTIC_UNITS.size).toBe(20);
    });

    it('each semantic unit has all required fields', () => {
        for (const unit of SEMANTIC_UNITS.values()) {
            expect(unit.id).toMatch(/^SEM_\d{3}$/);
            expect(unit.name).toBeTruthy();
            expect(unit.definition).toBeTruthy();
            expect(unit.definition.length).toBeGreaterThan(10);
        }
    });

    it('retrieves semantic unit by ID', () => {
        const unit = getSemanticUnit('SEM_010');
        expect(unit).toBeDefined();
        expect(unit!.name).toBe('SafetyConstraint');
    });

    it('returns undefined for unknown semantic unit', () => {
        expect(getSemanticUnit('SEM_999')).toBeUndefined();
    });

    it('key semantic units are present', () => {
        expect(getSemanticUnit('SEM_001')!.name).toBe('Request');
        expect(getSemanticUnit('SEM_002')!.name).toBe('Command');
        expect(getSemanticUnit('SEM_004')!.name).toBe('Warning');
        expect(getSemanticUnit('SEM_010')!.name).toBe('SafetyConstraint');
        expect(getSemanticUnit('SEM_020')!.name).toBe('DomainReference');
    });
});

describe('v0.4 — Semantic Record Creation', () => {
    it('creates a semantic record with all required fields', () => {
        const record = createSemanticRecord({
            artifactId: 'LANG_ART_000001',
            semanticUnits: ['SEM_002', 'SEM_010', 'SEM_011'],
            plainMeaning: 'The user wants the referenced item changed to reduce risk.',
        });

        expect(record.semanticRecordId).toMatch(/^SEMREC_\d{6}$/);
        expect(record.artifactId).toBe('LANG_ART_000001');
        expect(record.semanticUnits).toEqual(['SEM_002', 'SEM_010', 'SEM_011']);
        expect(record.plainMeaning).toBeTruthy();
        expect(record.status).toBe('mapped');
        expect(record.createdAt).toBeDefined();
    });

    it('generates unique record IDs', () => {
        const r1 = createSemanticRecord({ artifactId: 'A1', semanticUnits: ['SEM_001'], plainMeaning: 'First' });
        const r2 = createSemanticRecord({ artifactId: 'A2', semanticUnits: ['SEM_002'], plainMeaning: 'Second' });
        expect(r1.semanticRecordId).not.toBe(r2.semanticRecordId);
    });
});

describe('v0.4 — Make It Safe Canonical Semantic Record', () => {
    it('maps "Make it safe." to Command + SafetyConstraint + RepairInstruction', () => {
        const record = createMakeItSafeSemanticRecord('LANG_ART_000004');
        expect(record.semanticUnits).toContain('SEM_002'); // Command
        expect(record.semanticUnits).toContain('SEM_010'); // SafetyConstraint
        expect(record.semanticUnits).toContain('SEM_011'); // RepairInstruction
        expect(record.plainMeaning).toContain('risk');
        expect(record.plainMeaning).toContain('harm');
        expect(record.status).toBe('mapped');
    });
});