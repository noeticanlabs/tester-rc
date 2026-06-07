// @cohbit/code-atlas — L10 Cross-Language Memory Graph Layer
// Links equivalent invariant knowledge across languages.
export type MemoryEdgeType = 'maps_to' | 'uses_invariant' | 'projects_to' | 'verified_by' | 'receipted_as' | 'failed_by' | 'repair_required_by' | 'repaired_by' | 'preferred_over' | 'stale_due_to' | 'allowed_by' | 'blocked_by';
export interface MemoryEdge { from: string; to: string; edgeType: MemoryEdgeType; }
export interface CrossLanguageStatus { python?: string; typescript?: string; rust?: string; c?: string; lean?: string; }
export interface MemoryGraph { graphId: string; transitionId: string; crossLanguageStatus: CrossLanguageStatus; reusePermission: 'none' | 'partial' | 'full'; reason: string; edges: MemoryEdge[]; }
export function createMemoryGraph(params: { transitionId: string; crossLanguageStatus: CrossLanguageStatus; reusePermission: 'none' | 'partial' | 'full'; reason: string; edges?: MemoryEdge[] }): MemoryGraph { return { graphId: `XLG_${params.transitionId}`, ...params, edges: params.edges ?? [] }; }