// CohBit-Copilot Atlas Bridge v1.0
// Connects the CohBit-Copilot runtime to the Code and TLT atlases.
//
// Authority boundary:
//   The bridge classifies and maps. It does not authorize, mutate,
//   apply, or commit. CTRL gates commit. Receipts decide persistence.

import type { PatchFile, GateRecord, CohBitReceipt } from './types.js';
import type { EnglishCommandParse } from './types.js';
import { ATOMIC_INVARIANTS, COMPOSITE_INVARIANTS } from '../packages/code-atlas/src/L3_invariant.js';
import { FAILURE_MODES } from '../packages/code-atlas/src/L5_risk_constraint.js';
import type { AtlasEntry } from '../packages/code-atlas/src/store.js';

// ─── Patch Classification ──────────────────────────────────────

export interface ClassifiedPatch {
    proposalId: string;
    filePath: string;
    nodeTypes: string[];
    invariantIds: string[];
    riskIds: string[];
    classificationConfidence: 'high' | 'medium' | 'low';
}

/**
 * Classify a CohBit-Copilot PatchFile against the Code Atlas invariants.
 * Uses heuristic pattern matching against the patch content.
 */
export function classifyPatchFile(patch: PatchFile, proposalId: string): ClassifiedPatch {
    const content = patch.afterContent;
    const nodeTypes: string[] = [];
    const invariantIds: string[] = [];

    // Heuristic classification based on patch content patterns
    if (content.includes('if ') || content.includes('if(') || content.includes('else')) {
        nodeTypes.push('ConditionalBranch');
        invariantIds.push('INV_006');
    }
    if (content.includes('return ')) {
        nodeTypes.push('Return');
        invariantIds.push('INV_008');
    }
    if (content.includes('function ') || content.includes('def ') || content.includes('fn ')) {
        nodeTypes.push('FunctionDefinition');
        invariantIds.push('INV_001');
    }
    if (content.includes('try {') || content.includes('catch') || content.includes('except')) {
        nodeTypes.push('ErrorPath');
        invariantIds.push('INV_009');
    }
    if (content.includes('Option<') || content.includes('Result<') || content.includes('null') || content.includes('None')) {
        nodeTypes.push('ResultOrOption');
        invariantIds.push('INV_011');
    }
    if (content.includes('assert') || content.includes('expect(') || content.includes('.toBe(')) {
        nodeTypes.push('TestAssertion');
        invariantIds.push('INV_023');
    }
    if (content.includes('import ') || content.includes('from ') || content.includes('require(')) {
        nodeTypes.push('ImportDependency');
        invariantIds.push('INV_021');
    }
    if (content.includes('async ') || content.includes('await ')) {
        nodeTypes.push('AsyncContinuation');
        invariantIds.push('INV_022');
    }

    // Risk classification
    const riskIds: string[] = [];
    if (content.includes('null') || content.includes('undefined') || content.includes('None')) {
        riskIds.push('RISK_001'); // NullableAmbiguity
    }
    if (content.includes('as ') && content.includes('any')) {
        riskIds.push('RISK_002'); // UncheckedCast
    }
    if (content.includes('sorry') || content.includes('admit')) {
        riskIds.push('RISK_005'); // ProofGap
    }

    const confidence = nodeTypes.length >= 3 ? 'high' : nodeTypes.length >= 1 ? 'medium' : 'low';

    return {
        proposalId,
        filePath: patch.path,
        nodeTypes,
        invariantIds: [...new Set(invariantIds)],
        riskIds,
        classificationConfidence: confidence,
    };
}

// ─── Gate Record → Atlas Entry ─────────────────────────────────

/**
 * Build an atlas entry from a CohBit-Copilot GateRecord.
 * Extracts invariants from the proposal files and maps them through
 * the code atlas registry.
 */
export function buildAtlasEntry(params: {
    gateRecord: GateRecord;
    receipt: CohBitReceipt;
    sessionId: string;
    classification: ClassifiedPatch;
}): AtlasEntry {
    const { gateRecord, receipt, sessionId, classification } = params;

    return {
        receiptBitId: receipt.bitId,
        proposalId: gateRecord.proposal.proposalId,
        invariants: classification.invariantIds,
        sessionId,
        evidenceLevel: gateRecord.testResults ? 'unit_tested' : 'syntax_checked',
        claimStatus: gateRecord.status === 'RECEIPTED' ? 'receipted' : 'draft',
        riskIds: classification.riskIds,
        limitations: [],
        storedAt: new Date().toISOString(),
    };
}

// ─── English Command → TLT Semantic Mapping ───────────────────

export interface CommandSemanticMap {
    command: string;
    intent: string;
    semanticUnitIds: string[];
    ambiguityDetected: boolean;
}

/**
 * Map a CohBit-Copilot English command parse to TLT semantic units.
 */
export function mapCommandToSemantics(command: EnglishCommandParse): CommandSemanticMap {
    const semanticUnitIds: string[] = [];

    switch (command.intent) {
        case 'InspectWorkspace':
        case 'InspectFile':
            semanticUnitIds.push('SEM_001'); // Request
            break;
        case 'PlanChange':
            semanticUnitIds.push('SEM_006'); // Definition
            semanticUnitIds.push('SEM_009'); // TechnicalExplanation
            break;
        case 'ProposePatch':
            semanticUnitIds.push('SEM_002'); // Command
            semanticUnitIds.push('SEM_006'); // Definition
            break;
        case 'FixTests':
            semanticUnitIds.push('SEM_011'); // RepairInstruction
            break;
        case 'RecommendTests':
            semanticUnitIds.push('SEM_012'); // EvidenceRequest
            break;
        case 'ApplyPatch':
        case 'AuthorizePatch':
            semanticUnitIds.push('SEM_002'); // Command
            semanticUnitIds.push('SEM_010'); // SafetyConstraint
            break;
        case 'ReviewPatch':
            semanticUnitIds.push('SEM_012'); // EvidenceRequest
            break;
        case 'RollbackPatch':
            semanticUnitIds.push('SEM_011'); // RepairInstruction
            break;
        default:
            semanticUnitIds.push('SEM_005'); // Clarification
    }

    if (command.confidence === 'low' || command.confidence === 'unsafe') {
        semanticUnitIds.push('SEM_018'); // UncertaintyMarker
    }

    return {
        command: command.raw,
        intent: command.intent,
        semanticUnitIds,
        ambiguityDetected: command.unsafeReason !== undefined || command.confidence === 'unsafe',
    };
}