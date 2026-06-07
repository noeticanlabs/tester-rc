// @cohbit/math-atlas — M15 Cross-Model Memory Graph Layer
export type MathMemoryEdgeType = 'model_maps_to' | 'invariant_preserved_by' | 'proof_supported_by' | 'receipted_as' | 'generalizes' | 'specializes' | 'approximates' | 'blocked_by_risk';
export interface MathMemoryEdge { from: string; to: string; edgeType: MathMemoryEdgeType; }
export interface MathMemoryGraph { graphId: string; invariantId: string; crossModelStatus: Record<string, string>; edges: MathMemoryEdge[]; }
export function createMathMemoryGraph(params: { invariantId: string; crossModelStatus: Record<string, string>; edges?: MathMemoryEdge[] }): MathMemoryGraph { return { graphId: `MMEM_${Date.now().toString(36)}`, ...params, edges: params.edges ?? [] }; }