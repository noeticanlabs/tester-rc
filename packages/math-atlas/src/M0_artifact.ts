// @cohbit/math-atlas — M0 Raw Mathematical Artifact Layer
// Preserves original mathematical items before interpretation.
// Spec source: Noetican Multimodel Mathematics Atlas v0.1 §4

import * as crypto from 'node:crypto';

export type MathArtifactType =
    | 'definition' | 'equation' | 'proof_sketch' | 'diagram'
    | 'simulation_output' | 'code_function' | 'lean_theorem'
    | 'mathematical_analogy' | 'natural_language_explanation'
    | 'graph_model' | 'geometric_visual' | 'category_diagram';

export interface MathArtifact {
    mathArtifactId: string; artifactType: MathArtifactType;
    rawContent: string; origin: string; createdAt: string;
    sourceHash?: string; status: 'stored';
}

let counter = 0;
export function generateMathArtifactId(): string { counter += 1; return `MART_${String(counter).padStart(6, '0')}`; }

export function createMathArtifact(params: { artifactType: MathArtifactType; rawContent: string; origin?: string }): MathArtifact {
    if (!params.rawContent.trim()) throw new Error('MathArtifact requires non-empty rawContent.');
    return { mathArtifactId: generateMathArtifactId(), artifactType: params.artifactType, rawContent: params.rawContent, origin: params.origin ?? 'manual_entry', sourceHash: crypto.createHash('sha256').update(params.rawContent, 'utf8').digest('hex'), createdAt: new Date().toISOString(), status: 'stored' };
}

export const VALID_MATH_ARTIFACT_TYPES: Set<MathArtifactType> = new Set(['definition', 'equation', 'proof_sketch', 'diagram', 'simulation_output', 'code_function', 'lean_theorem', 'mathematical_analogy', 'natural_language_explanation', 'graph_model', 'geometric_visual', 'category_diagram']);