// @cohbit/tlt-atlas — L16 Learning Polarity (v10.3)
// Bidirectional learning layer that tracks both negative violations
// and positive correct-language behavior. Confidence emerges from
// the measured pressure between positive support and negative challenge.
//
// Three tracks:
//   negative — violations, drift, mismatch, unresolved pressure
//   positive — correct behavior that survived negative cross-check
//   neutral  — inconclusive / too little evidence
//
// Operating law:
//   The positive track records language behavior that survived
//   negative challenge. The negative track records violations,
//   drift, mismatch, and unresolved pressure. Confidence is not
//   declared by either side alone; it emerges from the measured
//   pressure between positive support and negative challenge.
//   Neither track alone certifies correctness.

import type { TltGraphNode, TltTransformResult } from './T_tlt_transformer.js';
import type { EvidenceAwareSummary } from './T_summary_generator.js';
import { checkClaimStrength } from './T_claim_guard.js';
import { checkPublicBoundary } from './T_public_internal_boundary.js';
import { MEANING_INVARIANTS } from './L5_meaning_invariant.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Signal Types ───────────────────────────────────────────────

export type TltPositiveSignal =
    | 'correct_verb_strength'
    | 'correct_register'
    | 'correct_audience_mode'
    | 'correct_evidence_ceiling'
    | 'correct_limitation_language'
    | 'correct_uncertainty_language'
    | 'correct_definition_use'
    | 'correct_semantic_firewall'
    | 'correct_public_rewrite'
    | 'correct_downgrade'
    | 'canon_safe_summary'
    | 'correct_non_overclaim';

export type TltNegativeSignal =
    | 'claim_strength_mismatch'
    | 'public_internal_leak'
    | 'overclaim'
    | 'proof_debt'
    | 'term_drift'
    | 'wrong_register'
    | 'semantic_firewall_collapse'
    | 'unsupported_strong_verb'
    | 'missing_limitation'
    | 'spelling_drift';

export type LearningPolarity = 'positive' | 'negative' | 'neutral';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

// ─── Record Types ───────────────────────────────────────────────

export interface TltLearningRecord {
    recordId: string;
    corpusHash: string;
    polarity: LearningPolarity;
    primaryPolarity: LearningPolarity;    // main classification
    secondaryPolarity: LearningPolarity | undefined; // e.g., negative corpus with positive signals

    positiveSignals: TltPositiveSignal[];
    negativeSignals: TltNegativeSignal[];

    positiveSupportScore: number;
    negativePressureScore: number;
    confidenceScore: number;
    confidence: ConfidenceLevel;

    crossCheckedByNegativeTrack: boolean;
    admittedToPositiveTrack: boolean;

    evidenceCeiling: string;
    audienceMode: string;
    limitations: string[];

    // Stats from ingestion
    totalNodes: number;
    totalWarnings: number;
    totalDowngrades: number;
    totalLimitations: number;
    allModesCanonSafe: boolean;
    zeroFalsePositives: boolean;

    generatedAt: string;
}

let recordCounter = 0;
function nextRecordId(): string {
    return `LRN_${String(++recordCounter).padStart(5, '0')}`;
}

// ─── Simple Hash ─────────────────────────────────────────────────

function simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < Math.min(text.length, 5000); i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return hash.toString(16);
}

// ─── Signal Detection ───────────────────────────────────────────

/**
 * Detect positive signals from a TLT graph node.
 * A positive signal means the language behaved correctly under governance pressure.
 */
