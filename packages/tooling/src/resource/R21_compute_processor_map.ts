// @cohbit/tooling — R21 Compute Processor Map (v11.0)
// Maps every auditable operation into a governed compute pathway.
// Core doctrine: CPU preserves authority. GPU expands possibility.
// Hybrid requires deterministic gates. CohBit receipts the boundary.
//
// Operating law:
//   Heuristic compute may expand possible paths.
//   Deterministic compute may govern admissible paths.
//   GPU may accelerate exploration.
//   CPU must preserve authority, receipts, gates, and commitments.
//   Hybrid computation is allowed only when heuristic outputs are rechecked by deterministic CPU gates.
//   No processor directly commits state.

import { createHash } from "node:crypto";

// ─── Types ─────────────────────────────────────────────────────

export type ComputeLogic = "deterministic" | "heuristic" | "hybrid";
export type ComputeDevice = "cpu" | "gpu" | "cpu_gpu_hybrid" | "none" | "future_not_connected";
export type NoeticanComputeLayer = "UPT_possibility" | "APT_admissibility" | "CohBit_receipt" | "Atlas_memory" | "Teaching_explanation" | "TLT_language" | "Resource_accounting" | "Tooling_operation";
export type ComputeAuthority = "may_suggest" | "may_rank" | "may_route" | "may_block" | "may_receipt" | "may_preserve_state" | "may_not_authorize" | "may_not_commit" | "may_not_certify" | "may_not_claim_truth_beyond_evidence";
export type ProcessorStatus = "planned" | "authorized" | "running" | "completed" | "denied" | "throttled" | "failed" | "future_not_connected";
export type ProcessorKind = "audit_scan" | "content_read" | "rust_risk_scan" | "rust_ast_lite_parse" | "repo_intelligence" | "review_queue_build" | "obligation_reconcile" | "receipt_emit" | "teaching_generation" | "summary_generation" | "claim_guard" | "polarity_ingestion" | "polarity_compare" | "resource_accounting" | "future_local_model" | "future_embedding_search" | "future_gpu_symbolic_search" | "future_ctrl_verifier";
export type EvidenceLevel = "none" | "surface_detected" | "syntax_checked" | "human_reviewed" | "unit_tested" | "receipt_available";

// ─── Interfaces ────────────────────────────────────────────────

export interface ComputeProcessorProfile {
    kind: ProcessorKind; label: string; logic: ComputeLogic; device: ComputeDevice;
    layer: NoeticanComputeLayer; authority: ComputeAuthority[];
    requiresBudget: boolean; canThrottle: boolean; limitation: string;
    /** Curriculum module(s) that train the operator on this processor's domain */
    requiredModules: string[];
    /** Artifact produced as evidence of correct operation */
    evidenceArtifact: string;
    /** Receipt type emitted by this processor */
    receiptType: string;
    /** CIA risk class for the data/operation this processor handles */
    ciaRiskClass: "low" | "medium" | "high";
    /** What the operator must verify before trusting this processor's output */
    verificationRequirement: string;
    /** Expected rollback/recovery behavior if the processor fails */
    rollbackExpectation: string;
}

export interface ComputeProcessorRecord {
    processorId: string; kind: ProcessorKind; label: string;
    logic: ComputeLogic; device: ComputeDevice; layer: NoeticanComputeLayer;
    authority: ComputeAuthority[]; evidenceLevel: EvidenceLevel | undefined;
    bounded: boolean; authorized: boolean; budgetId: string | undefined; receiptId: string | undefined;
    status: ProcessorStatus; startedAt: string; endedAt: string | undefined;
    cpuMs: number | undefined; gpuMs: number | undefined; memoryMb: number | undefined;
    filesRead: number | undefined; bytesRead: number | undefined; toolCalls: number | undefined;
    inputSummary: string | undefined; outputSummary: string | undefined;
    limitation: string; notes: string[];
}

// ─── Processor Registry ───────────────────────────────────────

