// @cohbit/tooling — T9 Receipt Engine
// Emits unified receipts for accepted, rejected, repaired, or verified transitions.
// Spec: Noetican Tooling Layer v0.1 §13

export type UniversalReceiptStatus = 'accepted' | 'accepted_with_limitations' | 'rejected' | 'repair_required' | 'proof_pending' | 'stale';
export type ReceiptDomain = 'code' | 'language' | 'math' | 'governance';

export interface UniversalReceipt {
    receiptId: string;
    domain: ReceiptDomain;
    sourceId: string;
    transition: string;
    evidenceLevel: string;
    status: UniversalReceiptStatus;
    limitations: string[];
    createdAt: string;
}

let rcptCounter = 0;

/**
 * Emit a universal receipt for any atlas domain.
 */
export function emitReceipt(params: {
    domain: ReceiptDomain;
    sourceId: string;
    transition: string;
    evidenceLevel: string;
    status: UniversalReceiptStatus;
    limitations?: string[];
}): UniversalReceipt {
    rcptCounter += 1;
    return {
        receiptId: `RCPT_${String(rcptCounter).padStart(6, '0')}`,
        domain: params.domain,
        sourceId: params.sourceId,
        transition: params.transition,
        evidenceLevel: params.evidenceLevel,
        status: params.status,
        limitations: params.limitations ?? [],
        createdAt: new Date().toISOString(),
    };
}

/**
 * Validate that a receipt's evidence level supports the claimed status.
 */
export function validateReceiptClaim(receipt: UniversalReceipt): { valid: boolean; warning?: string } {
    if (receipt.status === 'accepted' && receipt.evidenceLevel === 'none') {
        return { valid: false, warning: 'Cannot accept with no evidence. Status must be at least draft.' };
    }
    if (receipt.status === 'accepted' && ['intuition', 'example'].includes(receipt.evidenceLevel)) {
        return { valid: false, warning: 'Evidence level too low for accepted status. Minimum: unit_tested or equivalent.' };
    }
    return { valid: true };
}