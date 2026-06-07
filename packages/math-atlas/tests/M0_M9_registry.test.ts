import { describe, it, expect } from 'vitest';
import { VALID_MATH_ARTIFACT_TYPES, createMathArtifact } from '../src/M0_artifact.js';
import { REP_TYPES } from '../src/M1_representation.js';
import { MODEL_FAMILIES } from '../src/M2_model_family.js';
import { MATH_OBJECT_TYPES } from '../src/M3_object_structure.js';
import { RELATION_TYPES } from '../src/M4_relation.js';
import { MATH_INVARIANTS, getMathInvariant, listReceiptRequiredMath } from '../src/M5_invariant.js';
import { ASSUMPTION_TYPES } from '../src/M6_assumption.js';
import { MAPPING_TYPES } from '../src/M7_mapping.js';
import { ANALOGY_STATUSES } from '../src/M8_analogy.js';
import { EVIDENCE_LADDER, CLAIM_CEILINGS, FORBIDDEN_UPGRADES } from '../src/M9_evidence.js';

describe('M0 — Artifact', () => {
    it('12 artifact types', () => { expect(VALID_MATH_ARTIFACT_TYPES.size).toBe(12); });
    it('creates artifact', () => { const a = createMathArtifact({ artifactType: 'definition', rawContent: 'A transition is admissible if constraints hold.' }); expect(a.mathArtifactId).toMatch(/^MART_\d{6}$/); expect(a.sourceHash).toHaveLength(64); });
    it('rejects empty', () => { expect(() => createMathArtifact({ artifactType: 'equation', rawContent: '  ' })).toThrow(); });
});
describe('M1 — Representation', () => { it('20 rep types', () => { expect(REP_TYPES).toHaveLength(20); }); });
describe('M2 — Model Family', () => { it('25 model families', () => { expect(MODEL_FAMILIES).toHaveLength(25); }); it('ConstraintSystem exists', () => { expect(MODEL_FAMILIES.find(m => m.modelId === 'MODEL_018')!.name).toBe('ConstraintSystemModel'); }); });
describe('M3 — Object Structure', () => { it('30 object types', () => { expect(MATH_OBJECT_TYPES).toHaveLength(30); }); });
describe('M4 — Relation', () => { it('25 relation types', () => { expect(RELATION_TYPES).toHaveLength(25); }); });
describe('M5 — Math Invariants', () => {
    it('25 invariants', () => { expect(MATH_INVARIANTS.size).toBe(25); });
    it('retrieves by ID', () => { expect(getMathInvariant('MINV_MATH_006')!.name).toBe('AdmissibleTransition'); });
    it('all require receipt', () => { expect(listReceiptRequiredMath()).toHaveLength(25); });
    it('NonCollapseBoundary has failure modes', () => { expect(getMathInvariant('MINV_MATH_014')!.failureModes).toContain('analogy treated as theorem'); });
});
describe('M6 — Assumption', () => { it('20 assumption types', () => { expect(ASSUMPTION_TYPES).toHaveLength(20); }); });
describe('M7 — Mapping', () => { it('20 mapping types', () => { expect(MAPPING_TYPES).toHaveLength(20); }); });
describe('M8 — Analogy', () => { it('6 analogy statuses', () => { expect(ANALOGY_STATUSES).toHaveLength(6); }); });
describe('M9 — Evidence', () => {
    it('11 evidence levels', () => { expect(EVIDENCE_LADDER).toHaveLength(11); });
    it('claim ceilings cover all levels', () => { expect(Object.keys(CLAIM_CEILINGS)).toHaveLength(11); });
    it('7 forbidden upgrades', () => { expect(FORBIDDEN_UPGRADES).toHaveLength(7); });
    it('forbids simulation as proof', () => { expect(FORBIDDEN_UPGRADES).toContain('simulation ≠ proof'); });
});