export const PROCESSOR_PROFILES: Record<ProcessorKind, ComputeProcessorProfile> = {
    audit_scan: {
        kind: "audit_scan", label: "Repository audit scan", logic: "heuristic", device: "cpu",
        layer: "UPT_possibility", authority: ["may_suggest", "may_rank", "may_not_authorize", "may_not_commit"],
        requiresBudget: true, canThrottle: true,
        limitation: "Audit scan surfaces possible findings; it does not prove defects.",
        requiredModules: ["M0", "M3", "M5", "M8"],
        evidenceArtifact: "integrated_audit_report",
        receiptType: "audit_receipt",
        ciaRiskClass: "medium",
        verificationRequirement: "Findings are surface_detected — must pass triage, obligation, and human review before becoming actionable.",
        rollbackExpectation: "Audit is observation-only; no filesystem mutation occurs. No rollback needed.",
    },
    content_read: {
        kind: "content_read", label: "Safe content read", logic: "deterministic", device: "cpu",
        layer: "Tooling_operation", authority: ["may_route", "may_not_commit"],
        requiresBudget: true, canThrottle: true,
        limitation: "Content read records file evidence; it does not interpret correctness.",
        requiredModules: ["M0", "M1"],
        evidenceArtifact: "content_read_receipt",
        receiptType: "processor_receipt",
        ciaRiskClass: "low",
        verificationRequirement: "Verify path safety, encoding detection, and budget compliance before trusting content.",
        rollbackExpectation: "Content read is non-mutating; no rollback needed.",
    },
    rust_risk_scan: {
        kind: "rust_risk_scan", label: "Rust risk scan", logic: "heuristic", device: "cpu",
        layer: "UPT_possibility", authority: ["may_suggest", "may_rank", "may_not_certify", "may_not_commit"],
        requiresBudget: true, canThrottle: true,
        limitation: "Risk scan produces review signals, not verified defects.",
        requiredModules: ["M3", "M8", "M9"],
        evidenceArtifact: "rust_risk_findings",
        receiptType: "scan_receipt",
        ciaRiskClass: "medium",
        verificationRequirement: "Rust risk scan is regex-based heuristic. Findings must be confirmed by human review or formal verification.",
        rollbackExpectation: "Scan is read-only; no rollback needed.",
    },
    rust_ast_lite_parse: {
        kind: "rust_ast_lite_parse", label: "Rust AST-lite structural parse", logic: "hybrid", device: "cpu",
        layer: "Tooling_operation", authority: ["may_route", "may_rank", "may_not_certify"],
        requiresBudget: true, canThrottle: true,
        limitation: "AST-lite improves structure awareness but is not full semantic verification.",
        requiredModules: ["M7", "M8"],
        evidenceArtifact: "ast_lite_symbols",
        receiptType: "parse_receipt",
        ciaRiskClass: "low",
        verificationRequirement: "AST-lite is structural parsing only. Not compiler-grade. Symbols require context validation.",
        rollbackExpectation: "Parse is read-only; no rollback needed.",
    },
    repo_intelligence: {
        kind: "repo_intelligence", label: "Repository intelligence", logic: "hybrid", device: "cpu",
        layer: "Atlas_memory", authority: ["may_rank", "may_route", "may_not_commit"],
        requiresBudget: true, canThrottle: true,
        limitation: "Repo intelligence prioritizes review targets; it does not authorize repair.",
        requiredModules: ["M0", "M7"],
        evidenceArtifact: "repo_intelligence_report",
        receiptType: "intelligence_receipt",
        ciaRiskClass: "low",
        verificationRequirement: "File prioritization is advisory. Rankings do not prove severity or correctness.",
        rollbackExpectation: "Intelligence is read-only; no rollback needed.",
    },
    review_queue_build: {
        kind: "review_queue_build", label: "Review queue build", logic: "deterministic", device: "cpu",
        layer: "APT_admissibility", authority: ["may_route", "may_block", "may_not_commit"],
        requiresBudget: true, canThrottle: false,
        limitation: "Review queue assigns priority; it does not prove a defect.",
        requiredModules: ["M3", "M11"],
        evidenceArtifact: "review_queue",
        receiptType: "queue_receipt",
        ciaRiskClass: "medium",
        verificationRequirement: "Queue ordering is priority-based. Human reviewer must independently assess each finding.",
        rollbackExpectation: "Queue is in-memory; rebuilt on each audit. No rollback needed.",
    },
    obligation_reconcile: {
        kind: "obligation_reconcile", label: "Repair obligation reconciliation", logic: "deterministic", device: "cpu",
        layer: "APT_admissibility", authority: ["may_preserve_state", "may_route", "may_not_commit"],
        requiresBudget: true, canThrottle: false,
        limitation: "Obligation reconciliation tracks responsibility; it does not close obligations by itself.",
        requiredModules: ["M0", "M4", "M11"],
        evidenceArtifact: "obligation_store",
        receiptType: "obligation_receipt",
        ciaRiskClass: "high",
        verificationRequirement: "Obligations persist tracked responsibility. Changes require content evidence hash matching. Never auto-close high-severity obligations.",
        rollbackExpectation: "Obligation store is persisted. Previous state preserved via reconciliation dedup.",
    },
    receipt_emit: {
        kind: "receipt_emit", label: "Receipt emission", logic: "deterministic", device: "cpu",
        layer: "CohBit_receipt", authority: ["may_receipt", "may_preserve_state", "may_not_claim_truth_beyond_evidence"],
        requiresBudget: true, canThrottle: false,
        limitation: "Receipt records boundaries and evidence; it does not prove correctness.",
        requiredModules: ["M0", "M2", "M11"],
        evidenceArtifact: "cohbit_receipt",
        receiptType: "cohbit_receipt",
        ciaRiskClass: "low",
        verificationRequirement: "Receipt certifies decision accountability, not decision correctness. Hash-linked chain integrity must be verified.",
        rollbackExpectation: "Receipts are append-only. Once emitted, they are immutable evidence of the decision boundary.",
    },
    teaching_generation: {
        kind: "teaching_generation", label: "Teaching response generation", logic: "hybrid", device: "cpu",
        layer: "Teaching_explanation", authority: ["may_suggest", "may_not_certify", "may_not_commit"],
        requiresBudget: true, canThrottle: true,
        limitation: "Teaching output explains; it does not certify learner understanding.",
        requiredModules: ["M0-M11 (all)"],
        evidenceArtifact: "teaching_receipt",
        receiptType: "teaching_receipt",
        ciaRiskClass: "low",
        verificationRequirement: "Teaching output is advisory explanation. Does not certify understanding, promote canon, or claim training completion.",
        rollbackExpectation: "Teaching is read-only; no rollback needed.",
    },
    summary_generation: {
        kind: "summary_generation", label: "Evidence-aware summary generation", logic: "hybrid", device: "cpu",
        layer: "TLT_language", authority: ["may_suggest", "may_not_claim_truth_beyond_evidence"],
        requiresBudget: true, canThrottle: true,
        limitation: "Summary may explain graph state; it may not upgrade graph evidence.",
        requiredModules: ["M0", "M7"],
        evidenceArtifact: "evidence_aware_summary",
        receiptType: "summary_receipt",
        ciaRiskClass: "low",
        verificationRequirement: "Summary inherits evidence ceiling from source nodes. Claim guard enforces verb downgrade. Check evidence level before citing.",
        rollbackExpectation: "Summary generation is read-only; no rollback needed.",
    },
    claim_guard: {
        kind: "claim_guard", label: "Claim boundary guard", logic: "deterministic", device: "cpu",
        layer: "APT_admissibility", authority: ["may_block", "may_route", "may_not_commit"],
        requiresBudget: true, canThrottle: false,
        limitation: "Claim guard blocks overclaim; it does not prove the weaker claim.",
        requiredModules: ["M0", "M3"],
        evidenceArtifact: "claim_guard_violations",
        receiptType: "guard_receipt",
        ciaRiskClass: "high",
        verificationRequirement: "Claim guard enforces verb-evidence matching. Overclaims are blocked, not downgraded. Operator must review blocked claims.",
        rollbackExpectation: "Blocked claims are preserved in violation log. No mutation occurred; no rollback needed.",
    },
    polarity_ingestion: {
        kind: "polarity_ingestion", label: "Learning polarity ingestion", logic: "hybrid", device: "cpu",
        layer: "TLT_language", authority: ["may_route", "may_suggest", "may_not_certify"],
        requiresBudget: true, canThrottle: true,
        limitation: "Polarity records structured learning evidence; they do not train the model.",
        requiredModules: ["M0"],
        evidenceArtifact: "polarity_record",
        receiptType: "polarity_receipt",
        ciaRiskClass: "low",
        verificationRequirement: "Polarity records are structured learning artifacts. Confidence scores reflect governance pressure, not ground truth.",
        rollbackExpectation: "Polarity records are append-only. Previous record preserved for comparison.",
    },
    polarity_compare: {
        kind: "polarity_compare", label: "Polarity history comparison", logic: "deterministic", device: "cpu",
        layer: "Atlas_memory", authority: ["may_route", "may_not_certify"],
        requiresBudget: true, canThrottle: false,
        limitation: "Comparison shows drift in records; it does not prove causal improvement.",
        requiredModules: ["M0"],
        evidenceArtifact: "polarity_comparison",
        receiptType: "comparison_receipt",
        ciaRiskClass: "low",
        verificationRequirement: "Comparison shows record drift. Changes must be correlated with corpus changes. Unexplained drift is flagged, not accepted.",
        rollbackExpectation: "Comparison is read-only; no rollback needed.",
    },
    resource_accounting: {
        kind: "resource_accounting", label: "Resource accounting", logic: "deterministic", device: "cpu",
        layer: "Resource_accounting", authority: ["may_receipt", "may_preserve_state"],
        requiresBudget: true, canThrottle: false,
        limitation: "Resource accounting records consumption; it does not validate semantic correctness.",
        requiredModules: ["M5"],
        evidenceArtifact: "resource_receipt",
        receiptType: "resource_receipt",
        ciaRiskClass: "medium",
        verificationRequirement: "Resource accounting records budget consumption. Over-budget operations produce governed failure, not silent overrun.",
        rollbackExpectation: "Budget records are immutable evidence. If budget exceeded, operation is denied before execution.",
    },
    future_local_model: {
        kind: "future_local_model", label: "Future local model call", logic: "heuristic", device: "future_not_connected",
        layer: "UPT_possibility", authority: ["may_suggest", "may_not_authorize", "may_not_certify", "may_not_commit"],
        requiresBudget: true, canThrottle: true,
        limitation: "Future model route is not connected; no model evidence exists.",
        requiredModules: ["M6", "M9"],
        evidenceArtifact: "future_not_available",
        receiptType: "future_receipt",
        ciaRiskClass: "high",
        verificationRequirement: "Local model output is heuristic. Must be treated as proposal-only. GPU/local model routing remains future infrastructure.",
        rollbackExpectation: "Future route — no current execution path.",
    },
    future_embedding_search: {
        kind: "future_embedding_search", label: "Future embedding search", logic: "heuristic", device: "future_not_connected",
        layer: "UPT_possibility", authority: ["may_rank", "may_not_certify"],
        requiresBudget: true, canThrottle: true,
        limitation: "Future embedding route is not connected; no embedding evidence exists.",
        requiredModules: ["M6"],
        evidenceArtifact: "future_not_available",
        receiptType: "future_receipt",
        ciaRiskClass: "medium",
        verificationRequirement: "Embedding search is similarity-based ranking, not semantic proof. Results must be independently verified.",
        rollbackExpectation: "Future route — no current execution path.",
    },
    future_gpu_symbolic_search: {
        kind: "future_gpu_symbolic_search", label: "Future GPU symbolic search", logic: "heuristic", device: "future_not_connected",
        layer: "UPT_possibility", authority: ["may_suggest", "may_rank", "may_not_authorize"],
        requiresBudget: true, canThrottle: true,
        limitation: "Future GPU route is not connected; no GPU computation occurred.",
        requiredModules: ["M5", "M9", "M10"],
        evidenceArtifact: "future_not_available",
        receiptType: "future_receipt",
        ciaRiskClass: "high",
        verificationRequirement: "GPU search expands possibility space but does not govern admissibility. All GPU output must route through deterministic CPU gates.",
        rollbackExpectation: "Future route — no current execution path.",
    },
    future_ctrl_verifier: {
        kind: "future_ctrl_verifier", label: "Future CTRL verifier route", logic: "deterministic", device: "future_not_connected",
        layer: "APT_admissibility", authority: ["may_route", "may_not_commit"],
        requiresBudget: true, canThrottle: true,
        limitation: "CTRL verifier route is not connected; no formal verification evidence exists.",
        requiredModules: ["M9", "M10"],
        evidenceArtifact: "future_not_available",
        receiptType: "future_receipt",
        ciaRiskClass: "high",
        verificationRequirement: "CTRL verifier provides formal proof checking but does not certify specification correctness. Garbage in, proof out.",
        rollbackExpectation: "Future route — no current execution path.",
    },
};

