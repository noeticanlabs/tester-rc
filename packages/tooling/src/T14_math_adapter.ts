// @cohbit/tooling — T14 Math Atlas Adapter
// Detects mathematical patterns and maps to math-atlas invariants.
// Spec: Noetican Tooling Layer v0.1 §18

export interface MathAnalysisResult {
    toolId: string;
    filePath: string;
    representationType: string;
    modelFamilies: string[];
    invariantsDetected: string[];
    risksDetected: string[];
    confidence: 'high' | 'medium' | 'low';
    timestamp: string;
}

/**
 * Analyze mathematical content through the math-atlas.
 * Heuristic: detects theorem/proof patterns, model family keywords,
 * and evidence-level language.
 */
export function analyzeMath(content: string, filePath: string): MathAnalysisResult {
    const lower = content.toLowerCase();
    const modelFamilies: string[] = [];
    const invariants: string[] = [];
    const risks: string[] = [];

    // Representation type detection
    let repType = 'NaturalLanguage';
    if (lower.includes('=') && (lower.includes('+') || lower.includes('*') || lower.includes('/'))) repType = 'Equation';
    if (lower.includes('theorem') || lower.includes('lemma') || lower.includes('corollary')) repType = 'TheoremStatement';
    if (lower.includes('proof') && (lower.includes('qed') || lower.includes('∎'))) repType = 'ProofSketch';

    // Model family detection
    if (/graph|node|edge|vertex|path/.test(lower)) modelFamilies.push('GraphModel');
    if (/constraint|admissible|satisfies|predicate/.test(lower)) modelFamilies.push('ConstraintSystemModel');
    if (/category|morphism|functor|natural transformation/.test(lower)) modelFamilies.push('CategoryModel');
    if (/order|lattice|partial order|poset/.test(lower)) modelFamilies.push('OrderModel');
    if (/metric|distance|convergence|cauchy/.test(lower)) modelFamilies.push('MetricModel');
    if (/topolog|open set|continuous|compact/.test(lower)) modelFamilies.push('TopologicalModel');

    // Invariant detection
    if (lower.includes('theorem') || lower.includes('lemma')) invariants.push('MINV_MATH_020');
    if (lower.includes('proof')) invariants.push('MINV_MATH_008');
    if (lower.includes('admissible') || lower.includes('transition')) invariants.push('MINV_MATH_006');
    if (lower.includes('boundary') || lower.includes('bound')) invariants.push('MINV_MATH_004');
    if (lower.includes('constraint')) invariants.push('MINV_MATH_005');
    if (lower.includes('witness') || lower.includes('exists')) invariants.push('MINV_MATH_007');
    if (lower.includes('preserves') || lower.includes('mapping')) invariants.push('MINV_MATH_002');

    // Risk detection
    if (lower.includes('simulation') && (lower.includes('proves') || lower.includes('proof'))) risks.push('RISK_MATH_002');
    if (lower.includes('analogy') && lower.includes('equivalent')) risks.push('RISK_MATH_001');
    if (lower.includes('code') && lower.includes('proves')) risks.push('RISK_MATH_005');
    if (lower.includes('sorry') || lower.includes('admit')) risks.push('RISK_MATH_006');

    const confidence = modelFamilies.length + invariants.length >= 4 ? 'high'
        : modelFamilies.length + invariants.length >= 2 ? 'medium' : 'low';

    return {
        toolId: 't14-math-adapter',
        filePath,
        representationType: repType,
        modelFamilies: [...new Set(modelFamilies)],
        invariantsDetected: [...new Set(invariants)],
        risksDetected: risks,
        confidence,
        timestamp: new Date().toISOString(),
    };
}