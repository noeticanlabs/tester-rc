// @cohbit/tlt-atlas — TLT Claim Guard (v9.1)
// Claim strength validation ladder. Prevents voice from upgrading
// graph status — ensures that surface language like "verified" or
// "production-ready" is checked against actual evidence.
//
// Operating law:
//   Claim Guard checks whether source language strength is backed
//   by graph evidence. It may flag mismatches but may not certify
//   claims, verify truth, or authorize releases. All guard output
//   is advisory.
//
// Strength ladder (ordered, non-upgradable):
//   surface_detected → needs_evidence → receipt_available →
//   ctrl_verified → release_approved

import type { TltGraphNode } from './T_tlt_transformer.js';
import { MEANING_INVARIANTS } from './L5_meaning_invariant.js';

// ─── Strength Types ──────────────────────────────────────────────

export type EvidenceStrength =
    | 'surface_detected'
    | 'needs_evidence'
    | 'receipt_available'
    | 'ctrl_verified'
    | 'release_approved';

export type ClaimStrengthViolation = {
    violationId: string;
    nodeId: string;
    sourceVerb: string;
    sourceStrength: EvidenceStrength;
    actualStrength: EvidenceStrength;
    severity: 'high' | 'medium' | 'low';
    message: string;
    suggestedDowngrade: string;
};

export interface ClaimStrengthAssessment {
    nodeId: string;
    sourceText: string;
    sourceVerbs: string[];
    actualStrength: EvidenceStrength;
    violations: ClaimStrengthViolation[];
    isHonest: boolean;          // true if no violations found
    requiresHumanReview: boolean;
}

export interface ClaimGuardReport {
    assessments: ClaimStrengthAssessment[];
    summary: {
        totalNodes: number;
        honestNodes: number;
        violations: number;
        highSeverity: number;
        mediumSeverity: number;
        lowSeverity: number;
        requiresHumanReview: number;
    };
}

// ─── Strength Ladder ─────────────────────────────────────────────

const STRENGTH_ORDER: EvidenceStrength[] = [
    'surface_detected',
    'needs_evidence',
    'receipt_available',
    'ctrl_verified',
    'release_approved',
];

const STRENGTH_RANK: Record<EvidenceStrength, number> = {
    surface_detected: 0,
    needs_evidence: 1,
    receipt_available: 2,
    ctrl_verified: 3,
    release_approved: 4,
};

/**
 * Compare two evidence strengths. Returns positive if a > b.
 */
function strengthCompare(a: EvidenceStrength, b: EvidenceStrength): number {
    return STRENGTH_RANK[a] - STRENGTH_RANK[b];
}

/**
 * Determine the minimum required evidence strength for a claim verb.
 */
function minimumStrengthForVerb(verb: string): EvidenceStrength {
    const map: Record<string, EvidenceStrength> = {
        verified: 'receipt_available',
        proven: 'receipt_available',
        guaranteed: 'receipt_available',
        certified: 'receipt_available',
        validated: 'receipt_available',
        complete: 'ctrl_verified',
        finished: 'ctrl_verified',
        done: 'ctrl_verified',
        finalized: 'ctrl_verified',
        'production-ready': 'release_approved',
        'release-ready': 'release_approved',
        deployable: 'release_approved',
        shippable: 'release_approved',
        safe: 'receipt_available',
        secure: 'receipt_available',
        correct: 'receipt_available',
        formal: 'ctrl_verified',
    };
    return map[verb.toLowerCase()] || 'surface_detected';
}

// ─── Verb Detection ──────────────────────────────────────────────

/** All strong claim verbs that trigger the guard. */
export const STRONG_VERB_PATTERNS: { verb: string; regex: RegExp; minStrength: EvidenceStrength }[] = [
    { verb: 'verified', regex: /\b(verified|verifi(?:ed|able)|confirm(?:ed)?)\b/i, minStrength: 'receipt_available' },
    { verb: 'proven', regex: /\b(proven|proved|proof)\b/i, minStrength: 'receipt_available' },
    { verb: 'guaranteed', regex: /\b(guarantee(?:s|d)?|guaranteed)\b/i, minStrength: 'receipt_available' },
    { verb: 'certified', regex: /\b(certif(?:ied|ies)|certification)\b/i, minStrength: 'receipt_available' },
    { verb: 'validated', regex: /\b(validated?|validation)\b/i, minStrength: 'receipt_available' },
    { verb: 'complete', regex: /\b(complet(?:e|ed|ion)|finished|done|finali(?:zed|sed))\b/i, minStrength: 'ctrl_verified' },
    { verb: 'production-ready', regex: /\b(production[- ]ready|release[- ]ready|deployable|shippable)\b/i, minStrength: 'release_approved' },
    { verb: 'safe', regex: /\b(safe(?:ty)?|secure)\b/i, minStrength: 'receipt_available' },
];

