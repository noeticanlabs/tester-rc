// @cohbit/code-atlas — Noetican Code Invariant Atlas
// Governed multilingual code memory layer for CohBit-Copilot.
//
// Boundary rule:
//   Atlas packages classify, map, and retrieve structure.
//   They do not authorize, mutate, apply, verify final state,
//   rollback, receipt, or commit.
//
// Version: 0.0.0 — scaffolding

export const ATLAS_NAME = '@cohbit/code-atlas';
export const ATLAS_VERSION = '1.2.0';
export const ATLAS_KIND = 'code-atlas';

// Layer exports (spec v0.1 mapped to crate v0.1+)
export {
    type CodeArtifact,
    type ArtifactKind,
    type TrustLevel,
    type IngestionStatus,
    type CreateCodeArtifactInput,
    createCodeArtifact,
    generateArtifactId,
    hashArtifactContent,
    isValidArtifact,
} from './L0_artifact.js';

export {
    type LanguageProfile,
    type SurfacePattern,
    LANG_PYTHON,
    LANG_TYPESCRIPT,
    LANG_RUST,
    LANG_C,
    LANG_LEAN,
    LANGUAGE_REGISTRY,
    getLanguage,
    listLanguages,
    SURFACE_PATTERNS,
    getSurfacePatternsForLanguage,
    getSurfacePatternsForInvariant,
} from './L1_language_surface.js';

export {
    type ParserConfidence,
    type ASTNode,
    type ParseRecord,
    type NodeType,
    NODE_INVARIANT_MAP,
    VALID_NODE_TYPES,
    createParseRecord,
    generateParseId,
    isValidNodeType,
    getInvariantCandidates,
    createGuardedDivisionParse,
} from './L2_parse_ast.js';

export {
    type InvariantKind,
    type InvariantFamily,
    type AtomicInvariant,
    type CompositeInvariant,
    type Invariant,
    ATOMIC_INVARIANTS,
    COMPOSITE_INVARIANTS,
    getInvariant,
    resolveComposite,
    listByFamily,
    getReceiptRequiredInvariants,
} from './L3_invariant.js';

export {
    type TransitionKind,
    type TypedTransition,
    CORE_TRANSITIONS,
    GOVERNANCE_TRANSITIONS,
    ALL_TRANSITIONS,
    getTransition,
    listByKind,
    listByInvariant,
} from './L4_transition.js';

export {
    type FailureSeverity, type FailureMode, type RiskTag, type ForbiddenCollapse,
    FAILURE_MODES, RISK_TAGS, FORBIDDEN_COLLAPSES,
    getFailureMode, listFailuresBySeverity, listFailuresByFamily,
} from './L5_risk_constraint.js';

// Layer modules to be added sequentially:
export { type ProjectionStatus, type LanguageProjection, PROJECTIONS, getProjectionsByTransition, getProjectionsByLanguage } from './L6_projection.js';
export { type EvidenceLevel, type VerifierRoute, VERIFIER_ROUTES, EVIDENCE_CLAIM_CEILINGS, getVerifierRoute } from './L7_verifier.js';
export { type ReceiptStatus, type ReceiptRecord, RECEIPTS, getReceipt, listByStatus } from './L8_receipt.js';
export { type RepairStatus, type RepairObligation, REPAIR_OBLIGATIONS, getRepairObligation, listOpenRepairs } from './L9_repair_obligation.js';
export { type AtlasEntry, storeAtlasEntry, queryByReceipt as queryAtlasByReceipt, queryByInvariant as queryAtlasByInvariant, listRecentAtlasEntries } from './store.js';
export { type MemoryEdgeType, type MemoryEdge, type CrossLanguageStatus, type MemoryGraph, createMemoryGraph } from './L10_memory_graph.js';
export { type QueryShape, type AtlasQuery, createQuery } from './L11_query.js';
export { type CanonicalStatus, type AtlasVersionRecord, createVersionRecord } from './L12_governance.js';
