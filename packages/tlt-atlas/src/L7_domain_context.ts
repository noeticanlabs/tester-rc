// @cohbit/tlt-atlas — L7 Domain Context Layer
// Determines which knowledge field the language belongs to.
// Spec source: TLT Bilingual Language Atlas v0.2 §L7

export type Domain = 'general_conversation' | 'coding' | 'formal_methods' | 'maintenance' | 'construction' | 'safety' | 'academic' | 'public_post' | 'legal_caution' | 'business' | 'bilingual_training' | 'Noetican_internal' | 'CohBit_CTRL' | 'TTC_GTG';

export interface DomainProfile { domainId: string; name: string; description: string; safetySensitive: boolean; }
export interface DomainContextRecord { domainContextId: string; artifactId: string; domainCandidates: Domain[]; selectedDomain?: Domain; contextNeeded: string[]; status: 'ambiguous' | 'resolved'; createdAt: string; }

export const DOMAIN_GENERAL: DomainProfile = { domainId: 'DOMAIN_GENERAL', name: 'General Conversation', description: 'Everyday language with no specific domain.', safetySensitive: false };
export const DOMAIN_CODING: DomainProfile = { domainId: 'DOMAIN_CODING', name: 'Coding', description: 'Software development, code review, architecture.', safetySensitive: true };
export const DOMAIN_FORMAL: DomainProfile = { domainId: 'DOMAIN_FORMAL', name: 'Formal Methods', description: 'Proof systems, verification, formal specification.', safetySensitive: true };
export const DOMAIN_MAINTENANCE: DomainProfile = { domainId: 'DOMAIN_MAINTENANCE', name: 'Maintenance', description: 'Field maintenance, operational procedures.', safetySensitive: true };
export const DOMAIN_SAFETY: DomainProfile = { domainId: 'DOMAIN_SAFETY', name: 'Safety', description: 'Risk assessment, hazard communication, safety constraints.', safetySensitive: true };
export const DOMAIN_ACADEMIC: DomainProfile = { domainId: 'DOMAIN_ACADEMIC', name: 'Academic', description: 'Research, publication, peer review.', safetySensitive: false };
export const DOMAIN_PUBLIC: DomainProfile = { domainId: 'DOMAIN_PUBLIC', name: 'Public Post', description: 'LinkedIn, blog, press, public communication.', safetySensitive: true };
export const DOMAIN_NOETICAN: DomainProfile = { domainId: 'DOMAIN_NOETICAN', name: 'Noetican Internal', description: 'Noetican Labs internal terminology and systems.', safetySensitive: false };
export const DOMAIN_CTRL: DomainProfile = { domainId: 'DOMAIN_CTRL', name: 'CohBit CTRL', description: 'CTRL governance, admissibility, receipt gates.', safetySensitive: true };

export const DOMAIN_PROFILES: Map<string, DomainProfile> = new Map([['DOMAIN_GENERAL', DOMAIN_GENERAL], ['DOMAIN_CODING', DOMAIN_CODING], ['DOMAIN_FORMAL', DOMAIN_FORMAL], ['DOMAIN_MAINTENANCE', DOMAIN_MAINTENANCE], ['DOMAIN_SAFETY', DOMAIN_SAFETY], ['DOMAIN_ACADEMIC', DOMAIN_ACADEMIC], ['DOMAIN_PUBLIC', DOMAIN_PUBLIC], ['DOMAIN_NOETICAN', DOMAIN_NOETICAN], ['DOMAIN_CTRL', DOMAIN_CTRL]]);
export function getDomainProfile(id: string): DomainProfile | undefined { return DOMAIN_PROFILES.get(id); }