// @cohbit/tooling — T8 Repair Queue (v14.3)
// Stores work that must be fixed before memory can be promoted.
// Spec: Noetican Tooling Layer v0.1 §12
//
// v14.3: Added enqueueFromProposal, getRepairsByFinding, 
//        and proposal lifecycle tracking.

export type RepairPriority = 'high' | 'medium' | 'low';
export type RepairCategory =
    | 'code_repair' | 'language_repair' | 'math_mapping_repair'
    | 'proof_gap_repair' | 'notation_repair' | 'assumption_repair'
    | 'formalization_repair' | 'receipt_repair' | 'public_claim_repair';

export interface RepairTask {
    repairTaskId: string;
    sourceRecordId: string;
    repairType: RepairCategory;
    problem: string;
    requiredAction: string;
    priority: RepairPriority;
    status: 'open' | 'in_progress' | 'completed' | 'rejected';
    createdAt: string;
    /** v14.3: link to the audit finding that generated this repair */
    findingId?: string;
    /** v14.3: link to the proposal ID if a patch was proposed */
    proposalId?: string;
}

export const REPAIR_QUEUE: RepairTask[] = [];

let repairCounter = 0;

/**
 * Enqueue a repair task. Returns the task ID.
 */
export function enqueueRepair(params: {
    sourceRecordId: string;
    repairType: RepairCategory;
    problem: string;
    requiredAction: string;
    priority?: RepairPriority;
}): RepairTask {
    repairCounter += 1;
    const task: RepairTask = {
        repairTaskId: `REPAIR_${String(repairCounter).padStart(6, '0')}`,
        sourceRecordId: params.sourceRecordId,
        repairType: params.repairType,
        problem: params.problem,
        requiredAction: params.requiredAction,
        priority: params.priority ?? 'medium',
        status: 'open',
        createdAt: new Date().toISOString(),
    };
    REPAIR_QUEUE.push(task);
    return task;
}

/**
 * v14.3: Enqueue a repair task from a proposal result.
 * Only called when a proposal is generated (status: 'proposed').
 */
export function enqueueFromProposal(params: {
    findingId: string;
    proposalId: string;
    problem: string;
    requiredAction: string;
    priority?: RepairPriority;
    repairType?: RepairCategory;
}): RepairTask {
    repairCounter += 1;
    const task: RepairTask = {
        repairTaskId: `REPAIR_${String(repairCounter).padStart(6, '0')}`,
        sourceRecordId: params.proposalId,
        repairType: params.repairType ?? 'code_repair',
        problem: params.problem,
        requiredAction: params.requiredAction,
        priority: params.priority ?? 'medium',
        status: 'open',
        findingId: params.findingId,
        proposalId: params.proposalId,
        createdAt: new Date().toISOString(),
    };
    REPAIR_QUEUE.push(task);
    return task;
}

/**
 * Get all open repair tasks.
 */
export function getOpenRepairs(): RepairTask[] {
    return REPAIR_QUEUE.filter(t => t.status === 'open');
}

/**
 * Get repairs by priority.
 */
export function getRepairsByPriority(priority: RepairPriority): RepairTask[] {
    return REPAIR_QUEUE.filter(t => t.priority === priority);
}

/**
 * v14.3: Get all repairs linked to a specific finding.
 */
export function getRepairsByFinding(findingId: string): RepairTask[] {
    return REPAIR_QUEUE.filter(t => t.findingId === findingId);
}

/**
 * v14.3: Get all repairs linked to a specific proposal.
 */
export function getRepairsByProposal(proposalId: string): RepairTask[] {
    return REPAIR_QUEUE.filter(t => t.proposalId === proposalId);
}

/**
 * Mark a repair task as completed.
 */
export function completeRepair(repairTaskId: string): boolean {
    const task = REPAIR_QUEUE.find(t => t.repairTaskId === repairTaskId);
    if (!task) return false;
    task.status = 'completed';
    return true;
}

/**
 * v14.3: Mark a repair task as in_progress.
 */
export function startRepair(repairTaskId: string): boolean {
    const task = REPAIR_QUEUE.find(t => t.repairTaskId === repairTaskId);
    if (!task) return false;
    task.status = 'in_progress';
    return true;
}

/**
 * Get repair queue size.
 */
export function repairQueueSize(): number {
    return REPAIR_QUEUE.length;
}