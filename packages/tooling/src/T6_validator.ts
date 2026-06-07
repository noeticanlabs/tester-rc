// @cohbit/tooling — T6 Schema Validator
// Validates atlas records before they become trusted memory.
// Spec: Noetican Tooling Layer v0.1 §10

export interface ValidationResult {
    valid: boolean;
    recordType: string;
    errors: string[];
    warnings: string[];
    timestamp: string;
}

/**
 * Validate a code atlas receipt record has required fields.
 */
export function validateReceiptRecord(record: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!record.receiptId || typeof record.receiptId !== 'string') errors.push('Missing or invalid receiptId');
    if (!record.transitionId || typeof record.transitionId !== 'string') errors.push('Missing or invalid transitionId');
    if (!record.invariantId || typeof record.invariantId !== 'string') errors.push('Missing or invalid invariantId');
    if (!record.evidenceLevel || typeof record.evidenceLevel !== 'string') errors.push('Missing or invalid evidenceLevel');
    if (!record.verifierStatus || typeof record.verifierStatus !== 'string') errors.push('Missing or invalid verifierStatus');
    if (!record.createdAt || typeof record.createdAt !== 'string') errors.push('Missing or invalid createdAt');

    if (record.proofStatus && record.proofStatus === 'not_formalized' && record.verifierStatus === 'accepted') {
        warnings.push('Receipt accepted but proof is not formalized.');
    }

    return {
        valid: errors.length === 0,
        recordType: 'receipt',
        errors,
        warnings,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Validate a canonicalization record has required fields.
 */
export function validateCanonicalRecord(record: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];

    if (!record.entryId || typeof record.entryId !== 'string') errors.push('Missing or invalid entryId');
    if (!record.changeType || !['created', 'modified', 'deprecated', 'superseded'].includes(record.changeType as string)) errors.push('Invalid changeType');
    if (!record.claimStatus || !['draft_engineering_claim', 'receipted_claim', 'canonical_claim'].includes(record.claimStatus as string)) errors.push('Invalid claimStatus');

    return {
        valid: errors.length === 0,
        recordType: 'canonical',
        errors,
        warnings: [],
        timestamp: new Date().toISOString(),
    };
}

/**
 * Validate a repair obligation record.
 */
export function validateRepairRecord(record: Record<string, unknown>): ValidationResult {
    const errors: string[] = [];

    if (!record.repairId || typeof record.repairId !== 'string') errors.push('Missing or invalid repairId');
    if (!record.linkedReceiptId || typeof record.linkedReceiptId !== 'string') errors.push('Missing or invalid linkedReceiptId');
    if (!record.failureReason || typeof record.failureReason !== 'string') errors.push('Missing or invalid failureReason');
    if (!record.requiredAction || typeof record.requiredAction !== 'string') errors.push('Missing or invalid requiredAction');

    return {
        valid: errors.length === 0,
        recordType: 'repair',
        errors,
        warnings: [],
        timestamp: new Date().toISOString(),
    };
}