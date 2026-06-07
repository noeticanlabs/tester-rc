// @cohbit/math-atlas — Noetican Multimodel Mathematics Atlas
// Governed mathematical meaning layer for CohBit-Copilot.
//
// Boundary rule:
//   Atlas packages classify, map, and retrieve structure.
//   They do not authorize, mutate, apply, verify final state,
//   rollback, receipt, or commit.
//
// Version: 0.0.0 — scaffolding

export const ATLAS_NAME = '@cohbit/math-atlas';
export const ATLAS_VERSION = '1.7.0';
export const ATLAS_KIND = 'math-atlas';

// Layer modules to be added sequentially:
export { type MathArtifactType, type MathArtifact, createMathArtifact, generateMathArtifactId, VALID_MATH_ARTIFACT_TYPES } from './M0_artifact.js';
export { type RepresentationType, type RepresentationRecord, REP_TYPES, createRepresentationRecord } from './M1_representation.js';
export { type ModelFamily, type ModelRecord, MODEL_FAMILIES, MODEL_FAMILY_MAP, getModelFamily, createModelRecord } from './M2_model_family.js';
export { type MathObjectType, type StructureRecord, MATH_OBJECT_TYPES, createStructureRecord } from './M3_object_structure.js';
export { type RelationType, type RelationEntry, type RelationRecord, RELATION_TYPES, createRelationRecord } from './M4_relation.js';
export { type MathInvariant, MATH_INVARIANTS, getMathInvariant, listReceiptRequiredMath } from './M5_invariant.js';
export { type AssumptionType, type AssumptionRecord, ASSUMPTION_TYPES, createAssumptionRecord } from './M6_assumption.js';
export { type MappingType, type MappingRecord, MAPPING_TYPES, createMappingRecord } from './M7_mapping.js';
export { type AnalogyStatus, type AnalogyBoundaryRecord, ANALOGY_STATUSES, createAnalogyBoundary } from './M8_analogy.js';
export { type EvidenceLevel, EVIDENCE_LADDER, CLAIM_CEILINGS, FORBIDDEN_UPGRADES } from './M9_evidence.js';
export { type SimulationRecord, createSimulationRecord } from './M10_simulation.js';
export { type FormalizationStatus, type FormalizationRecord, FORMALIZATION_STATUSES, createFormalizationRecord } from './M11_formalization.js';
export { type MathRiskSeverity, type MathRisk, MATH_RISKS, getMathRisk } from './M12_risk_misuse.js';
export { type MathReceiptStatus, type MathReceiptRecord, createMathReceipt } from './M13_receipt.js';
export { type MathRepairType, type MathRepairRecord, MATH_REPAIR_TYPES, createMathRepair } from './M14_repair.js';
export { type MathMemoryEdgeType, type MathMemoryEdge, type MathMemoryGraph, createMathMemoryGraph } from './M15_memory_graph.js';
export { type MathRetrievalResult, createMathRetrievalResult } from './M16_retrieval.js';
export { type MathGovernanceRecord, MATH_FORBIDDEN_COLLAPSES, createMathGovernanceRecord } from './M17_governance.js';
