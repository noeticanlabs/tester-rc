// @cohbit/tooling — R21 Processor Runtime (v11.1)
// Wraps the R21 compute processor registry into live operation tracking.
// Integrates with integrated_pipeline.ts, teaching.ts, and resource governor.
//
// Operating law:
//   Every auditable operation creates a processor record.
//   Heuristic processors produce advisory output only.
//   Deterministic processors may enforce repeatable boundaries.
//   Hybrid processors must route heuristic outputs through deterministic gates.
//   No processor directly commits state.
//   Processor records are linked to resource receipts for accounting.

import {
    createProcessorRecord,
    authorizeProcessorRecord,
    completeProcessorRecord,
    getProcessorProfile,
    explainProcessorBoundary,
    type ComputeProcessorRecord,
    type ProcessorKind,
    type ProcessorStatus,
} from "./R21_compute_processor_map.js";

// ─── Types ─────────────────────────────────────────────────────

export interface ProcessorFragment {
    processorId: string;
    kind: string;
    status: ProcessorStatus;
    logic: string;
    evidenceLevel: string;
    cpuMs: number | undefined;
    memoryMb: number | undefined;
    filesRead: number | undefined;
    bytesRead: number | undefined;
    limitation: string;
    boundaryExplanation: string;
}

export interface RuntimeProcessorResult<T = unknown> {
    processor: ComputeProcessorRecord;
    result: T;
    receiptFragment: ProcessorFragment;
}

// ─── Core Runtime Functions ────────────────────────────────────

/**
 * Begin a governed processor operation.
 * Creates a processor record in "planned" status.
 * Does not authorize — authorization requires a budget from the resource governor.
 */
export function beginProcessor(
    kind: ProcessorKind,
    input?: {
        inputSummary: string | undefined;
        budgetId: string | undefined;
        evidenceLevel: "none" | "surface_detected" | "syntax_checked" | "human_reviewed" | "unit_tested" | "receipt_available" | undefined;
    },
): ComputeProcessorRecord {
    const record = createProcessorRecord(kind, {
        inputSummary: input?.inputSummary,
        budgetId: input?.budgetId,
        evidenceLevel: input?.evidenceLevel,
        startedAt: new Date().toISOString(),
        status: "planned",
    });
    return record;
}

/**
 * Authorize a processor under a resource budget.
 * Must be called before the processor runs if requiresBudget is true.
 */
export function authorizeProcessor(
    processor: ComputeProcessorRecord,
    budgetId: string,
): ComputeProcessorRecord {
    return authorizeProcessorRecord(processor, budgetId);
}

/**
 * Complete a processor with actual runtime measurements.
 */
export function completeProcessor(
    processor: ComputeProcessorRecord,
    actuals: {
        cpuMs: number | undefined;
        gpuMs: number | undefined;
        memoryMb: number | undefined;
        filesRead: number | undefined;
        bytesRead: number | undefined;
        toolCalls: number | undefined;
        outputSummary: string | undefined;
        evidenceLevel: "none" | "surface_detected" | "syntax_checked" | "human_reviewed" | "unit_tested" | "receipt_available" | undefined;
    },
): ComputeProcessorRecord {
    return completeProcessorRecord(processor, actuals);
}

/**
 * Deny a processor that cannot be authorized or has exceeded its budget.
 */
export function denyProcessor(
    processor: ComputeProcessorRecord,
    reason: string,
): ComputeProcessorRecord {
    return {
        ...processor,
        status: "denied",
        endedAt: new Date().toISOString(),
        notes: [...processor.notes, `Processor denied: ${reason}`],
    };
}

/**
 * Mark a processor as throttled (running but resource-constrained).
 */
export function throttleProcessor(processor: ComputeProcessorRecord): ComputeProcessorRecord {
    return {
        ...processor,
        status: "throttled",
        notes: [...processor.notes, "Processor throttled due to resource constraint."],
    };
}

/**
 * Mark a processor as failed.
 */
export function failProcessor(
    processor: ComputeProcessorRecord,
    error: string,
): ComputeProcessorRecord {
    return {
        ...processor,
        status: "failed",
        endedAt: new Date().toISOString(),
        notes: [...processor.notes, `Processor failed: ${error}`],
    };
}

/**
 * Convert a processor record into a receipt fragment for resource accounting.
 * This fragment is attached to resource receipts to prove which processor
 * executed which operation under what constraints.
 */
export function processorRecordToReceiptFragment(
    processor: ComputeProcessorRecord,
): ProcessorFragment {
    return {
        processorId: processor.processorId,
        kind: processor.kind,
        status: processor.status,
        logic: processor.logic,
        evidenceLevel: processor.evidenceLevel ?? "none",
        cpuMs: processor.cpuMs,
        memoryMb: processor.memoryMb,
        filesRead: processor.filesRead,
        bytesRead: processor.bytesRead,
        limitation: processor.limitation,
        boundaryExplanation: explainProcessorBoundary(processor),
    };
}

// ─── High-Level Wrappers ──────────────────────────────────────

/**
 * Execute a function under a governed processor context.
 * Handles begin → authorize → execute → complete/deny/fail lifecycle.
 *
 * If the processor requires a budget and none is provided, the operation
 * is denied with a clear reason.
 */
