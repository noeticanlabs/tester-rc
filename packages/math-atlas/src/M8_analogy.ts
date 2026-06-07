// @cohbit/math-atlas — M8 Analogy Boundary Layer (6 statuses)
// Spec: v0.1 §12

export type AnalogyStatus = 'IllustrativeOnly' | 'StructuralAnalogy' | 'PartialFormalAnalogy' | 'ModelCandidate' | 'FormalizedMapping' | 'RejectedAnalogy';
export const ANALOGY_STATUSES: AnalogyStatus[] = ['IllustrativeOnly', 'StructuralAnalogy', 'PartialFormalAnalogy', 'ModelCandidate', 'FormalizedMapping', 'RejectedAnalogy'];

export interface AnalogyBoundaryRecord { analogyBoundaryId: string; analogyText: string; sourceDomain: string; targetDomain: string; analogyStatus: AnalogyStatus; preserves: string[]; doesNotPreserve: string[]; status: 'bounded'; createdAt: string; }
let anaCounter = 0;
export function createAnalogyBoundary(params: { analogyText: string; sourceDomain: string; targetDomain: string; analogyStatus: AnalogyStatus; preserves: string[]; doesNotPreserve: string[] }): AnalogyBoundaryRecord { anaCounter += 1; return { analogyBoundaryId: `MANA_${String(anaCounter).padStart(6, '0')}`, ...params, status: 'bounded', createdAt: new Date().toISOString() }; }