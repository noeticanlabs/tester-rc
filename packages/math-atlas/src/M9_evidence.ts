// @cohbit/math-atlas — M9 Proof / Evidence Layer (10-level ladder)
// Spec: v0.1 §13

export type EvidenceLevel = 'none' | 'intuition' | 'example' | 'diagram_supported' | 'simulation_supported' | 'computationally_tested' | 'proof_sketch' | 'peer_reviewed_argument' | 'formal_statement' | 'Lean_formalized_pending' | 'proof_assistant_checked';
export const EVIDENCE_LADDER: EvidenceLevel[] = ['none', 'intuition', 'example', 'diagram_supported', 'simulation_supported', 'computationally_tested', 'proof_sketch', 'peer_reviewed_argument', 'formal_statement', 'Lean_formalized_pending', 'proof_assistant_checked'];

export const CLAIM_CEILINGS: Record<EvidenceLevel, string> = {
    none: 'may claim nothing', intuition: 'may claim conceptual motivation', example: 'may claim illustrative instance', diagram_supported: 'may claim visual model', simulation_supported: 'may claim computational evidence under tested conditions', computationally_tested: 'may claim tested behavior under declared implementation', proof_sketch: 'may claim proposed proof route', peer_reviewed_argument: 'may claim reviewed mathematical argument under scope', formal_statement: 'may claim precise theorem candidate', Lean_formalized_pending: 'may claim formalization attempt pending', proof_assistant_checked: 'may claim formal verification under stated definitions and assumptions',
};
export const FORBIDDEN_UPGRADES: string[] = ['example ≠ theorem', 'diagram ≠ proof', 'simulation ≠ proof', 'code ≠ proof', 'proof sketch ≠ formal proof', 'Lean statement ≠ checked theorem', 'checked theorem ≠ physical truth'];