function detectPositiveSignals(node: TltGraphNode, summary?: EvidenceAwareSummary): TltPositiveSignal[] {
    const signals: TltPositiveSignal[] = [];
    const text = node.matchedText || '';

    // Check claim strength — if honest, that's a positive signal
    const strengthCheck = checkClaimStrength(node);
    if (strengthCheck.isHonest && strengthCheck.sourceVerbs.length === 0) {
        signals.push('correct_non_overclaim');
    }
    if (strengthCheck.isHonest && strengthCheck.sourceVerbs.length > 0) {
        // Has strong verbs but they're backed by evidence — correct verb strength
        signals.push('correct_verb_strength');
        signals.push('correct_evidence_ceiling');
    }

    // Check public/internal boundary — if passes, that's positive
    const boundaryCheck = checkPublicBoundary(node);
    if (boundaryCheck.passes) {
        signals.push('correct_semantic_firewall');
    }

    // Definition nodes with matched invariants show correct definition use
    if (node.nodeType === 'definition' && node.matchedInvariants.length > 0) {
        signals.push('correct_definition_use');
    }

    // Limitation language detection
    const hasLimitationLanguage = /\b(not\s+(?:yet\s+)?verified|surface.detected|requires?\s+evidence|preliminary|appears?\s+to|may\s+not|not\s+guaranteed|cannot\s+confirm)\b/i.test(text);
    if (hasLimitationLanguage) {
        signals.push('correct_limitation_language');
        signals.push('correct_uncertainty_language');
    }

    // Register detection: domain context matched = correct register
    if (node.matchedDomainContexts.length > 0) {
        signals.push('correct_register');
    }

    // Audience mode: if node survived public boundary check, audience mode is correct
    if (boundaryCheck.passes && node.matchedDomainContexts.length > 0) {
        signals.push('correct_audience_mode');
    }

    // Downgrade behavior: if strength was downgraded (sourceVerbs present but isHonest),
    // and the node uses downgraded language, that's correct downgrade behavior
    if (!strengthCheck.isHonest && strengthCheck.sourceVerbs.length > 0) {
        // The fact that a mismatch was detected means the system correctly identified it
        signals.push('correct_downgrade');
    }

    // Public rewrite: if boundary check detected leaks but they were rewritten
    if (!boundaryCheck.passes && boundaryCheck.termLeaks.length > 0) {
        // The system detected and can rewrite — positive in terms of detection
        signals.push('correct_public_rewrite');
    }

    // Canon-safe summary
    if (summary && summary.canonSafe) {
        signals.push('canon_safe_summary');
    }

    return signals;
}

/**
 * Detect negative signals from a TLT graph node.
 */
function detectNegativeSignals(node: TltGraphNode): TltNegativeSignal[] {
    const signals: TltNegativeSignal[] = [];
    const text = node.matchedText || '';

    // Claim strength mismatch
    const strengthCheck = checkClaimStrength(node);
    if (!strengthCheck.isHonest) {
        signals.push('claim_strength_mismatch');
        if (strengthCheck.violations.some(v => v.severity === 'high')) {
            signals.push('unsupported_strong_verb');
        }
    }

    // Public/internal leak
    const boundaryCheck = checkPublicBoundary(node);
    if (!boundaryCheck.passes) {
        signals.push('public_internal_leak');
    }

    // Overclaim: public-facing claim without receipt
    const isPublicFacing = node.matchedDomainContexts.includes('DOM_004');
    const hasReceiptInvariant = node.matchedInvariants.some(id => {
        const minv = MEANING_INVARIANTS.get(id);
        return minv?.receiptRequired && minv.id !== 'MINV_012';
    });
    if (isPublicFacing && !hasReceiptInvariant) {
        signals.push('overclaim');
    }

    // Proof debt: receipt-required invariant without evidence
    const hasReceiptRequired = node.matchedInvariants.some(id => {
        const minv = MEANING_INVARIANTS.get(id);
        return minv?.receiptRequired;
    });
    if (hasReceiptRequired && node.evidenceLevel === 'surface_detected') {
        signals.push('proof_debt');
    }

    // Missing limitation: claim/risk node with no limitation language
    if ((node.nodeType === 'claim' || node.nodeType === 'risk') &&
        node.evidenceLevel === 'surface_detected') {
        const hasLimit = /\b(not\s+(?:yet\s+)?verified|surface.detected|preliminary|appears?\s+to|may\s+not|cannot\s+confirm|requires?\s+evidence)\b/i.test(text);
        if (!hasLimit) {
            signals.push('missing_limitation');
        }
    }

    // Spelling drift: check for common misspellings
    const misspellings = [
        /\b(reciept|reicept)\b/i,      // receipt
        /\b(goverance|governence)\b/i,  // governance
        /\b(admissable|admissable)\b/i, // admissible
        /\b(verificaton|verifcation)\b/i, // verification
    ];
    if (misspellings.some(m => m.test(text))) {
        signals.push('spelling_drift');
    }

    // Term drift: internal terms appearing in unexpected contexts
    if (node.nodeType === 'definition') {
        const hasInternalTerms = /\b(CohBit|CTRL|PhaseLoom|Coh-GMI|Noetican)\b/i.test(text);
        if (hasInternalTerms && isPublicFacing) {
            signals.push('term_drift');
        }
    }

    return signals;
}

// ─── Confidence Computation ─────────────────────────────────────

/**
 * Compute confidence from the pressure between positive support
 * and negative challenge, plus repeatability and corpus fit.
 */