let violationCounter = 0;
function nextViolationId(): string {
    violationCounter++;
    return `CSV_${String(violationCounter).padStart(5, '0')}`;
}

// ─── Strength Assessment ─────────────────────────────────────────

/**
 * Determine the actual evidence strength of a TLT graph node.
 * Checks for receipt links, evidence level, and verifier routes.
 */
export function assessNodeStrength(node: TltGraphNode): EvidenceStrength {
    // Check for receipt-required invariants that are matched
    const hasReceiptInvariants = node.matchedInvariants.some(id => {
        const minv = MEANING_INVARIANTS.get(id);
        return minv?.receiptRequired && minv.id !== 'MINV_012'; // MINV_012 = PublicFacingStatement
    });

    // Check evidence level
    if (node.evidenceLevel === 'surface_detected') {
        return hasReceiptInvariants ? 'needs_evidence' : 'surface_detected';
    }

    // If we had actual receipt nodes or CTRL verifier evidence, we'd check here
    // For v9.1: all transformer output is surface_detected, so actual strength
    // is at most needs_evidence (when receipt-required invariants are present)
    return hasReceiptInvariants ? 'needs_evidence' : 'surface_detected';
}

/**
 * Extract strong verbs from source text.
 */
function extractStrongVerbs(text: string): { verb: string; minStrength: EvidenceStrength }[] {
    const found: { verb: string; minStrength: EvidenceStrength }[] = [];
    for (const pattern of STRONG_VERB_PATTERNS) {
        if (pattern.regex.test(text)) {
            found.push({ verb: pattern.verb, minStrength: pattern.minStrength });
        }
    }
    return found;
}

/**
 * Check a TLT graph node for claim strength violations.
 * Compares source language strength against actual graph evidence.
 */
export function checkClaimStrength(node: TltGraphNode): ClaimStrengthAssessment {
    const violations: ClaimStrengthViolation[] = [];
    const sourceVerbs = extractStrongVerbs(node.matchedText);
    const actualStrength = assessNodeStrength(node);

    for (const { verb, minStrength } of sourceVerbs) {
        if (strengthCompare(actualStrength, minStrength) < 0) {
            // Actual strength is below minimum required — violation
            const severity = strengthCompare(minStrength, actualStrength) >= 2
                ? 'high'
                : strengthCompare(minStrength, actualStrength) >= 1
                    ? 'medium'
                    : 'low';

            const violationId = nextViolationId();
            violations.push({
                violationId,
                nodeId: node.nodeId,
                sourceVerb: verb,
                sourceStrength: minStrength,
                actualStrength,
                severity,
                message: `"'${verb}' language used but actual evidence strength is '${actualStrength}'. ` +
                    `Minimum '${minStrength}' required.`,
                suggestedDowngrade: downgradeVerb(verb, actualStrength),
            });
        }
    }

    return {
        nodeId: node.nodeId,
        sourceText: node.matchedText,
        sourceVerbs: sourceVerbs.map(v => v.verb),
        actualStrength,
        violations,
        isHonest: violations.length === 0,
        requiresHumanReview: violations.some(v => v.severity === 'high'),
    };
}

// ─── Verb Downgrade ──────────────────────────────────────────────

/**
 * Generate a downgraded replacement phrase for a strong claim verb,
 * given the actual evidence strength available.
 */
