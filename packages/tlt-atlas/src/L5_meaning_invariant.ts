// @cohbit/tlt-atlas — L5 Meaning Invariant Layer
// Defines core bilingual meaning invariants that survive across languages.
//
// Spec source: TLT Bilingual Language Atlas v0.2 §L5
// Governing law:
//   The meaning invariant is the bilingual anchor.

export interface MeaningInvariant {
    id: string;
    name: string;
    definition: string;
    preserveAcrossLanguages: string[];
    failureModes: string[];
    receiptRequired: boolean;
}

// ─── MINV_001–MINV_020 ────────────────────────────────────────

export const MINV_001: MeaningInvariant = { id: 'MINV_001', name: 'DirectRequest', definition: 'A meaning unit requesting action, information, or a decision.', preserveAcrossLanguages: ['request type', 'request target', 'urgency if stated'], failureModes: ['request becomes demand', 'target lost', 'politeness inverted'], receiptRequired: false };
export const MINV_002: MeaningInvariant = { id: 'MINV_002', name: 'ClarificationRequest', definition: 'A meaning unit asking for precision, disambiguation, or more detail.', preserveAcrossLanguages: ['what is unclear', 'what information is needed'], failureModes: ['question becomes accusation', 'clarification target lost'], receiptRequired: false };
export const MINV_003: MeaningInvariant = { id: 'MINV_003', name: 'SafetyConstraint', definition: 'A meaning unit that restricts an action to prevent harm, failure, misuse, or unacceptable risk.', preserveAcrossLanguages: ['the constraint must remain visible', 'the risk target should not be removed', 'the instruction should not become optional'], failureModes: ['constraint weakened', 'risk omitted', 'tone makes safety sound optional'], receiptRequired: true };
export const MINV_004: MeaningInvariant = { id: 'MINV_004', name: 'RiskReduction', definition: 'A meaning unit expressing that risk should be lowered without eliminating the intended function.', preserveAcrossLanguages: ['risk is lowered', 'original function preserved'], failureModes: ['risk reduction omitted', 'risk reduction becomes risk elimination claim'], receiptRequired: true };
export const MINV_005: MeaningInvariant = { id: 'MINV_005', name: 'PreserveFunction', definition: 'A meaning unit that the original purpose must survive a change.', preserveAcrossLanguages: ['function identity', 'function requirement'], failureModes: ['function changed silently', 'function weakened'], receiptRequired: true };
export const MINV_006: MeaningInvariant = { id: 'MINV_006', name: 'TechnicalInstruction', definition: 'A meaning unit that guides a precise technical action.', preserveAcrossLanguages: ['action', 'target', 'expected outcome'], failureModes: ['step omitted', 'technical term mistranslated', 'instruction becomes suggestion'], receiptRequired: false };
export const MINV_007: MeaningInvariant = { id: 'MINV_007', name: 'PlainLanguageExplanation', definition: 'A meaning unit that explains a concept in accessible, non-technical language.', preserveAcrossLanguages: ['core meaning', 'accessibility'], failureModes: ['technical term reintroduced', 'meaning simplified beyond accuracy'], receiptRequired: false };
export const MINV_008: MeaningInvariant = { id: 'MINV_008', name: 'ToneSoftening', definition: 'A meaning unit that adjusts language to be less harsh, confrontational, or abrupt.', preserveAcrossLanguages: ['core meaning', 'relationship respect'], failureModes: ['softening removes clarity', 'softening becomes passivity'], receiptRequired: false };
export const MINV_009: MeaningInvariant = { id: 'MINV_009', name: 'FirmBoundary', definition: 'A meaning unit that establishes a non-negotiable limit, refusal, or prohibition.', preserveAcrossLanguages: ['boundary condition', 'consequence if violated'], failureModes: ['boundary softened', 'boundary becomes threat'], receiptRequired: true };
export const MINV_010: MeaningInvariant = { id: 'MINV_010', name: 'EvidenceRequest', definition: 'A meaning unit asking for proof, verification, or supporting documentation.', preserveAcrossLanguages: ['what evidence is needed', 'acceptable evidence type'], failureModes: ['evidence request becomes accusation', 'evidence standard dropped'], receiptRequired: false };
export const MINV_011: MeaningInvariant = { id: 'MINV_011', name: 'ClaimLimitation', definition: 'A meaning unit that marks what a statement does NOT assert or guarantee.', preserveAcrossLanguages: ['the limitation boundary', 'what is excluded'], failureModes: ['limitation removed', 'limitation weakened', 'hedge treated as disclaimer'], receiptRequired: true };
export const MINV_012: MeaningInvariant = { id: 'MINV_012', name: 'PublicFacingStatement', definition: 'A meaning unit intended for broad public or professional audiences.', preserveAcrossLanguages: ['message clarity', 'audience appropriateness', 'no internal terminology leak'], failureModes: ['internal term exposed', 'tone mismatch for audience', 'overclaim in public'], receiptRequired: true };
export const MINV_013: MeaningInvariant = { id: 'MINV_013', name: 'InternalCanonTerm', definition: 'A meaning unit using Noetican Labs internal terminology.', preserveAcrossLanguages: ['term definition', 'term boundary', 'do not project as plain language'], failureModes: ['term leaked to public', 'term collapsed with standard term', 'term used without definition'], receiptRequired: false };
export const MINV_014: MeaningInvariant = { id: 'MINV_014', name: 'Warning', definition: 'A meaning unit alerting about risk, danger, failure, or important constraint.', preserveAcrossLanguages: ['risk identity', 'severity', 'action required'], failureModes: ['warning softened to suggestion', 'severity downgraded'], receiptRequired: true };
export const MINV_015: MeaningInvariant = { id: 'MINV_015', name: 'RepairInstruction', definition: 'A meaning unit directing how to fix, correct, or improve.', preserveAcrossLanguages: ['what is broken', 'repair action', 'expected outcome'], failureModes: ['repair target lost', 'repair becomes replacement'], receiptRequired: false };
export const MINV_016: MeaningInvariant = { id: 'MINV_016', name: 'StepByStepProcedure', definition: 'A meaning unit describing sequential steps to accomplish a goal.', preserveAcrossLanguages: ['step order', 'step action', 'completion condition'], failureModes: ['step omitted', 'order changed', 'step conflated'], receiptRequired: false };
export const MINV_017: MeaningInvariant = { id: 'MINV_017', name: 'Prohibition', definition: 'A meaning unit forbidding a specific action or class of actions.', preserveAcrossLanguages: ['what is prohibited', 'scope of prohibition'], failureModes: ['prohibition softened to warning', 'scope narrowed'], receiptRequired: true };
export const MINV_018: MeaningInvariant = { id: 'MINV_018', name: 'Permission', definition: 'A meaning unit granting authorization for a specified action.', preserveAcrossLanguages: ['what is permitted', 'scope of permission', 'conditions'], failureModes: ['permission broadened', 'condition omitted'], receiptRequired: false };
export const MINV_019: MeaningInvariant = { id: 'MINV_019', name: 'UncertaintyDisclosure', definition: 'A meaning unit acknowledging incomplete knowledge or low confidence.', preserveAcrossLanguages: ['what is uncertain', 'confidence level'], failureModes: ['uncertainty removed', 'uncertainty inflated to impossibility'], receiptRequired: false };
export const MINV_020: MeaningInvariant = { id: 'MINV_020', name: 'CrossLanguageReuse', definition: 'A meaning unit that a bilingual mapping may be reused within declared scope.', preserveAcrossLanguages: ['source meaning', 'target projection', 'reuse scope', 'limitations'], failureModes: ['reuse scope expanded silently', 'limitations dropped'], receiptRequired: true };

export const MEANING_INVARIANTS: Map<string, MeaningInvariant> = new Map([
    ['MINV_001', MINV_001], ['MINV_002', MINV_002], ['MINV_003', MINV_003], ['MINV_004', MINV_004],
    ['MINV_005', MINV_005], ['MINV_006', MINV_006], ['MINV_007', MINV_007], ['MINV_008', MINV_008],
    ['MINV_009', MINV_009], ['MINV_010', MINV_010], ['MINV_011', MINV_011], ['MINV_012', MINV_012],
    ['MINV_013', MINV_013], ['MINV_014', MINV_014], ['MINV_015', MINV_015], ['MINV_016', MINV_016],
    ['MINV_017', MINV_017], ['MINV_018', MINV_018], ['MINV_019', MINV_019], ['MINV_020', MINV_020],
]);

export function getMeaningInvariant(id: string): MeaningInvariant | undefined { return MEANING_INVARIANTS.get(id); }
export function listReceiptRequired(): MeaningInvariant[] { return [...MEANING_INVARIANTS.values()].filter(m => m.receiptRequired); }