// @cohbit/math-atlas — M3 Object / Structure Layer (30 OBJ types)
// Spec: v0.1 §7

export type MathObjectType = 'Element' | 'Set' | 'State' | 'Transition' | 'Path' | 'Constraint' | 'Predicate' | 'Relation' | 'Function' | 'Operator' | 'GraphNode' | 'GraphEdge' | 'Morphism' | 'Space' | 'Region' | 'Boundary' | 'Invariant' | 'Witness' | 'Receipt' | 'ProofObligation' | 'Type' | 'Term' | 'Object' | 'Category' | 'Functor' | 'NaturalTransformation' | 'Metric' | 'Topology' | 'Field' | 'LedgerEntry';
export const MATH_OBJECT_TYPES: MathObjectType[] = ['Element', 'Set', 'State', 'Transition', 'Path', 'Constraint', 'Predicate', 'Relation', 'Function', 'Operator', 'GraphNode', 'GraphEdge', 'Morphism', 'Space', 'Region', 'Boundary', 'Invariant', 'Witness', 'Receipt', 'ProofObligation', 'Type', 'Term', 'Object', 'Category', 'Functor', 'NaturalTransformation', 'Metric', 'Topology', 'Field', 'LedgerEntry'];

export interface StructureRecord { structureRecordId: string; mathArtifactId: string; objectsDetected: string[]; plainStructure: string; status: 'mapped'; createdAt: string; }
let sCounter = 0;
export function createStructureRecord(params: { mathArtifactId: string; objectsDetected: string[]; plainStructure: string }): StructureRecord { sCounter += 1; return { structureRecordId: `MSTRUCT_${String(sCounter).padStart(6, '0')}`, mathArtifactId: params.mathArtifactId, objectsDetected: params.objectsDetected, plainStructure: params.plainStructure, status: 'mapped', createdAt: new Date().toISOString() }; }