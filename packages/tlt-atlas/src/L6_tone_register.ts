// @cohbit/tlt-atlas — L6 Tone / Register Layer
// Controls how meaning is expressed — tone, formality, audience.
// Spec source: TLT Bilingual Language Atlas v0.2 §L6

export type ToneCategory = 'plain' | 'casual' | 'professional' | 'academic' | 'technical' | 'legal_cautious' | 'public_facing' | 'mentor_style' | 'field_direct' | 'respectful' | 'urgent' | 'softened' | 'firm' | 'bilingual_natural';

export interface ToneProfile { toneId: string; name: string; description: string; category: ToneCategory; preservesClarity: boolean; riskIfOverapplied: string; }
export interface ToneRecord { toneRecordId: string; artifactId: string; detectedTone: ToneCategory; targetToneOptions: ToneCategory[]; risk: string; status: 'available'; createdAt: string; }

export const TONE_PLAIN: ToneProfile = { toneId: 'TONE_PLAIN', name: 'Plain', description: 'Accessible, no jargon, no formality.', category: 'plain', preservesClarity: true, riskIfOverapplied: 'May oversimplify technical precision.' };
export const TONE_CASUAL: ToneProfile = { toneId: 'TONE_CASUAL', name: 'Casual', description: 'Conversational, friendly, brief.', category: 'casual', preservesClarity: true, riskIfOverapplied: 'May sound unprofessional or imprecise.' };
export const TONE_PROFESSIONAL: ToneProfile = { toneId: 'TONE_PROFESSIONAL', name: 'Professional', description: 'Structured, business-appropriate tone.', category: 'professional', preservesClarity: true, riskIfOverapplied: 'May become corporate or stiff.' };
export const TONE_ACADEMIC: ToneProfile = { toneId: 'TONE_ACADEMIC', name: 'Academic', description: 'Formal, precise, citation-ready.', category: 'academic', preservesClarity: true, riskIfOverapplied: 'May become unreadable to non-experts.' };
export const TONE_TECHNICAL: ToneProfile = { toneId: 'TONE_TECHNICAL', name: 'Technical', description: 'Precise domain terminology, no simplification.', category: 'technical', preservesClarity: false, riskIfOverapplied: 'Inaccessible to non-technical audience.' };
export const TONE_PUBLIC: ToneProfile = { toneId: 'TONE_PUBLIC', name: 'Public-Facing', description: 'Clear, no internal jargon, no overclaim.', category: 'public_facing', preservesClarity: true, riskIfOverapplied: 'May over-polish and lose authenticity.' };
export const TONE_MENTOR: ToneProfile = { toneId: 'TONE_MENTOR', name: 'Mentor-Style', description: 'Educational, supportive, guiding.', category: 'mentor_style', preservesClarity: true, riskIfOverapplied: 'May sound patronizing.' };
export const TONE_FIELD: ToneProfile = { toneId: 'TONE_FIELD', name: 'Field-Direct', description: 'Practical, procedural, safety-aware.', category: 'field_direct', preservesClarity: true, riskIfOverapplied: 'May lack necessary nuance.' };
export const TONE_RESPECTFUL: ToneProfile = { toneId: 'TONE_RESPECTFUL', name: 'Respectful', description: 'Deferential, culturally aware, polite.', category: 'respectful', preservesClarity: true, riskIfOverapplied: 'May weaken firm safety boundaries.' };
export const TONE_URGENT: ToneProfile = { toneId: 'TONE_URGENT', name: 'Urgent', description: 'Time-sensitive, priority signaled.', category: 'urgent', preservesClarity: true, riskIfOverapplied: 'May create unnecessary alarm.' };
export const TONE_SOFTENED: ToneProfile = { toneId: 'TONE_SOFTENED', name: 'Softened', description: 'Gentle, non-confrontational delivery.', category: 'softened', preservesClarity: false, riskIfOverapplied: 'Boundaries may become unclear.' };
export const TONE_FIRM: ToneProfile = { toneId: 'TONE_FIRM', name: 'Firm', description: 'Clear boundary, non-negotiable.', category: 'firm', preservesClarity: true, riskIfOverapplied: 'May sound aggressive.' };
export const TONE_BILINGUAL: ToneProfile = { toneId: 'TONE_BILINGUAL', name: 'Bilingual-Natural', description: 'Natural flow between languages while preserving meaning.', category: 'bilingual_natural', preservesClarity: true, riskIfOverapplied: 'Code-switching may confuse monolingual readers.' };

export const TONE_PROFILES: Map<string, ToneProfile> = new Map([['TONE_PLAIN', TONE_PLAIN], ['TONE_CASUAL', TONE_CASUAL], ['TONE_PROFESSIONAL', TONE_PROFESSIONAL], ['TONE_ACADEMIC', TONE_ACADEMIC], ['TONE_TECHNICAL', TONE_TECHNICAL], ['TONE_PUBLIC', TONE_PUBLIC], ['TONE_MENTOR', TONE_MENTOR], ['TONE_FIELD', TONE_FIELD], ['TONE_RESPECTFUL', TONE_RESPECTFUL], ['TONE_URGENT', TONE_URGENT], ['TONE_SOFTENED', TONE_SOFTENED], ['TONE_FIRM', TONE_FIRM], ['TONE_BILINGUAL', TONE_BILINGUAL]]);

export function getToneProfile(id: string): ToneProfile | undefined { return TONE_PROFILES.get(id); }