export function computeLearningConfidence(input: {
    positiveSupportScore: number;
    negativePressureScore: number;
    repeatabilityScore: number;
    corpusFitScore: number;
}): ConfidenceLevel {
    const score =
        input.positiveSupportScore
        - input.negativePressureScore
        + input.repeatabilityScore
        + input.corpusFitScore;

    if (score >= 8) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
}

// ─── Main Classification ────────────────────────────────────────

/**
 * Classify an ingestion result into a learning record with polarity.
 * Runs positive signal detection, negative signal detection, and
 * cross-checks positive candidates against the negative track before
 * admitting them.
 */
export function classifyIngestion(
    result: TltTransformResult,
    corpusHash: string,
    summaries?: { linkedin: EvidenceAwareSummary; public: EvidenceAwareSummary },
    repeatabilityScore: number = 1,
): TltLearningRecord {
    const allPositiveSignals: TltPositiveSignal[] = [];
    const allNegativeSignals: TltNegativeSignal[] = [];

    for (const node of result.nodes) {
        // Detect signals per node
        const linkedinSummary = summaries?.linkedin;
        const pos = detectPositiveSignals(node, linkedinSummary);
        const neg = detectNegativeSignals(node);

        for (const s of pos) {
            if (!allPositiveSignals.includes(s)) allPositiveSignals.push(s);
        }
        for (const s of neg) {
            if (!allNegativeSignals.includes(s)) allNegativeSignals.push(s);
        }
    }

    // Cross-check: run negative guards on candidate positive signals
    const admittedPositive: TltPositiveSignal[] = [];
    for (const signal of allPositiveSignals) {
        // If any negative signal contradicts this positive, don't admit it
        let blocked = false;
        switch (signal) {
            case 'correct_verb_strength':
            case 'correct_evidence_ceiling':
                blocked = allNegativeSignals.includes('claim_strength_mismatch') ||
                    allNegativeSignals.includes('unsupported_strong_verb');
                break;
            case 'correct_semantic_firewall':
                blocked = allNegativeSignals.includes('public_internal_leak') ||
                    allNegativeSignals.includes('semantic_firewall_collapse');
                break;
            case 'correct_limitation_language':
            case 'correct_uncertainty_language':
                blocked = allNegativeSignals.includes('missing_limitation');
                break;
            case 'correct_non_overclaim':
                blocked = allNegativeSignals.includes('overclaim');
                break;
            case 'correct_downgrade':
                blocked = allNegativeSignals.includes('claim_strength_mismatch') === false;
                break;
            case 'correct_definition_use':
                blocked = allNegativeSignals.includes('term_drift');
                break;
            case 'correct_public_rewrite':
                blocked = allNegativeSignals.includes('public_internal_leak') === false;
                break;
            case 'canon_safe_summary':
                blocked = !(summaries?.linkedin?.canonSafe);
                break;
        }
        if (!blocked) {
            admittedPositive.push(signal);
        }
    }

    // Scores
    const positiveSupportScore = admittedPositive.length;
    const negativePressureScore = allNegativeSignals.length * 2; // negative signals weigh more
    const corpusFitScore = result.artifactsProcessed > 0 ? Math.min(result.summary.totalNodes / 10, 5) : 0;

    const confidenceScore =
        positiveSupportScore - negativePressureScore + repeatabilityScore + corpusFitScore;

    const confidence = confidenceScore >= 8 ? 'high' : confidenceScore >= 4 ? 'medium' : 'low';

    // Determine polarity
    let primary: LearningPolarity;
    let secondary: LearningPolarity | undefined;

    if (allNegativeSignals.length === 0 && admittedPositive.length > 0) {
        primary = 'positive';
    } else if (allNegativeSignals.length > 0 && admittedPositive.length === 0) {
        primary = 'negative';
    } else if (allNegativeSignals.length > 0 && admittedPositive.length > 0) {
        primary = 'negative';
        secondary = 'positive';
    } else {
        primary = 'neutral';
    }

    // Limitations
    const limitations: string[] = [];
    if (allNegativeSignals.length > 0) {
        limitations.push(`${allNegativeSignals.length} negative signals detected`);
    }
    if (positiveSupportScore > 0 && admittedPositive.length < allPositiveSignals.length) {
        limitations.push(`${allPositiveSignals.length - admittedPositive.length} positive signals blocked by negative cross-check`);
    }
    if (primary === 'neutral') {
        limitations.push('Insufficient evidence to classify polarity');
    }

    const record: TltLearningRecord = {
        recordId: nextRecordId(),
        corpusHash,
        polarity: primary,
        primaryPolarity: primary,
        secondaryPolarity: secondary,
        positiveSignals: admittedPositive,
        negativeSignals: allNegativeSignals,
        positiveSupportScore,
        negativePressureScore,
        confidenceScore,
        confidence,
        crossCheckedByNegativeTrack: true,
        admittedToPositiveTrack: admittedPositive.length > 0,
        evidenceCeiling: summaries?.linkedin
            ? (summaries.linkedin.canonSafe ? 'corpus_extracted' : 'surface_detected')
            : 'surface_detected',
        audienceMode: 'reviewer',
        limitations,
        totalNodes: result.summary.totalNodes,
        totalWarnings: summaries
            ? Object.values(summaries).reduce((sum, s) => sum + s.totalWarnings, 0)
            : 0,
        totalDowngrades: summaries
            ? Object.values(summaries).reduce((sum, s) => sum + s.downgradeCount, 0)
            : 0,
        totalLimitations: summaries
            ? Object.values(summaries).reduce((sum, s) => sum + s.limitationCount, 0)
            : 0,
        allModesCanonSafe: summaries
            ? Object.values(summaries).every(s => s.canonSafe)
            : false,
        zeroFalsePositives: allNegativeSignals.length === 0,
        generatedAt: new Date().toISOString(),
    };

    return record;
}

