// @cohbit/math-atlas — M4 Relation / Operation Layer (25 REL types)
// Spec: v0.1 §8

export type RelationType = 'BelongsTo' | 'MapsTo' | 'Preserves' | 'Violates' | 'Implies' | 'Composes' | 'Bounds' | 'Orders' | 'Approximates' | 'ProjectsTo' | 'EmbedsInto' | 'Refines' | 'Realizes' | 'Verifies' | 'Commits' | 'Blocks' | 'Repairs' | 'Receipts' | 'Generalizes' | 'Specializes' | 'FactorsThrough' | 'PullsBack' | 'PushesForward' | 'Lifts' | 'Restricts';
export const RELATION_TYPES: RelationType[] = ['BelongsTo', 'MapsTo', 'Preserves', 'Violates', 'Implies', 'Composes', 'Bounds', 'Orders', 'Approximates', 'ProjectsTo', 'EmbedsInto', 'Refines', 'Realizes', 'Verifies', 'Commits', 'Blocks', 'Repairs', 'Receipts', 'Generalizes', 'Specializes', 'FactorsThrough', 'PullsBack', 'PushesForward', 'Lifts', 'Restricts'];

export interface RelationEntry { relation: RelationType; from: string; to: string; }
export interface RelationRecord { relationRecordId: string; mathArtifactId: string; relations: RelationEntry[]; status: 'mapped'; createdAt: string; }
let rCounter = 0;
export function createRelationRecord(params: { mathArtifactId: string; relations: RelationEntry[] }): RelationRecord { rCounter += 1; return { relationRecordId: `MREL_${String(rCounter).padStart(6, '0')}`, mathArtifactId: params.mathArtifactId, relations: params.relations, status: 'mapped', createdAt: new Date().toISOString() }; }