// ─── Core Functions ───────────────────────────────────────────

export function getProcessorProfile(kind: ProcessorKind): ComputeProcessorProfile {
    return PROCESSOR_PROFILES[kind];
}

export function createProcessorRecord(
    kind: ProcessorKind,
    input?: {
        processorId?: string | undefined;
        kind?: ProcessorKind | undefined;
        label?: string | undefined;
        logic?: ComputeLogic | undefined;
        device?: ComputeDevice | undefined;
        layer?: NoeticanComputeLayer | undefined;
        authority?: ComputeAuthority[] | undefined;
        evidenceLevel?: EvidenceLevel | undefined;
        bounded?: boolean | undefined;
        authorized?: boolean | undefined;
        budgetId?: string | undefined;
        receiptId?: string | undefined;
        status?: ProcessorStatus | undefined;
        startedAt?: string | undefined;
        endedAt?: string | undefined;
        cpuMs?: number | undefined;
        gpuMs?: number | undefined;
        memoryMb?: number | undefined;
        filesRead?: number | undefined;
        bytesRead?: number | undefined;
        toolCalls?: number | undefined;
        inputSummary?: string | undefined;
        outputSummary?: string | undefined;
        limitation?: string | undefined;
        notes?: string[] | undefined;
    },
): ComputeProcessorRecord {
    const profile = getProcessorProfile(kind);
    const seed = input?.inputSummary
        ? `${kind}:${input.inputSummary}:${input.budgetId ?? "no-budget"}`
        : `${kind}:${input?.budgetId ?? "no-budget"}:${input?.startedAt ?? new Date().toISOString()}`;

    return {
        processorId: `PROC_${createHash("sha256").update(seed).digest("hex").slice(0, 16)}`,
        kind, label: profile.label, logic: profile.logic, device: profile.device,
        layer: profile.layer, authority: profile.authority,
        evidenceLevel: input?.evidenceLevel ?? "none",
        bounded: input?.bounded ?? true,
        authorized: input?.authorized ?? false,
        budgetId: input?.budgetId, receiptId: input?.receiptId,
        status: input?.status ?? "planned",
        startedAt: input?.startedAt ?? new Date().toISOString(),
        endedAt: undefined,
        cpuMs: undefined, gpuMs: undefined, memoryMb: undefined,
        filesRead: undefined, bytesRead: undefined, toolCalls: undefined,
        limitation: profile.limitation,
        notes: input?.notes ?? [],
        inputSummary: input?.inputSummary, outputSummary: input?.outputSummary,
    };
}

