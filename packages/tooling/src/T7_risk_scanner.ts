// @cohbit/tooling — T7 Risk Scanner
// Detects overclaim, unsafe reuse, proof-status inflation, and missing receipts.
// Spec: Noetican Tooling Layer v0.1 §11

export type RiskSeverity = 'high' | 'medium' | 'low';

export interface RiskWarning {
    riskId: string;
    name: string;
    severity: RiskSeverity;
    matchedPattern: string;
    recommendedAction: string;
    source: string;
}

// ─── Risk Patterns ─────────────────────────────────────────────

interface RiskPattern {
    riskId: string;
    name: string;
    severity: RiskSeverity;
    pattern: RegExp | ((content: string) => boolean);
    recommendedAction: string;
}

const RISK_PATTERNS: RiskPattern[] = [
    {
        riskId: 'RISK_NULLABLE', name: 'NullableAmbiguity', severity: 'medium',
        pattern: (c) => /\bnull\b/.test(c) || /\bundefined\b/.test(c) || c.includes('None'),
        recommendedAction: 'Ensure nullable values are guarded by presence checks or use explicit Result/Option encoding.',
    },
    {
        riskId: 'RISK_UNCHECKED_CAST', name: 'UncheckedCast', severity: 'medium',
        pattern: (c) => /\bas any\b/.test(c) || /\bas unknown\b/.test(c),
        recommendedAction: 'Replace type casts with proper type narrowing or runtime validation.',
    },
    {
        riskId: 'RISK_PROOF_GAP', name: 'ProofGap', severity: 'high',
        pattern: (c) => c.includes('sorry') || c.includes('admit'),
        recommendedAction: 'Proof contains unproven placeholder. Discharge the obligation or declare the gap.',
    },
    {
        riskId: 'RISK_SIMULATION_AS_PROOF', name: 'SimulationAsProof', severity: 'high',
        pattern: (c) => (c.includes('simulation') && (c.includes('proves') || c.includes('proof') || c.includes('theorem'))),
        recommendedAction: 'Simulation evidence supports testing, not proof. Downgrade claim to simulation-supported or add formal proof route.',
    },
    {
        riskId: 'RISK_ANALOGY_AS_EQUIVALENCE', name: 'AnalogyAsEquivalence', severity: 'medium',
        pattern: (c) => (c.includes('analogy') && (c.includes('equivalent') || c.includes('same as') || c.includes('identical'))),
        recommendedAction: 'Analogies guide intuition but do not prove equivalence. Add non-collapse boundary.',
    },
    {
        riskId: 'RISK_CODE_AS_PROOF', name: 'CodeAsProof', severity: 'high',
        pattern: (c) => (c.includes('code') && (c.includes('proves') || c.includes('guarantees') || c.includes('ensures'))),
        recommendedAction: 'Code behavior is not mathematical proof. Add formal specification if correctness is claimed.',
    },
    {
        riskId: 'RISK_CLAIM_INFLATION', name: 'ClaimInflation', severity: 'medium',
        pattern: (c) => /\bguarantees\b/.test(c) || /\bproves\b/.test(c) || /\bcertifies\b/.test(c) || /\bensures\b/.test(c),
        recommendedAction: 'Strong claim language detected. Verify that evidence level supports the claim ceiling.',
    },
    {
        riskId: 'RISK_STALE_RECEIPT', name: 'StaleReceipt', severity: 'low',
        pattern: (c) => /\bstale\b/.test(c) || /\boutdated\b/.test(c) || /\bdeprecated\b/.test(c),
        recommendedAction: 'Receipt may be stale. Re-verify freshness before relying on this entry.',
    },
];

/**
 * Scan content against known risk patterns.
 * Returns all matching risk warnings.
 */
export function scanRisks(content: string, source?: string): RiskWarning[] {
    const warnings: RiskWarning[] = [];
    for (const pattern of RISK_PATTERNS) {
        const matched = typeof pattern.pattern === 'function'
            ? pattern.pattern(content)
            : pattern.pattern.test(content);
        if (matched) {
            warnings.push({
                riskId: pattern.riskId,
                name: pattern.name,
                severity: pattern.severity,
                matchedPattern: pattern.riskId,
                recommendedAction: pattern.recommendedAction,
                source: source ?? 'unknown',
            });
        }
    }
    return warnings;
}

/**
 * Filter warnings by severity.
 */
export function filterBySeverity(warnings: RiskWarning[], severity: RiskSeverity): RiskWarning[] {
    return warnings.filter(w => w.severity === severity);
}

/**
 * Check if content has any high-severity risks.
 */
export function hasHighSeverityRisks(content: string): boolean {
    return scanRisks(content).some(w => w.severity === 'high');
}