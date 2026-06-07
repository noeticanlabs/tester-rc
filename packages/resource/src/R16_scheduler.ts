// @cohbit/resource — R16 Priority Scheduler Layer
// Chooses what to do first when resources are limited.
// Spec: Noetican Resource Layer v0.1 §20

export interface ScheduledAction {
    action: string; priorityScore: number; reason: string;
}
export interface PriorityScheduler {
    prioritySchedulerId: string; workspaceId: string;
    candidateActions: ScheduledAction[]; selectedAction?: string;
    status: 'evaluating' | 'scheduled'; createdAt: string;
}

let priCounter = 0;

export function createPriorityScheduler(params: { workspaceId: string }): PriorityScheduler {
    priCounter++;
    return { prioritySchedulerId: `PRIOR_${String(priCounter).padStart(6, '0')}`, workspaceId: params.workspaceId, candidateActions: [], status: 'evaluating', createdAt: new Date().toISOString() };
}

export function addCandidate(scheduler: PriorityScheduler, action: string, priorityScore: number, reason: string): PriorityScheduler {
    scheduler.candidateActions.push({ action, priorityScore, reason });
    return scheduler;
}

export function selectTopAction(scheduler: PriorityScheduler): PriorityScheduler {
    if (scheduler.candidateActions.length === 0) return scheduler;
    scheduler.candidateActions.sort((a, b) => b.priorityScore - a.priorityScore);
    scheduler.selectedAction = scheduler.candidateActions[0]!.action;
    scheduler.status = 'scheduled';
    return scheduler;
}