// @cohbit/tooling — T13 Language / Translation Adapter
// Wraps atlas_bridge.ts mapCommandToSemantics as a registered tool.
// Spec: Noetican Tooling Layer v0.1 §17

export interface LanguageAnalysisResult {
    toolId: string;
    phrase: string;
    intentLabel: string;
    semanticUnits: string[];
    ambiguityDetected: boolean;
    confidence: number;
    timestamp: string;
}

// ─── Intent + Semantic mapping ─────────────────────────────────

const INTENT_MAP: Record<string, { label: string; semUnits: string[] }> = {
    InspectWorkspace: { label: 'Inspect', semUnits: ['SEM_001'] },
    InspectFile: { label: 'Inspect', semUnits: ['SEM_001'] },
    PlanChange: { label: 'Plan', semUnits: ['SEM_006', 'SEM_009'] },
    ProposePatch: { label: 'Propose', semUnits: ['SEM_002', 'SEM_006'] },
    FixTests: { label: 'Repair', semUnits: ['SEM_011'] },
    RecommendTests: { label: 'EvidenceRequest', semUnits: ['SEM_012'] },
    ApplyPatch: { label: 'Command', semUnits: ['SEM_002', 'SEM_010'] },
    AuthorizePatch: { label: 'Command', semUnits: ['SEM_002', 'SEM_010'] },
    ReviewPatch: { label: 'EvidenceRequest', semUnits: ['SEM_012'] },
    RollbackPatch: { label: 'Repair', semUnits: ['SEM_011'] },
    ShowRecent: { label: 'Request', semUnits: ['SEM_001'] },
    ResumeSession: { label: 'Request', semUnits: ['SEM_001'] },
    ExplainSession: { label: 'Clarification', semUnits: ['SEM_005'] },
    Unknown: { label: 'Clarification', semUnits: ['SEM_005'] },
};

/**
 * Analyze a natural-language command through the TLT atlas.
 */
export function analyzeLanguage(phrase: string, intent?: string): LanguageAnalysisResult {
    const mapping = INTENT_MAP[intent ?? 'Unknown'] ?? INTENT_MAP['Unknown']!;
    const ambiguity = phrase.includes('?') || phrase.length < 10 || intent === 'Unknown';
    const semUnits = [...mapping.semUnits];
    if (ambiguity) semUnits.push('SEM_018'); // UncertaintyMarker

    return {
        toolId: 't13-language-adapter',
        phrase,
        intentLabel: mapping.label,
        semanticUnits: semUnits,
        ambiguityDetected: ambiguity,
        confidence: intent && intent !== 'Unknown' ? 0.7 : 0.3,
        timestamp: new Date().toISOString(),
    };
}