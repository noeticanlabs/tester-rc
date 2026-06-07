// @cohbit/code-atlas — L6 Language Projection Layer
// Projects invariants and transitions into specific language encodings.
// Spec source: Noetican Code Invariant Atlas v0.1 §L6

export type ProjectionStatus = 'draft' | 'accepted' | 'accepted_with_limitations' | 'repair_required' | 'rejected';

export interface LanguageProjection {
    projectionId: string; transitionId: string; invariantId: string;
    language: string; preferredEncoding: string; codePattern: string;
    notes: string[]; projectionStatus: ProjectionStatus;
}

export const PROJ_GDIV_RUST: LanguageProjection = { projectionId: 'PROJ_GDIV_RUST_001', transitionId: 'TRANS_001', invariantId: 'INV_006', language: 'rust', preferredEncoding: 'Option<f64>', codePattern: 'fn safe_div(a: f64, b: f64) -> Option<f64>', notes: ['Use Option for recoverable absence.', 'Avoid panic for expected zero denominator.'], projectionStatus: 'draft' };
export const PROJ_GDIV_TS: LanguageProjection = { projectionId: 'PROJ_GDIV_TS_001', transitionId: 'TRANS_001', invariantId: 'INV_006', language: 'typescript', preferredEncoding: 'number | null', codePattern: 'function safeDiv(a: number, b: number): number | null', notes: ['null return is conventional but ambiguous.', 'Consider Result<T,E> pattern for stronger encoding.'], projectionStatus: 'repair_required' };
export const PROJ_GDIV_PY: LanguageProjection = { projectionId: 'PROJ_GDIV_PY_001', transitionId: 'TRANS_001', invariantId: 'INV_006', language: 'python', preferredEncoding: 'Optional[float]', codePattern: 'def safe_div(a: float, b: float) -> Optional[float]:', notes: ['None return is idiomatic.', 'Type checker will enforce Optional handling.'], projectionStatus: 'accepted' };
export const PROJ_GDIV_C: LanguageProjection = { projectionId: 'PROJ_GDIV_C_001', transitionId: 'TRANS_001', invariantId: 'INV_006', language: 'c', preferredEncoding: 'int return + output pointer', codePattern: 'int safe_div(double a, double b, double *result)', notes: ['Return code signals success/failure.', 'Requires manual audit for safety.'], projectionStatus: 'accepted_with_limitations' };
export const PROJ_GDIV_LEAN: LanguageProjection = { projectionId: 'PROJ_GDIV_LEAN_001', transitionId: 'TRANS_001', invariantId: 'INV_006', language: 'lean', preferredEncoding: 'Option ℚ', codePattern: 'def safe_div (a b : ℚ) : Option ℚ := ...', notes: ['Proof obligation: b ≠ 0 must be discharged.', 'Option encoding is type-safe.'], projectionStatus: 'draft' };

export const PROJECTIONS: LanguageProjection[] = [PROJ_GDIV_RUST, PROJ_GDIV_TS, PROJ_GDIV_PY, PROJ_GDIV_C, PROJ_GDIV_LEAN];

export function getProjectionsByTransition(transitionId: string): LanguageProjection[] { return PROJECTIONS.filter(p => p.transitionId === transitionId); }
export function getProjectionsByLanguage(language: string): LanguageProjection[] { return PROJECTIONS.filter(p => p.language === language); }