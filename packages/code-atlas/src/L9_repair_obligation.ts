// @cohbit/code-atlas — L9 Repair Obligation Layer
// Turns failure into structured work.
// Spec source: Noetican Code Invariant Atlas v0.1 §L9

export type RepairStatus = 'open' | 'in_progress' | 'blocked' | 'needs_human_review' | 'accepted_with_limitations' | 'rejected' | 'superseded' | 'closed';
export interface RepairObligation { repairId: string; linkedReceiptId: string; transitionId: string; failureReason: string; requiredAction: string; status: RepairStatus; createdAt: string; }

export const RPR_GDIV_TS_NULL: RepairObligation = { repairId: 'RPR_GDIV_TS_001', linkedReceiptId: 'RCT_GDIV_TS_001', transitionId: 'TRANS_001', failureReason: 'TypeScript projection returns null but registry requires explicit Result-like error encoding.', requiredAction: 'Either define null as accepted failure encoding or replace with Result<T,E> pattern.', status: 'open', createdAt: new Date().toISOString() };

export const REPAIR_OBLIGATIONS: Map<string, RepairObligation> = new Map([[RPR_GDIV_TS_NULL.repairId, RPR_GDIV_TS_NULL]]);
export function getRepairObligation(id: string): RepairObligation | undefined { return REPAIR_OBLIGATIONS.get(id); }
export function listOpenRepairs(): RepairObligation[] { return [...REPAIR_OBLIGATIONS.values()].filter(r => r.status === 'open'); }