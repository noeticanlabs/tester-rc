// @cohbit/tooling — Repo Intelligence (v3.5)
// Barrel export for the repo intelligence subsystem.
// Single import: import { buildRepoIntelligence } from './repo_intelligence/index.js'

export { buildFileIndex } from './repo_file_index.js';
export type { RepoFileIndex } from './repo_file_index.js';

export { buildSourceTestMap } from './repo_test_map.js';
export type { SourceTestMapping } from './repo_test_map.js';

export { computeRiskDistribution } from './repo_risk_distribution.js';
export type { FileRiskScore, ModuleRiskSummary } from './repo_risk_distribution.js';

export { buildRepoIntelligence } from './repo_audit_summary.js';
export type { RepoIntelligence } from './repo_audit_summary.js';