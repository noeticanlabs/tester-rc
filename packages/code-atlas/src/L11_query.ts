// @cohbit/code-atlas — L11 Query / Retrieval Layer
export type QueryShape = 'by_invariant' | 'by_transition' | 'by_language' | 'by_failure_mode' | 'by_evidence_level' | 'by_verifier_status';
export interface AtlasQuery { queryId: string; queryShape: QueryShape; parameters: Record<string, string>; description: string; }
export function createQuery(params: { queryShape: QueryShape; parameters: Record<string, string>; description: string }): AtlasQuery { return { queryId: `QUERY_${Date.now().toString(36)}`, ...params }; }