export async function withProcessor<T>(
    kind: ProcessorKind,
    budgetId: string | undefined,
    fn: () => Promise<T>,
    input?: {
        inputSummary?: string;
        evidenceLevel?: "none" | "surface_detected" | "syntax_checked" | "human_reviewed" | "unit_tested" | "receipt_available";
    },
): Promise<RuntimeProcessorResult<T>> {
    const profile = getProcessorProfile(kind);
    let processor = beginProcessor(kind, {
        inputSummary: input?.inputSummary ?? `${kind} operation`,
        budgetId,
        evidenceLevel: input?.evidenceLevel ?? undefined,
    });

    // Deny if budget is required but not provided
    if (profile.requiresBudget && !budgetId) {
        processor = denyProcessor(processor, "No resource budget provided for budget-required processor.");
        return {
            processor,
            result: (() => {
                throw new Error(`Processor ${kind} requires a budget but none was provided.`);
            }) as unknown as T,
            receiptFragment: processorRecordToReceiptFragment(processor),
        };
    }

    // Authorize
    if (budgetId) {
        processor = authorizeProcessor(processor, budgetId);
    }

    const startCpu = Date.now();
    try {
        const result = await fn();
        const cpuMs = Date.now() - startCpu;
        processor = completeProcessor(processor, {
            cpuMs,
            gpuMs: undefined,
            memoryMb: undefined,
            filesRead: undefined,
            bytesRead: undefined,
            toolCalls: undefined,
            outputSummary: typeof result === "string" ? (result as string).slice(0, 200) : "operation_completed",
            evidenceLevel: input?.evidenceLevel,
        });
        return {
            processor,
            result,
            receiptFragment: processorRecordToReceiptFragment(processor),
        };
    } catch (err: any) {
        processor = failProcessor(processor, err?.message ?? "Unknown error");
        return {
            processor,
            result: (() => { throw err; }) as unknown as T,
            receiptFragment: processorRecordToReceiptFragment(processor),
        };
    }
}

/**
 * Execute a synchronous function under a governed processor context.
 */
export function withProcessorSync<T>(
    kind: ProcessorKind,
    budgetId: string | undefined,
    fn: () => T,
    input?: {
        inputSummary?: string;
        evidenceLevel?: "none" | "surface_detected" | "syntax_checked" | "human_reviewed" | "unit_tested" | "receipt_available";
    },
): RuntimeProcessorResult<T> {
    const profile = getProcessorProfile(kind);
    let processor = beginProcessor(kind, {
        inputSummary: input?.inputSummary ?? `${kind} operation`,
        budgetId,
        evidenceLevel: input?.evidenceLevel,
    });

    if (profile.requiresBudget && !budgetId) {
        processor = denyProcessor(processor, "No resource budget provided for budget-required processor.");
        return {
            processor,
            result: (() => {
                throw new Error(`Processor ${kind} requires a budget but none was provided.`);
            }) as unknown as T,
            receiptFragment: processorRecordToReceiptFragment(processor),
        };
    }

    if (budgetId) {
        processor = authorizeProcessor(processor, budgetId);
    }

    const startCpu = Date.now();
    try {
        const result = fn();
        const cpuMs = Date.now() - startCpu;
        processor = completeProcessor(processor, {
            cpuMs,
            gpuMs: undefined,
            memoryMb: undefined,
            filesRead: undefined,
            bytesRead: undefined,
            toolCalls: undefined,
            outputSummary: typeof result === "string" ? (result as string).slice(0, 200) : "operation_completed",
            evidenceLevel: input?.evidenceLevel,
        });
        return {
            processor,
            result,
            receiptFragment: processorRecordToReceiptFragment(processor),
        };
    } catch (err: any) {
        processor = failProcessor(processor, err?.message ?? "Unknown error");
        return {
            processor,
            result: (() => { throw err; }) as unknown as T,
            receiptFragment: processorRecordToReceiptFragment(processor),
        };
    }
}

// ─── Aggregate Reporting ──────────────────────────────────────

export interface ProcessorSummary {
    totalProcessors: number;
    completed: number;
    denied: number;
    failed: number;
    throttled: number;
    futureProcessors: number;
    fragments: ProcessorFragment[];
}

/**
 * Aggregate a collection of runtime processor results into a summary.
 */
export function aggregateProcessorResults(
    results: RuntimeProcessorResult<any>[],
): ProcessorSummary {
    const fragments: ProcessorFragment[] = [];
    let completed = 0;
    let denied = 0;
    let failed = 0;
    let throttled = 0;
    let futureProcessors = 0;

    for (const r of results) {
        fragments.push(r.receiptFragment);
        switch (r.processor.status) {
            case "completed":
                completed++;
                break;
            case "denied":
                denied++;
                break;
            case "failed":
                failed++;
                break;
            case "throttled":
                throttled++;
                break;
            case "future_not_connected":
                futureProcessors++;
                break;
        }
    }

    return {
        totalProcessors: results.length,
        completed,
        denied,
        failed,
        throttled,
        futureProcessors,
        fragments,
    };
}