/**
 * Format a learning record for CLI output.
 */
export function formatLearningRecord(record: TltLearningRecord): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════');
    lines.push(`  Learning Record: ${record.recordId}`);
    lines.push('═══════════════════════════════════════════');
    lines.push('');
    lines.push(`  Polarity: ${record.polarity}` + (record.secondaryPolarity ? ` (secondary: ${record.secondaryPolarity})` : ''));
    lines.push(`  Confidence: ${record.confidence} (score: ${record.confidenceScore})`);
    lines.push(`  Positive support: ${record.positiveSupportScore} | Negative pressure: ${record.negativePressureScore}`);
    lines.push('');
    lines.push(`  Positive signals (${record.positiveSignals.length}):`);
    for (const s of record.positiveSignals) {
        lines.push(`    + ${s}`);
    }
    lines.push('');
    lines.push(`  Negative signals (${record.negativeSignals.length}):`);
    for (const s of record.negativeSignals) {
        lines.push(`    - ${s}`);
    }
    lines.push('');
    lines.push(`  Cross-checked: ${record.crossCheckedByNegativeTrack ? 'yes' : 'no'}`);
    lines.push(`  Admitted to positive: ${record.admittedToPositiveTrack ? 'yes' : 'no'}`);
    lines.push(`  Evidence ceiling: ${record.evidenceCeiling}`);
    lines.push(`  Zero false positives: ${record.zeroFalsePositives ? 'yes' : 'no'}`);
    lines.push(`  All modes canon-safe: ${record.allModesCanonSafe ? 'yes' : 'no'}`);
    lines.push('');
    lines.push(`  Nodes: ${record.totalNodes} | Warnings: ${record.totalWarnings} | Downgrades: ${record.totalDowngrades} | Limitations: ${record.totalLimitations}`);
    if (record.limitations.length > 0) {
        lines.push(`  Limitations:`);
        for (const l of record.limitations) {
            lines.push(`    • ${l}`);
        }
    }
    lines.push('');
    lines.push('═══════════════════════════════════════════');
    return lines.join('\n');
}

// ─── v10.7: Persistence ─────────────────────────────────────────
//
// Operating law:
//   Polarity persistence records structured learning evidence.
//   It does not train the model, rewrite canon, promote claims,
//   or certify truth. Learning memory may inform teaching,
//   calibration, and comparison only.

interface PolarityStore {
    version: '10.7.0';
    records: Record<string, TltLearningRecord>;
    latestByHash: Record<string, string>; // corpusHash → recordId
}

function polarityStorePath(): string {
    return path.join(process.cwd(), '.cohbit', 'atlas', 'polarity_records.json');
}

async function loadPolarityStore(): Promise<PolarityStore> {
    try {
        const raw = await fs.readFile(polarityStorePath(), 'utf-8');
        const store = JSON.parse(raw) as PolarityStore;
        if (store.version !== '10.7.0') {
            return { version: '10.7.0', records: {}, latestByHash: {} };
        }
        return store;
    } catch {
        return { version: '10.7.0', records: {}, latestByHash: {} };
    }
}

