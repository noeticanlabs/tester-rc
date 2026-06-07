// @cohbit/code-atlas — L7 Verification Route Layer
// Defines how transitions can be checked and what evidence level each route supports.
// Spec source: Noetican Code Invariant Atlas v0.1 §L7

export type EvidenceLevel = 'none' | 'syntax_checked' | 'type_checked' | 'unit_tested' | 'negative_tested' | 'property_tested' | 'static_analyzed' | 'runtime_tested' | 'benchmark_supported' | 'manually_audited' | 'formally_proven';

export interface VerifierRoute { routeId: string; name: string; evidenceLevel: EvidenceLevel; acceptableFor: string[]; notAcceptableFor: string[]; }

export const VR_UNIT: VerifierRoute = { routeId: 'VR_UNIT_001', name: 'unit_test', evidenceLevel: 'unit_tested', acceptableFor: ['runtime-tested engineering claim'], notAcceptableFor: ['formally proven claim'] };
export const VR_TYPE: VerifierRoute = { routeId: 'VR_TYPE_001', name: 'type_check', evidenceLevel: 'type_checked', acceptableFor: ['type-safe claim'], notAcceptableFor: ['runtime safety claim', 'formally proven claim'] };
export const VR_STATIC: VerifierRoute = { routeId: 'VR_STATIC_001', name: 'static_analysis', evidenceLevel: 'static_analyzed', acceptableFor: ['detected issue class absent'], notAcceptableFor: ['formally proven claim', 'runtime performance claim'] };
export const VR_PROOF: VerifierRoute = { routeId: 'VR_PROOF_001', name: 'proof_assistant', evidenceLevel: 'formally_proven', acceptableFor: ['formal theorem under stated assumptions'], notAcceptableFor: ['production safety without implementation mapping'] };
export const VR_BENCH: VerifierRoute = { routeId: 'VR_BENCH_001', name: 'benchmark', evidenceLevel: 'benchmark_supported', acceptableFor: ['declared benchmark performance claim'], notAcceptableFor: ['universal correctness claim'] };
export const VR_AUDIT: VerifierRoute = { routeId: 'VR_AUDIT_001', name: 'manual_audit', evidenceLevel: 'manually_audited', acceptableFor: ['human-reviewed claim under stated scope'], notAcceptableFor: ['machine proof claim'] };

export const VERIFIER_ROUTES: Map<string, VerifierRoute> = new Map([['VR_UNIT_001', VR_UNIT], ['VR_TYPE_001', VR_TYPE], ['VR_STATIC_001', VR_STATIC], ['VR_PROOF_001', VR_PROOF], ['VR_BENCH_001', VR_BENCH], ['VR_AUDIT_001', VR_AUDIT]]);
export function getVerifierRoute(id: string): VerifierRoute | undefined { return VERIFIER_ROUTES.get(id); }

export const EVIDENCE_CLAIM_CEILINGS: Record<EvidenceLevel, string> = {
    none: 'may claim nothing', syntax_checked: 'may claim: code parses', type_checked: 'may claim: type checker accepted', unit_tested: 'may claim: passed listed examples', negative_tested: 'may claim: checked listed failure cases', property_tested: 'may claim: checked declared property range', static_analyzed: 'may claim: analyzer did not detect declared issue class', runtime_tested: 'may claim: passed runtime checks under declared environment', benchmark_supported: 'may claim: passed declared benchmark set', manually_audited: 'may claim: human reviewed under stated scope', formally_proven: 'may claim: proof checker accepted under stated assumptions',
};