export function downgradeVerb(verb: string, actualStrength: EvidenceStrength): string {
    const downgradeMap: Record<string, Record<EvidenceStrength, string>> = {
        verified: {
            surface_detected: 'appears to be consistent with preliminary testing',
            needs_evidence: 'has been tested but not independently verified',
            receipt_available: 'has an associated verification receipt',
            ctrl_verified: 'has passed CTRL verification',
            release_approved: 'is verified',
        },
        proven: {
            surface_detected: 'has not been formally proven',
            needs_evidence: 'has partial supporting evidence but is not proven',
            receipt_available: 'has a supporting receipt but is not formally proven',
            ctrl_verified: 'has been formally verified by CTRL',
            release_approved: 'is formally proven',
        },
        guaranteed: {
            surface_detected: 'is not guaranteed — no evidence available',
            needs_evidence: 'has some support but no formal guarantee',
            receipt_available: 'is receipted but not formally guaranteed',
            ctrl_verified: 'is guaranteed by CTRL verification',
            release_approved: 'is guaranteed',
        },
        complete: {
            surface_detected: 'appears to be work-in-progress',
            needs_evidence: 'has been partially reviewed but is not complete',
            receipt_available: 'has receipts for components but overall completion unverified',
            ctrl_verified: 'has been verified as complete',
            release_approved: 'is complete',
        },
        'production-ready': {
            surface_detected: 'is a research snapshot — not production-ready',
            needs_evidence: 'has partial testing — not production-ready',
            receipt_available: 'has receipts — pending release gate approval',
            ctrl_verified: 'has passed verification — pending release gate',
            release_approved: 'is production-ready',
        },
        safe: {
            surface_detected: 'has not been safety-reviewed',
            needs_evidence: 'has partial safety analysis — full review not complete',
            receipt_available: 'has safety-related receipts',
            ctrl_verified: 'has passed safety verification',
            release_approved: 'has been approved as safe',
        },
    };

    const verbEntry = downgradeMap[verb];
    if (verbEntry) {
        return verbEntry[actualStrength] || `appears to be described as '${verb}' but evidence is insufficient`;
    }
    return `appears to use '${verb}' language but evidence is at '${actualStrength}' level`;
}

/**
 * Downgrade an entire claim text by replacing strong verbs with
 * evidence-appropriate alternatives.
 */
export function downgradeClaimLanguage(text: string, node: TltGraphNode): string {
    const verbs = extractStrongVerbs(text);
    const actualStrength = assessNodeStrength(node);
    let result = text;

    for (const { verb } of verbs) {
        const replacement = downgradeVerb(verb, actualStrength);
        // Replace the first occurrence of the verb word
        const verbRegex = new RegExp(`\\b${verb.replace('-', '[- ]')}\\b`, 'gi');
        result = result.replace(verbRegex, replacement);
    }

    return result;
}

// ─── ALLOWED VERBS PER LEVEL ─────────────────────────────────────

/**
 * Return the set of claim verbs that are allowed at a given evidence strength.
 * Verbs above this level are violations.
 */
export function allowedVerbs(strength: EvidenceStrength): string[] {
    const allowed: string[] = [];
    for (const pattern of STRONG_VERB_PATTERNS) {
        if (strengthCompare(strength, pattern.minStrength) >= 0) {
            allowed.push(pattern.verb);
        }
    }
    return allowed;
}

// ─── Batch reporting ─────────────────────────────────────────────

/**
 * Run claim strength assessment over a batch of nodes.
 */
export function assessAllClaims(nodes: TltGraphNode[]): ClaimGuardReport {
    const claimNodes = nodes.filter(n => n.nodeType === 'claim' || n.nodeType === 'risk');
    const assessments = claimNodes.map(n => checkClaimStrength(n));

    return {
        assessments,
        summary: {
            totalNodes: assessments.length,
            honestNodes: assessments.filter(a => a.isHonest).length,
            violations: assessments.reduce((sum, a) => sum + a.violations.length, 0),
            highSeverity: assessments.reduce((sum, a) => sum + a.violations.filter(v => v.severity === 'high').length, 0),
            mediumSeverity: assessments.reduce((sum, a) => sum + a.violations.filter(v => v.severity === 'medium').length, 0),
            lowSeverity: assessments.reduce((sum, a) => sum + a.violations.filter(v => v.severity === 'low').length, 0),
            requiresHumanReview: assessments.filter(a => a.requiresHumanReview).length,
        },
    };
}

/** Reset the violation counter (for testing). */
export function resetViolationCounter(): void {
    violationCounter = 0;
}