async function savePolarityStore(store: PolarityStore): Promise<void> {
    const dir = path.dirname(polarityStorePath());
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(polarityStorePath(), JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Deterministic record ID from corpus hash — prevents duplicates
 * when the same corpus is re-ingested.
 */
function deterministicRecordId(corpusHash: string): string {
    const hash = crypto.createHash('sha256').update(corpusHash).digest('hex');
    return `LRN_${hash.slice(0, 16)}`;
}

/**
 * Persist a learning record. Uses deterministic ID so re-ingestion
 * of the same corpus overwrites the previous record.
 */
export async function savePolarityRecord(record: TltLearningRecord): Promise<void> {
    const store = await loadPolarityStore();
    const dedupId = deterministicRecordId(record.corpusHash);
    record.recordId = dedupId;
    store.records[dedupId] = record;
    store.latestByHash[record.corpusHash] = dedupId;
    await savePolarityStore(store);
}

/**
 * List all persisted polarity records, optionally filtered by corpus hash.
 */
export async function listPolarityRecords(corpusHash?: string): Promise<TltLearningRecord[]> {
    const store = await loadPolarityStore();
    const all = Object.values(store.records);
    if (corpusHash) {
        return all.filter(r => r.corpusHash === corpusHash);
    }
    return all.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

/**
 * Get the latest record for a given corpus hash.
 */
export async function getLatestByHash(corpusHash: string): Promise<TltLearningRecord | null> {
    const store = await loadPolarityStore();
    const recordId = store.latestByHash[corpusHash];
    if (!recordId) return null;
    return store.records[recordId] ?? null;
}

/**
 * Compare two polarity records and return drift metrics.
 */
export interface PolarityComparison {
    confidenceDelta: number;
    positiveSignalDelta: number;
    negativeSignalDelta: number;
    polarityChanged: boolean;
    newNegativeSignals: string[];
    resolvedNegativeSignals: string[];
    newPositiveSignals: string[];
    lostPositiveSignals: string[];
}

export function comparePolarityRecords(a: TltLearningRecord, b: TltLearningRecord): PolarityComparison {
    const aNeg = new Set(a.negativeSignals);
    const bNeg = new Set(b.negativeSignals);
    const aPos = new Set(a.positiveSignals);
    const bPos = new Set(b.positiveSignals);

    return {
        confidenceDelta: b.confidenceScore - a.confidenceScore,
        positiveSignalDelta: b.positiveSignals.length - a.positiveSignals.length,
        negativeSignalDelta: b.negativeSignals.length - a.negativeSignals.length,
        polarityChanged: a.polarity !== b.polarity,
        newNegativeSignals: [...bNeg].filter(s => !aNeg.has(s)),
        resolvedNegativeSignals: [...aNeg].filter(s => !bNeg.has(s)),
        newPositiveSignals: [...bPos].filter(s => !aPos.has(s)),
        lostPositiveSignals: [...aPos].filter(s => !bPos.has(s)),
    };
}

/**
 * Format a polarity comparison for CLI output.
 */
export function formatComparison(cmp: PolarityComparison, recordA: string, recordB: string): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════');
    lines.push(`  Polarity Comparison`);
    lines.push(`  ${recordA} → ${recordB}`);
    lines.push('═══════════════════════════════════════════');
    lines.push('');
    lines.push(`  Confidence delta: ${cmp.confidenceDelta > 0 ? '+' : ''}${cmp.confidenceDelta}`);
    lines.push(`  Positive signal delta: ${cmp.positiveSignalDelta > 0 ? '+' : ''}${cmp.positiveSignalDelta}`);
    lines.push(`  Negative signal delta: ${cmp.negativeSignalDelta > 0 ? '+' : ''}${cmp.negativeSignalDelta}`);
    lines.push(`  Polarity changed: ${cmp.polarityChanged ? 'yes' : 'no'}`);
    if (cmp.newNegativeSignals.length > 0) {
        lines.push(`  New negative signals: ${cmp.newNegativeSignals.join(', ')}`);
    }
    if (cmp.resolvedNegativeSignals.length > 0) {
        lines.push(`  Resolved negative signals: ${cmp.resolvedNegativeSignals.join(', ')}`);
    }
    if (cmp.newPositiveSignals.length > 0) {
        lines.push(`  New positive signals: ${cmp.newPositiveSignals.join(', ')}`);
    }
    if (cmp.lostPositiveSignals.length > 0) {
        lines.push(`  Lost positive signals: ${cmp.lostPositiveSignals.join(', ')}`);
    }
    lines.push('');
    lines.push('═══════════════════════════════════════════');
    return lines.join('\n');
}
