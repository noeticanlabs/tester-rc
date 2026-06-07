// @cohbit/tooling — Noetican Tooling Layer v0.1.0
// Executable bridge between CohBit-copilot, atlas memory systems,
// validators, and receipts.
//
// Governing law:
//   The Atlas stores memory. The copilot proposes.
//   The Tooling Layer executes the workflow.
//   Receipts decide what persists.

export const TOOLING_NAME = '@cohbit/tooling';
export const TOOLING_VERSION = '0.8.0';

export { type ToolType, type ToolRecord, registerTool, getTool, isActionAllowed, TOOL_REGISTRY } from './T0_registry.js';
export { type AtlasTarget, type RoutingRecord, routeContent } from './T5_router.js';
export { type RiskWarning, scanRisks } from './T7_risk_scanner.js';
export { type IngestionResult, ingestFile, ingestFiles } from './T4_ingestion.js';
export { type CodeAnalysisResult, analyzeCode } from './T12_code_adapter.js';
export { type LanguageAnalysisResult, analyzeLanguage } from './T13_language_adapter.js';
export { type UniversalReceiptStatus, type ReceiptDomain, type UniversalReceipt, emitReceipt, validateReceiptClaim } from './T9_receipt_engine.js';
export { type ValidationResult, validateReceiptRecord, validateCanonicalRecord, validateRepairRecord } from './T6_validator.js';
export { type RepairPriority, type RepairCategory, type RepairTask, enqueueRepair, getOpenRepairs, getRepairsByPriority, completeRepair, repairQueueSize, REPAIR_QUEUE } from './T8_repair_queue.js';
export { type MathAnalysisResult, analyzeMath } from './T14_math_adapter.js';
export { type RepoScanResult, scanRepository } from './T3_scanner.js';
export { type AuditReport, generateAuditReport, generateAuditMarkdown } from './T17_audit.js';
export { type RetrievalCandidate, type RejectedRetrieval, type GuardedRetrievalResult, guardRetrieval, rejectStaleOrUnsupported, detectClaimInflation, requireReceiptForStrongClaims, detectPublicInternalCollapse, rankByEvidence } from './T15_retrieval_guard.js';
export { type BenchmarkResult, type BenchmarkSuite, runBenchmarkSuite, generateBenchmarkMarkdown, generateBenchmarkJson, benchmarkScanner, benchmarkRouter, benchmarkRiskScanner, benchmarkRetrievalGuard, benchmarkAuditReport } from './T19_benchmark.js';
export { type IntegratedAuditResult, auditRepository, generateIntegratedAuditMarkdown, generateIntegratedAuditJson } from './T_integrated_audit.js';
export { type PolicyMode, type ToolAction, type PolicyDecision, checkPolicy, requireMode, getActiveMode, setActiveMode, checkCurrentPolicy } from './T_policy_gate.js';
export { type ContentReadStatus, type ContentArtifact, type ContentReaderBudget, type ContentReadResult, readContentFiles, readRustFiles, readLeanFiles } from './T_content_reader.js';
export { type RustEvidenceLevel, type CodeRiskSeverity, type CodeRiskFinding, type RustRiskScanSummary, type RustRiskScanResult, scanRustContent, scanRustContentBatch } from './T_rust_risk_scanner.js';
export { type RustSymbolKind, type RustSymbol, type RustSymbolSummary, type RustSymbolResult, extractRustSymbols, extractRustSymbolBatch } from './T_rust_symbol_extractor.js';
export { type ReviewPriority, type ReviewQueueItem, type ReviewQueue, buildReviewQueue, topFindings, findingsByPriority, reviewQueueToJson, reviewQueueSummary } from './T_rust_review_queue.js';
