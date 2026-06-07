import { describe, it, expect } from 'vitest';
import { TOOL_REGISTRY, getTool, isActionAllowed } from '../src/T0_registry.js';
import { routeContent } from '../src/T5_router.js';
import { scanRisks, filterBySeverity, hasHighSeverityRisks } from '../src/T7_risk_scanner.js';

describe('T0 — Tool Registry', () => {
    it('has 5 pre-registered tools', () => { expect(TOOL_REGISTRY.size).toBe(5); });
    it('atlas-bridge is an adapter', () => { expect(getTool('atlas-bridge')!.toolType).toBe('adapter'); });
    it('path-safety is verifier_tool', () => { expect(getTool('path-safety')!.trustLevel).toBe('verifier_tool'); });
    it('atlas-bridge allowed classify_patch', () => { expect(isActionAllowed('atlas-bridge', 'classify_patch')).toBe(true); });
    it('atlas-bridge blocked from authorize', () => { expect(isActionAllowed('atlas-bridge', 'authorize')).toBe(false); });
    it('unknown tool returns false', () => { expect(isActionAllowed('nonexistent', 'anything')).toBe(false); });
    it('gate-pipeline requires receipt', () => { expect(getTool('gate-pipeline')!.requiresReceipt).toBe(true); });
});
describe('T5 — Atlas Router', () => {
    it('routes .ts to code-atlas with high confidence', () => { const r = routeContent('src/main.ts'); expect(r.targetAtlas).toBe('code-atlas'); expect(r.confidence).toBe('high'); });
    it('routes .lean to math-atlas', () => { const r = routeContent('proof.lean'); expect(r.targetAtlas).toBe('math-atlas'); });
    it('routes .md to tlt-atlas', () => { const r = routeContent('docs/guide.md'); expect(r.targetAtlas).toBe('tlt-atlas'); });
    it('theorem content routes to math-atlas', () => { const r = routeContent('notes.txt', 'This theorem proves that...'); expect(r.targetAtlas).toBe('math-atlas'); });
    it('unknown extension without content is unknown', () => { const r = routeContent('data.bin'); expect(r.targetAtlas).toBe('unknown'); });
    it('routing IDs are unique', () => { const r1 = routeContent('a.ts'); const r2 = routeContent('b.rs'); expect(r1.routingId).not.toBe(r2.routingId); });
});
describe('T7 — Risk Scanner', () => {
    it('detects nullable ambiguity', () => { const w = scanRisks('if (x === null) return;'); expect(w.some(r => r.riskId === 'RISK_NULLABLE')).toBe(true); });
    it('detects proof gap (sorry)', () => { const w = scanRisks('sorry, proof pending'); expect(w.some(r => r.riskId === 'RISK_PROOF_GAP')).toBe(true); });
    it('detects simulation-as-proof language', () => { const w = scanRisks('The simulation proves the theorem conclusively.'); expect(w.some(r => r.riskId === 'RISK_SIMULATION_AS_PROOF')).toBe(true); });
    it('detects claim inflation', () => { const w = scanRisks('This algorithm guarantees correctness.'); expect(w.some(r => r.riskId === 'RISK_CLAIM_INFLATION')).toBe(true); });
    it('clean code returns no warnings', () => { const w = scanRisks('function add(a: number, b: number): number { return a + b; }'); expect(w).toHaveLength(0); });
    it('filterBySeverity filters correctly', () => { const w = scanRisks('The simulation proves the theorem. sorry, pending.'); expect(filterBySeverity(w, 'high').length).toBeGreaterThanOrEqual(2); });
    it('hasHighSeverityRisks detects high', () => { expect(hasHighSeverityRisks('The simulation proves the theorem.')).toBe(true); });
    it('hasHighSeverityRisks false for clean', () => { expect(hasHighSeverityRisks('hello world')).toBe(false); });
});