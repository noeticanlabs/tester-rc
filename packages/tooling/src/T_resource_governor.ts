// @cohbit/tooling — T Resource Governor (v11.0)
// Standardized resource enforcement wrapper for all auditable operations.
// Wraps createBudget → authorizeCompute → execute → recordCompute → emit receipt.
//
// Operating law:
//   No auditable operation shall consume meaningful resources without
//   budget creation, authorization, recording, and receipt emission.
//   Budget exhaustion produces governed failure, not crash or silent overrun.
//   Budgets are optional — if not provided, the governor is a no-op pass-through.

import {
    createComputeBudget,
    authorizeCompute,
    recordCompute,
    type ComputeBudget,
} from '../../resource/src/R1_compute.js';
import {
    createTimeBudget,
    recordElapsed,
    type TimeBudget,
} from '../../resource/src/R5_time.js';
import {
    createResourceReceipt,
    closeResourceReceipt,
    type ResourceReceipt,
} from '../../resource/src/R18_receipt.js';

// ─── Types ─────────────────────────────────────────────────────

export interface GovernedBudget {
    computeLimit: number;   // seconds
    timeLimitMs: number;    // milliseconds
    toolCallLimit?: number; // optional tool call cap
}

export interface GovernedOperation {
    workflowId: string;
    budget?: GovernedBudget;
}

export interface GovernedResult<T> {
    result: T;
    budgetUsed: {
        computeMs: number;
        wallMs: number;
    };
    receipt: ResourceReceipt;
}

export interface GovernedFailure {
    error: string;
    budgetUsed: {
        computeMs: number;
        wallMs: number;
    };
    budgetStatus: string;
}

// ─── Default Budgets (per workflow type) ───────────────────────

const DEFAULT_BUDGETS: Record<string, GovernedBudget> = {
    // Gates
    'gate-propose': { computeLimit: 10, timeLimitMs: 30000 },
    'gate-review': { computeLimit: 5, timeLimitMs: 15000 },
    'gate-authorize': { computeLimit: 5, timeLimitMs: 15000 },
    'gate-apply': { computeLimit: 30, timeLimitMs: 60000 },
    'gate-test': { computeLimit: 120, timeLimitMs: 300000 },
    'gate-rollback': { computeLimit: 10, timeLimitMs: 30000 },
    'gate-receipt': { computeLimit: 5, timeLimitMs: 15000 },

    // Teaching
    'teach-explain': { computeLimit: 30, timeLimitMs: 60000 },
    'teach-quiz': { computeLimit: 15, timeLimitMs: 30000 },
    'teach-polarity': { computeLimit: 10, timeLimitMs: 20000 },
    'teach-curriculum': { computeLimit: 30, timeLimitMs: 60000 },
    'lesson-list': { computeLimit: 5, timeLimitMs: 15000 },
    'lesson-receipts': { computeLimit: 5, timeLimitMs: 15000 },
    'quiz-generate': { computeLimit: 15, timeLimitMs: 30000 },
    'polarity-list': { computeLimit: 10, timeLimitMs: 20000 },
    'polarity-compare': { computeLimit: 15, timeLimitMs: 30000 },

    // Obligations & Proposals
    'obligation-reconcile': { computeLimit: 30, timeLimitMs: 60000 },
    'obligations-list': { computeLimit: 10, timeLimitMs: 20000 },
    'proposal-build': { computeLimit: 15, timeLimitMs: 30000 },
    'dashboard-view': { computeLimit: 10, timeLimitMs: 20000 },

    // TLT
    'tlt-ingest': { computeLimit: 30, timeLimitMs: 60000 },
    'summary-generate': { computeLimit: 15, timeLimitMs: 30000 },

    // Reports
    'report-generate': { computeLimit: 10, timeLimitMs: 20000 },

    // CLI
    'cli-command': { computeLimit: 60, timeLimitMs: 120000 },

    // Repair pipeline (v14.5)
    'repair-review': { computeLimit: 15, timeLimitMs: 30000 },
    'propose-from-repair': { computeLimit: 20, timeLimitMs: 60000 },
    'repair-plan': { computeLimit: 30, timeLimitMs: 60000 },

    // Generic fallback
    'default': { computeLimit: 30, timeLimitMs: 60000 },
};

// ─── Governor ──────────────────────────────────────────────────

