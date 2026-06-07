// @cohbit/math-atlas — M2 Model Family Layer (25 MODEL families)
// Spec: v0.1 §6

export interface ModelFamily { modelId: string; name: string; description: string; }
export interface ModelRecord { modelRecordId: string; mathArtifactId: string; candidateModels: string[]; selectedModel: string | undefined; modelReason: string | undefined; status: 'model_candidate' | 'model_selected' | 'model_selected_with_limitations'; }

export const MODEL_FAMILIES: ModelFamily[] = [
    { modelId: 'MODEL_001', name: 'LogicModel', description: 'Propositional/predicate logic with inference rules.' },
    { modelId: 'MODEL_002', name: 'SetModel', description: 'Set-theoretic foundations with membership and operations.' },
    { modelId: 'MODEL_003', name: 'OrderModel', description: 'Partial orders, lattices, and ordered structures.' },
    { modelId: 'MODEL_004', name: 'GraphModel', description: 'Graphs with nodes, edges, paths, and connectivity.' },
    { modelId: 'MODEL_005', name: 'MetricModel', description: 'Metric spaces with distance functions and convergence.' },
    { modelId: 'MODEL_006', name: 'TopologicalModel', description: 'Topological spaces with open sets and continuity.' },
    { modelId: 'MODEL_007', name: 'GeometricModel', description: 'Geometric structures with points, lines, and transformations.' },
    { modelId: 'MODEL_008', name: 'AlgebraicModel', description: 'Algebraic structures: groups, rings, fields, modules.' },
    { modelId: 'MODEL_009', name: 'CategoryModel', description: 'Categories with objects, morphisms, functors, and natural transformations.' },
    { modelId: 'MODEL_010', name: 'TypeTheoreticModel', description: 'Type theory with terms, types, and dependent types.' },
    { modelId: 'MODEL_011', name: 'DynamicalSystemModel', description: 'Dynamical systems with states and evolution rules.' },
    { modelId: 'MODEL_012', name: 'ProbabilisticModel', description: 'Probability spaces with random variables and distributions.' },
    { modelId: 'MODEL_013', name: 'ComputationalModel', description: 'Computational models: Turing machines, automata, algorithms.' },
    { modelId: 'MODEL_014', name: 'ProofAssistantModel', description: 'Proof assistant formalization (Lean, Coq, etc.).' },
    { modelId: 'MODEL_015', name: 'PhysicalAnalogyModel', description: 'Physical analogies used for mathematical intuition.' },
    { modelId: 'MODEL_016', name: 'LedgerReceiptModel', description: 'Append-only ledger with receipted transitions.' },
    { modelId: 'MODEL_017', name: 'FieldModel', description: 'Fields and field extensions with algebraic operations.' },
    { modelId: 'MODEL_018', name: 'ConstraintSystemModel', description: 'Constraint systems with satisfaction conditions.' },
    { modelId: 'MODEL_019', name: 'SimulationModel', description: 'Computational simulations with discrete steps.' },
    { modelId: 'MODEL_020', name: 'HybridModel', description: 'Combined models spanning multiple mathematical domains.' },
    { modelId: 'MODEL_021', name: 'SheafModel', description: 'Sheaves over topological spaces or sites.' },
    { modelId: 'MODEL_022', name: 'LatticeModel', description: 'Lattices as algebraic or order-theoretic structures.' },
    { modelId: 'MODEL_023', name: 'DomainTheoryModel', description: 'Domain theory for denotational semantics.' },
    { modelId: 'MODEL_024', name: 'SimplicialModel', description: 'Simplicial sets and combinatorial topology.' },
    { modelId: 'MODEL_025', name: 'OperatorModel', description: 'Operator algebras and functional analysis.' },
];

export const MODEL_FAMILY_MAP: Map<string, ModelFamily> = new Map(MODEL_FAMILIES.map(m => [m.modelId, m]));
export function getModelFamily(id: string): ModelFamily | undefined { return MODEL_FAMILY_MAP.get(id); }

let mCounter = 0;
export function createModelRecord(params: { mathArtifactId: string; candidateModels: string[]; selectedModel?: string; modelReason?: string }): ModelRecord {
    mCounter += 1;
    return { modelRecordId: `MMODEL_${String(mCounter).padStart(6, '0')}`, mathArtifactId: params.mathArtifactId, candidateModels: params.candidateModels, selectedModel: params.selectedModel, modelReason: params.modelReason, status: params.selectedModel ? 'model_selected' : 'model_candidate' };
}