export function authorizeProcessorRecord(record: ComputeProcessorRecord, budgetId: string): ComputeProcessorRecord {
    return {
        ...record, authorized: true, budgetId, status: "authorized",
        notes: [...record.notes, "Processor authorized under resource budget."]
    };
}

export function completeProcessorRecord(record: ComputeProcessorRecord, actuals: { cpuMs?: number | undefined; gpuMs?: number | undefined; memoryMb?: number | undefined; filesRead?: number | undefined; bytesRead?: number | undefined; toolCalls?: number | undefined; outputSummary?: string | undefined; evidenceLevel?: EvidenceLevel | undefined; }): ComputeProcessorRecord {
    return {
        ...record, ...actuals, status: "completed", endedAt: new Date().toISOString(),
        notes: [...record.notes, "Processor completed and recorded."]
    };
}

// ─── Boundary Guards ──────────────────────────────────────────

export function canAuthorizeAction(record: ComputeProcessorRecord): boolean {
    if (record.logic === "heuristic") return false;
    if (record.device === "gpu" || record.device === "future_not_connected") return false;
    return record.authority.includes("may_block") || record.authority.includes("may_route") || record.authority.includes("may_receipt");
}

export function canCommitState(_record: ComputeProcessorRecord): boolean {
    return false;
}

export function isFutureProcessor(record: ComputeProcessorRecord): boolean {
    return record.device === "future_not_connected";
}

export function processorDoctrineSummary(): string {
    return "CPU preserves authority. GPU expands possibility. Hybrid requires deterministic gates. CohBit receipts the boundary.";
}

export function explainProcessorBoundary(record: ComputeProcessorRecord): string {
    if (record.logic === "heuristic") {
        return "This processor may suggest or rank possibilities, but it may not authorize, certify, or commit state.";
    }
    if (record.logic === "deterministic") {
        return "This processor may enforce repeatable boundaries within scope, but it does not prove truth beyond its evidence level.";
    }
    return "This hybrid processor must route heuristic outputs through deterministic gates before any action can proceed.";
}