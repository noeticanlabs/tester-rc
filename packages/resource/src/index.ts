// @cohbit/resource — Noetican Resource Layer v0.1.0
// Governs what the system may spend, reserve, consume, defer, throttle, or refuse.
//
// Core law:
//   Capability ≠ permission. Permission ≠ affordability. Affordability ≠ wisdom.
//
// Position: Tooling Layer asks "What should be executed?"
//           Resource Layer asks "What can be spent safely?"

export const RESOURCE_NAME = '@cohbit/resource';
export const RESOURCE_VERSION = '0.6.0';

export { type ResourceType, RESOURCE_REGISTRY, registerResource, getResource, isTracked, requiresReceipt } from './R0_registry.js';
export { type ComputeBudget, createComputeBudget, authorizeCompute, recordCompute, type BudgetStatus } from './R1_compute.js';
export { type MemoryBudget, createMemoryBudget, checkMemoryLimit } from './R2_memory.js';
export { type StorageBudget, createStorageBudget, checkStorageLimit } from './R3_storage.js';
export { type TokenBudget, createTokenBudget, recordTokenUse } from './R4_tokens.js';
export { type TimeBudget, createTimeBudget, checkTimeout, recordElapsed } from './R5_time.js';
export { type ToolCallBudget, createToolCallBudget, recordToolCall, isExhausted, remainingCalls } from './R6_tool_calls.js';
export { type RepairBacklogBudget, createRepairBudget, checkBacklogHealth, isHealthy } from './R11_repair.js';
export { type AuthorityAction, type AuthorityBudget, createAuthorityBudget, canSpendAuthority, spendAuthority } from './R14_authority.js';
export { type RiskType, type RiskBudget, createRiskBudget, assessRisk, shouldBlock } from './R15_risk.js';
export { type ResourceReceipt, createResourceReceipt, closeResourceReceipt } from './R18_receipt.js';
export { type ReviewType, type HumanAttentionBudget, createHumanAttentionBudget, HIGH_PRIORITY_REVIEW_TYPES, isHighPriorityReview } from './R7_human_attention.js';
export { type ExternalAccessType, type NetworkBudget, createNetworkBudget, recordNetworkRequest, isExhausted as isNetworkExhausted } from './R8_network.js';
export { type ProofStopCondition, type ProofSearchBudget, createProofSearchBudget, recordProofAttempt, blockProofSearch } from './R9_proof_search.js';
export { type BenchmarkBudget, createBenchmarkBudget, recordBenchmarkCase } from './R10_benchmark.js';
export { type ReceiptStorageBudget, createReceiptStorageBudget, checkReceiptStorageHealth } from './R12_receipt_storage.js';
export { type EnvironmentalCostBudget, createEnvironmentalCostBudget, recordEnvironmentalCost } from './R13_energy.js';
export { type ScheduledAction, type PriorityScheduler, createPriorityScheduler, addCandidate, selectTopAction } from './R16_scheduler.js';
export { type ThrottleDecision, type ThrottleRecord, createThrottleRecord, isBlocked, requiresHumanReview, isDeferred } from './R17_throttle.js';
export { type HealthStatus, type ResourceHealth, createResourceHealth } from './R19_dashboard.js';
export { type ResourceForecast, createResourceForecast } from './R20_forecast.js';
