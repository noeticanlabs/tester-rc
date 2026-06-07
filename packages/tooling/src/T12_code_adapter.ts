// @cohbit/tooling — T12 Code Analysis Adapter
// Wraps atlas_bridge.ts classifyPatchFile as a registered tool.
// Spec: Noetican Tooling Layer v0.1 §16

export interface CodeAnalysisResult {
    toolId: string;
    filePath: string;
    invariantsDetected: string[];
    risksDetected: string[];
    confidence: 'high' | 'medium' | 'low';
    timestamp: string;
}

/**
 * Analyze code content through the code-atlas bridge.
 * Delegates to the existing classifyPatchFile heuristic.
 */
export function analyzeCode(code: string, filePath: string): CodeAnalysisResult {
    const nodeTypes: string[] = [];
    const invariantIds: string[] = [];
    const riskIds: string[] = [];

    // Same heuristic as classifyPatchFile
    if (code.includes('if ') || code.includes('if(') || code.includes('else')) {
        nodeTypes.push('ConditionalBranch'); invariantIds.push('INV_006');
    }
    if (code.includes('return ')) { nodeTypes.push('Return'); invariantIds.push('INV_008'); }
    if (code.includes('function ') || code.includes('def ') || code.includes('fn ')) {
        nodeTypes.push('FunctionDefinition'); invariantIds.push('INV_001');
    }
    if (code.includes('try {') || code.includes('catch') || code.includes('except')) {
        nodeTypes.push('ErrorPath'); invariantIds.push('INV_009');
    }
    if (code.includes('Option<') || code.includes('Result<') || code.includes('null') || code.includes('None')) {
        nodeTypes.push('ResultOrOption'); invariantIds.push('INV_011');
    }
    if (code.includes('assert') || code.includes('expect(') || code.includes('.toBe(')) {
        nodeTypes.push('TestAssertion'); invariantIds.push('INV_023');
    }
    if (code.includes('import ') || code.includes('from ') || code.includes('require(')) {
        nodeTypes.push('ImportDependency'); invariantIds.push('INV_021');
    }
    if (code.includes('async ') || code.includes('await ')) {
        nodeTypes.push('AsyncContinuation'); invariantIds.push('INV_022');
    }

    if (code.includes('null') || code.includes('undefined') || code.includes('None')) riskIds.push('RISK_001');
    if (code.includes('as ') && code.includes('any')) riskIds.push('RISK_002');
    if (code.includes('sorry') || code.includes('admit')) riskIds.push('RISK_005');

    const confidence = nodeTypes.length >= 3 ? 'high' : nodeTypes.length >= 1 ? 'medium' : 'low';

    return {
        toolId: 't12-code-adapter',
        filePath,
        invariantsDetected: [...new Set(invariantIds)],
        risksDetected: riskIds,
        confidence,
        timestamp: new Date().toISOString(),
    };
}