export async function runGoverned<T>(
    op: GovernedOperation,
    execute: () => Promise<T>,
): Promise<GovernedResult<T> | GovernedFailure> {
    const startTime = Date.now();
    const budget = op.budget ?? DEFAULT_BUDGETS[op.workflowId] ?? DEFAULT_BUDGETS['default']!;

    // 1. Create budgets
    const computeBudget = authorizeCompute(
        createComputeBudget({
            workflowId: op.workflowId,
            resourceType: 'cpu_time',
            budgetLimit: budget.computeLimit,
            estimatedUse: Math.ceil(budget.computeLimit * 0.5),
        }),
        true,
    );
    const timeBudget = createTimeBudget({
        workflowId: op.workflowId,
        budgetLimitMs: budget.timeLimitMs,
        estimatedMs: Math.ceil(budget.timeLimitMs * 0.5),
    });

    // If budget was not authorized (exhausted), fail fast
    if (computeBudget.status === 'exceeded') {
        const totalMs = Date.now() - startTime;
        return {
            error: `Compute budget exceeded before execution for ${op.workflowId}`,
            budgetUsed: { computeMs: 0, wallMs: totalMs },
            budgetStatus: computeBudget.status,
        };
    }

    // 2. Execute
    let result: T;
    try {
        result = await execute();
    } catch (err) {
        const totalMs = Date.now() - startTime;
        recordCompute(computeBudget, totalMs / 1000, `${op.workflowId}-error`);
        recordElapsed(timeBudget, totalMs);
        return {
            error: err instanceof Error ? err.message : String(err),
            budgetUsed: { computeMs: totalMs, wallMs: totalMs },
            budgetStatus: computeBudget.status,
        };
    }

    // 3. Record usage
    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, op.workflowId);
    recordElapsed(timeBudget, totalMs);

    // 4. Emit receipt
    const receipt = createResourceReceipt({
        workflowId: op.workflowId,
        authorizedResources: [
            `cpu_time:${budget.computeLimit}s`,
            `wall_time:${budget.timeLimitMs}ms`,
        ],
        outputsCreated: [op.workflowId],
    });
    closeResourceReceipt(receipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `wall_time:${totalMs}ms`,
    ], `${op.workflowId} completed in ${totalMs}ms`);

    // Verify budget not exceeded
    const computeUsed = totalMs / 1000;
    if (computeUsed > budget.computeLimit) {
        return {
            error: `Compute budget exceeded: ${computeUsed.toFixed(1)}s used of ${budget.computeLimit}s limit`,
            budgetUsed: { computeMs: totalMs, wallMs: totalMs },
            budgetStatus: 'exceeded',
        };
    }

    return {
        result,
        budgetUsed: { computeMs: totalMs, wallMs: totalMs },
        receipt,
    };
}

// ─── Synchronous variant ───────────────────────────────────────

export function runGovernedSync<T>(
    op: GovernedOperation,
    execute: () => T,
): GovernedResult<T> | GovernedFailure {
    const startTime = Date.now();
    const budget = op.budget ?? DEFAULT_BUDGETS[op.workflowId] ?? DEFAULT_BUDGETS['default']!;

    const computeBudget = authorizeCompute(
        createComputeBudget({
            workflowId: op.workflowId,
            resourceType: 'cpu_time',
            budgetLimit: budget.computeLimit,
            estimatedUse: Math.ceil(budget.computeLimit * 0.5),
        }),
        true,
    );
    const timeBudget = createTimeBudget({
        workflowId: op.workflowId,
        budgetLimitMs: budget.timeLimitMs,
        estimatedMs: Math.ceil(budget.timeLimitMs * 0.5),
    });

    if (computeBudget.status === 'exceeded') {
        const totalMs = Date.now() - startTime;
        return {
            error: `Compute budget exceeded before execution for ${op.workflowId}`,
            budgetUsed: { computeMs: 0, wallMs: totalMs },
            budgetStatus: computeBudget.status,
        };
    }

    let result: T;
    try {
        result = execute();
    } catch (err) {
        const totalMs = Date.now() - startTime;
        recordCompute(computeBudget, totalMs / 1000, `${op.workflowId}-error`);
        recordElapsed(timeBudget, totalMs);
        return {
            error: err instanceof Error ? err.message : String(err),
            budgetUsed: { computeMs: totalMs, wallMs: totalMs },
            budgetStatus: computeBudget.status,
        };
    }

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, op.workflowId);
    recordElapsed(timeBudget, totalMs);

    const receipt = createResourceReceipt({
        workflowId: op.workflowId,
        authorizedResources: [`cpu_time:${budget.computeLimit}s`, `wall_time:${budget.timeLimitMs}ms`],
        outputsCreated: [op.workflowId],
    });
    closeResourceReceipt(receipt, [`cpu_time:${(totalMs / 1000).toFixed(1)}s`, `wall_time:${totalMs}ms`], `${op.workflowId} completed in ${totalMs}ms`);

    return {
        result,
        budgetUsed: { computeMs: totalMs, wallMs: totalMs },
        receipt,
    };
}

// ─── Utility: check if result is a failure ─────────────────────

export function isGovernedFailure(result: GovernedResult<unknown> | GovernedFailure): result is GovernedFailure {
    return 'error' in result;
}

// ─── Utility: unwrap governed result (throws on failure) ───────

export function unwrapGoverned<T>(result: GovernedResult<T> | GovernedFailure): T {
    if ('error' in result) {
        throw new Error(`Governed operation failed: ${result.error}`);
    }
    return result.result;
}