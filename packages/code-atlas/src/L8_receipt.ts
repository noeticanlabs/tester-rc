// @cohbit/code-atlas — L8 Receipt Layer
// Records what was accepted, rejected, repaired, or proven.
// Spec source: Noetican Code Invariant Atlas v0.1 §L8

export type ReceiptStatus = 'accepted' | 'accepted_with_limitations' | 'rejected' | 'repair_required' | 'proof_pending' | 'stale' | 'superseded';
export interface ReceiptRecord { receiptId: string; transitionId: string; invariantId: string; sourceLanguage: string; targetLanguage?: string; evidenceLevel: string; verifierStatus: ReceiptStatus; proofStatus: string; limitations: string[]; createdAt: string; }

export const RCT_GDIV_RUST: ReceiptRecord = { receiptId: 'RCT_GDIV_RUST_001', transitionId: 'TRANS_001', invariantId: 'INV_006', sourceLanguage: 'rust', evidenceLevel: 'unit_tested', verifierStatus: 'accepted', proofStatus: 'not_formalized', limitations: ['Floating point edge cases not fully modeled.'], createdAt: new Date().toISOString() };
export const RCT_GDIV_TS: ReceiptRecord = { receiptId: 'RCT_GDIV_TS_001', transitionId: 'TRANS_001', invariantId: 'INV_006', sourceLanguage: 'typescript', evidenceLevel: 'unit_tested', verifierStatus: 'repair_required', proofStatus: 'not_formalized', limitations: ['Nullable return encoding is ambiguous.', 'Consider Result<T,E> pattern for stronger encoding.'], createdAt: new Date().toISOString() };

export const RECEIPTS: Map<string, ReceiptRecord> = new Map([[RCT_GDIV_RUST.receiptId, RCT_GDIV_RUST], [RCT_GDIV_TS.receiptId, RCT_GDIV_TS]]);
export function getReceipt(id: string): ReceiptRecord | undefined { return RECEIPTS.get(id); }
export function listByStatus(status: ReceiptStatus): ReceiptRecord[] { return [...RECEIPTS.values()].filter(r => r.verifierStatus === status); }