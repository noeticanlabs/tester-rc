// @cohbit/math-atlas — M1 Representation Surface Layer (20 REP types)
// Spec: v0.1 §5

export interface RepresentationRecord { representationId: string; mathArtifactId: string; representationType: RepresentationType; surfaceFeatures: string[]; possibleAmbiguity: boolean; status: 'detected'; }

export type RepresentationType = 'NaturalLanguage' | 'Equation' | 'Definition' | 'TheoremStatement' | 'ProofSketch' | 'Diagram' | 'Graph' | 'Table' | 'Matrix' | 'Simulation' | 'Code' | 'LeanFormalization' | 'PhysicalAnalogy' | 'GeometricVisual' | 'CategoryDiagram' | 'TopologicalDiagram' | 'CommutativeDiagram' | 'ConstraintSystem' | 'LedgerRecord' | 'HybridArtifact';

export const REP_TYPES: RepresentationType[] = ['NaturalLanguage', 'Equation', 'Definition', 'TheoremStatement', 'ProofSketch', 'Diagram', 'Graph', 'Table', 'Matrix', 'Simulation', 'Code', 'LeanFormalization', 'PhysicalAnalogy', 'GeometricVisual', 'CategoryDiagram', 'TopologicalDiagram', 'CommutativeDiagram', 'ConstraintSystem', 'LedgerRecord', 'HybridArtifact'];

let repCounter = 0;
export function createRepresentationRecord(params: { mathArtifactId: string; representationType: RepresentationType; surfaceFeatures?: string[]; possibleAmbiguity?: boolean }): RepresentationRecord {
    repCounter += 1;
    return { representationId: `REP_REC_${String(repCounter).padStart(6, '0')}`, mathArtifactId: params.mathArtifactId, representationType: params.representationType, surfaceFeatures: params.surfaceFeatures ?? [], possibleAmbiguity: params.possibleAmbiguity ?? false, status: 'detected' };
}