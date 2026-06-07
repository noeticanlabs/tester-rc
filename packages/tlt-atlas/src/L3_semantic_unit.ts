// @cohbit/tlt-atlas — L3 Semantic Unit Layer
// Extracts reusable meaning units from parsed language input.
//
// Spec source: TLT Bilingual Language Atlas v0.2 §L3
// Governing law:
//   Semantic units are reusable pieces of meaning.
//   They describe what the phrase means, not just how it looks.

// ─── Types ─────────────────────────────────────────────────────

/** A semantic unit — a reusable atom of meaning. */
export interface SemanticUnit {
    id: string;
    name: string;
    definition: string;
}

/** A semantic record linking an artifact to its extracted meaning units. */
export interface SemanticRecord {
    semanticRecordId: string;
    artifactId: string;
    semanticUnits: string[];
    plainMeaning: string;
    status: 'mapped';
    createdAt: string;
}

// ─── Semantic Unit Registry (SEM_001–SEM_020) ──────────────────

export const SEM_001: SemanticUnit = {
    id: 'SEM_001', name: 'Request',
    definition: 'The speaker is asking for something — information, action, permission, or clarification.',
};

export const SEM_002: SemanticUnit = {
    id: 'SEM_002', name: 'Command',
    definition: 'The speaker is directing an imperative action toward a recipient.',
};

export const SEM_003: SemanticUnit = {
    id: 'SEM_003', name: 'Question',
    definition: 'The speaker is seeking information or confirmation.',
};

export const SEM_004: SemanticUnit = {
    id: 'SEM_004', name: 'Warning',
    definition: 'The speaker is alerting about risk, danger, or potential failure.',
};

export const SEM_005: SemanticUnit = {
    id: 'SEM_005', name: 'Clarification',
    definition: 'The speaker is disambiguating, refining, or restating for precision.',
};

export const SEM_006: SemanticUnit = {
    id: 'SEM_006', name: 'Definition',
    definition: 'The speaker is defining a term, concept, or boundary.',
};

export const SEM_007: SemanticUnit = {
    id: 'SEM_007', name: 'Translation',
    definition: 'The speaker is requesting or providing language-to-language meaning transfer.',
};

export const SEM_008: SemanticUnit = {
    id: 'SEM_008', name: 'Simplification',
    definition: 'The speaker is requesting or providing a less complex version of meaning.',
};

export const SEM_009: SemanticUnit = {
    id: 'SEM_009', name: 'TechnicalExplanation',
    definition: 'The speaker is explaining a technical concept, system, or process.',
};

export const SEM_010: SemanticUnit = {
    id: 'SEM_010', name: 'SafetyConstraint',
    definition: 'The speaker is expressing a restriction intended to prevent harm, failure, or unacceptable risk.',
};

export const SEM_011: SemanticUnit = {
    id: 'SEM_011', name: 'RepairInstruction',
    definition: 'The speaker is directing how to fix, correct, or improve something.',
};

export const SEM_012: SemanticUnit = {
    id: 'SEM_012', name: 'EvidenceRequest',
    definition: 'The speaker is asking for proof, verification, or supporting evidence.',
};

export const SEM_013: SemanticUnit = {
    id: 'SEM_013', name: 'ClaimBoundary',
    definition: 'The speaker is marking the limits of what a statement asserts and what it does not.',
};

export const SEM_014: SemanticUnit = {
    id: 'SEM_014', name: 'ToneAdjustment',
    definition: 'The speaker is requesting or applying a change in tone, register, or formality.',
};

export const SEM_015: SemanticUnit = {
    id: 'SEM_015', name: 'PublicMessage',
    definition: 'The speaker is crafting or reviewing language intended for a public audience.',
};

export const SEM_016: SemanticUnit = {
    id: 'SEM_016', name: 'InternalCanonTerm',
    definition: 'The speaker is using or defining a term specific to Noetican Labs internal vocabulary.',
};

export const SEM_017: SemanticUnit = {
    id: 'SEM_017', name: 'HumanEmotion',
    definition: 'The speaker is expressing or acknowledging emotional content.',
};

export const SEM_018: SemanticUnit = {
    id: 'SEM_018', name: 'UncertaintyMarker',
    definition: 'The speaker is signaling uncertainty, incomplete knowledge, or low confidence.',
};

export const SEM_019: SemanticUnit = {
    id: 'SEM_019', name: 'TimeConstraint',
    definition: 'The speaker is expressing a temporal boundary, deadline, or urgency.',
};

export const SEM_020: SemanticUnit = {
    id: 'SEM_020', name: 'DomainReference',
    definition: 'The speaker is referencing a specific knowledge domain, field, or context.',
};

// ─── Registry ──────────────────────────────────────────────────

export const SEMANTIC_UNITS: Map<string, SemanticUnit> = new Map([
    ['SEM_001', SEM_001], ['SEM_002', SEM_002], ['SEM_003', SEM_003], ['SEM_004', SEM_004],
    ['SEM_005', SEM_005], ['SEM_006', SEM_006], ['SEM_007', SEM_007], ['SEM_008', SEM_008],
    ['SEM_009', SEM_009], ['SEM_010', SEM_010], ['SEM_011', SEM_011], ['SEM_012', SEM_012],
    ['SEM_013', SEM_013], ['SEM_014', SEM_014], ['SEM_015', SEM_015], ['SEM_016', SEM_016],
    ['SEM_017', SEM_017], ['SEM_018', SEM_018], ['SEM_019', SEM_019], ['SEM_020', SEM_020],
]);

/** Get a semantic unit by ID. */
export function getSemanticUnit(id: string): SemanticUnit | undefined {
    return SEMANTIC_UNITS.get(id);
}

// ─── Factory ───────────────────────────────────────────────────

let semanticCounter = 0;

function generateSemanticRecordId(): string {
    semanticCounter += 1;
    return `SEMREC_${String(semanticCounter).padStart(6, '0')}`;
}

/**
 * Create a SemanticRecord from an artifact and extracted semantic units.
 */
export function createSemanticRecord(params: {
    artifactId: string;
    semanticUnits: string[];
    plainMeaning: string;
}): SemanticRecord {
    return {
        semanticRecordId: generateSemanticRecordId(),
        artifactId: params.artifactId,
        semanticUnits: params.semanticUnits,
        plainMeaning: params.plainMeaning,
        status: 'mapped',
        createdAt: new Date().toISOString(),
    };
}

/**
 * Canonical example: semantic record for "Make it safe."
 */
export function createMakeItSafeSemanticRecord(artifactId: string): SemanticRecord {
    return createSemanticRecord({
        artifactId,
        semanticUnits: ['SEM_002', 'SEM_010', 'SEM_011'],
        plainMeaning: 'The user wants the referenced item changed so that it reduces risk or avoids harm.',
    });
}