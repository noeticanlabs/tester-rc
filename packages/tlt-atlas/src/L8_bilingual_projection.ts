// @cohbit/tlt-atlas — L8 Bilingual Projection Layer
// Projects meaning invariants into specific target-language expressions.
// Spec source: TLT Bilingual Language Atlas v0.2 §L8

export type ProjectionType = 'literal' | 'meaning_preserving' | 'tone_adjusted' | 'domain_specific' | 'repair_revision';
export type ProjectionStatus = 'draft' | 'accepted' | 'accepted_with_limitations' | 'rejected' | 'repair_required';

export interface BilingualProjection { projectionId: string; sourceLanguage: string; targetLanguage: string; sourceText: string; targetText: string; projectionType: ProjectionType; preservedInvariants: string[]; lostOrChanged: string[]; status: ProjectionStatus; }

export const BPROJ_MAKE_SAFE_LITERAL: BilingualProjection = { projectionId: 'BPROJ_MAKE_SAFE_001', sourceLanguage: 'english', targetLanguage: 'spanish', sourceText: 'Make it safe.', targetText: 'Hazlo seguro.', projectionType: 'literal', preservedInvariants: [], lostOrChanged: ['risk reduction', 'preserve function', 'safety constraint tone'], status: 'rejected' };
export const BPROJ_MAKE_SAFE_MEANING: BilingualProjection = { projectionId: 'BPROJ_MAKE_SAFE_002', sourceLanguage: 'english', targetLanguage: 'spanish', sourceText: 'Make it safe.', targetText: 'Modifícalo para reducir el riesgo sin perder la función principal.', projectionType: 'meaning_preserving', preservedInvariants: ['MINV_004', 'MINV_005'], lostOrChanged: ['short casual tone'], status: 'accepted_with_limitations' };
export const BPROJ_MAKE_SAFE_TONE: BilingualProjection = { projectionId: 'BPROJ_MAKE_SAFE_003', sourceLanguage: 'english', targetLanguage: 'spanish', sourceText: 'Make it safe.', targetText: 'Por favor, modifícalo para que sea más seguro manteniendo su función.', projectionType: 'tone_adjusted', preservedInvariants: ['MINV_003'], lostOrChanged: ['brevity', 'directness'], status: 'accepted' };

export const BILINGUAL_PROJECTIONS: BilingualProjection[] = [BPROJ_MAKE_SAFE_LITERAL, BPROJ_MAKE_SAFE_MEANING, BPROJ_MAKE_SAFE_TONE];
export function getProjectionsByStatus(status: ProjectionStatus): BilingualProjection[] { return BILINGUAL_PROJECTIONS.filter(p => p.status === status); }
export function getAcceptedProjections(): BilingualProjection[] { return BILINGUAL_PROJECTIONS.filter(p => p.status === 'accepted' || p.status === 'accepted_with_limitations'); }