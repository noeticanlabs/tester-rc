// CohBit-Copilot v13.2 — Unified Memory Stability Dashboard + Drift Detection
// Aggregates 6 distributed memory subsystems into one health report.
// Persists previous run for cross-run drift comparison.

import {
    getAllObligations,
    generateDashboard,
    loadObligationStore,
} from './atlas_integration.js';
import { listRecentAtlasEntries } from '../packages/code-atlas/src/store.js';
import { listLessons } from './teaching.js';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

// ─── Types ─────────────────────────────────────────────────────

export interface ObligationStability {
    total: number;
    open: number;
    underReview: number;
    closed: number;
    stale: number;
    deferred: number;
    escalated: number;
    health: string;
}

export interface AtlasStoreStability {
    totalEntries: number;
    entriesByClaim: Record<string, number>;
    recentEntries: number;
    driftNote: string;
}

export interface PolarityStability {
    recordsAvailable: boolean;
    recordCount: number;
    positiveCount: number;
    negativeCount: number;
    neutralCount: number;
    lastConfidence: number;
    trend: string;
}

export interface TeachingReceiptStability {
    lessonCount: number;
    activeLessons: number;
    resolvedLessons: number;
    criticalLessons: number;
    evidenceCeilings: Record<string, number>;
    lastLessonAt: string;
}

export interface ProcessorStability {
    processorsAvailable: boolean;
    processorCount: number;
    deterministicCount: number;
    heuristicCount: number;
    hybridCount: number;
    allEvidencePresent: boolean;
    totalCpuMs: number;
}

export interface DriftWarning {
    rule: string;
    message: string;
    severity: 'info' | 'watch' | 'degraded';
    previousValue: string;
    currentValue: string;
}

export interface CanaryWarning {
    rule: string;
    message: string;
    severity: 'info' | 'watch';
}

export interface MemoryStabilityReport {
    ranAt: string;
    obligations: ObligationStability;
    atlasStore: AtlasStoreStability;
    patterns: { available: boolean; patternCount: number; totalHits: number; note: string };
    polarity: PolarityStability;
    teachingReceipts: TeachingReceiptStability;
    processors: ProcessorStability;
    canaryWarnings: CanaryWarning[];
    driftWarnings: DriftWarning[];
    previousRunAt: string | null;
    summary: string;
}

// ─── Obligation Stability ──────────────────────────────────────

async function summarizeObligationStability(): Promise<ObligationStability> {
    try {
        await loadObligationStore();
        const dashboard = generateDashboard();
        const all = getAllObligations();

        const open = all.filter(o => (o.currentStatus as string) === 'open').length;
        const underReview = all.filter(o => (o.currentStatus as string) === 'under_review').length;
        const closed = all.filter(o => (o.currentStatus as string) === 'closed').length;
        const stale = dashboard.aging.staleHigh.length;
        const deferred = all.filter(o => (o.currentStatus as string) === 'deferred').length;
        const escalated = dashboard.aging.reReviewNeeded.length;
        const health = dashboard.health.open > 20 ? 'degraded' : dashboard.health.open > 10 ? 'watch' : 'healthy';

        return { total: all.length, open, underReview, closed, stale, deferred, escalated, health };
    } catch {
        return { total: 0, open: 0, underReview: 0, closed: 0, stale: 0, deferred: 0, escalated: 0, health: 'unknown' };
    }
}

// ─── Atlas Store Stability ─────────────────────────────────────

async function summarizeAtlasStoreStability(): Promise<AtlasStoreStability> {
    try {
        const entries = await listRecentAtlasEntries(500);
        const byClaim: Record<string, number> = {};
        for (const e of entries) byClaim[e.claimStatus] = (byClaim[e.claimStatus] ?? 0) + 1;
        return {
            totalEntries: entries.length, entriesByClaim: byClaim,
            recentEntries: entries.slice(0, 20).length,
            driftNote: entries.length > 0 ? 'Atlas store has entries available.' : 'Atlas store is empty (no audit runs yet).',
        };
    } catch {
        return { totalEntries: 0, entriesByClaim: {}, recentEntries: 0, driftNote: 'Atlas store unavailable or empty.' };
    }
}

// ─── Canonical Pattern Stability ───────────────────────────────

async function summarizePatternStability(): Promise<MemoryStabilityReport['patterns']> {
    try {
        const pp = path.join(process.cwd(), '.cohbit', 'atlas', 'canonical_patterns.json');
        const raw = await fs.readFile(pp, 'utf-8');
        const patterns = JSON.parse(raw) as Array<{ patternHash: string; hitCount: number; firstSeen: string; lastSeen: string }>;
        const totalHits = patterns.reduce((s, p) => s + p.hitCount, 0);
        return { available: true, patternCount: patterns.length, totalHits, note: `Patterns available.` };
    } catch {
        return { available: false, patternCount: 0, totalHits: 0, note: 'Canonical patterns not available.' };
    }
}

// ─── Learning Polarity Stability ───────────────────────────────

async function summarizePolarityStability(): Promise<PolarityStability> {
    try {
        const { listPolarityRecords } = await import('../packages/tlt-atlas/src/L16_learning_polarity.js');
        const records = await listPolarityRecords();
        if (records.length === 0) return { recordsAvailable: true, recordCount: 0, positiveCount: 0, negativeCount: 0, neutralCount: 0, lastConfidence: 0, trend: 'unknown' };
        const latest = records[0]!;
        const pos = records.filter(r => (r as any).polarity === 'positive').length;
        const neg = records.filter(r => (r as any).polarity === 'negative').length;
        const neu = records.filter(r => (r as any).polarity === 'neutral').length;
        let trend = 'stable'; if (neg > pos) trend = 'drifting'; if (records.length < 3) trend = 'unknown';
        return { recordsAvailable: true, recordCount: records.length, positiveCount: pos, negativeCount: neg, neutralCount: neu, lastConfidence: (latest as any).confidence ?? 0, trend };
    } catch {
        return { recordsAvailable: false, recordCount: 0, positiveCount: 0, negativeCount: 0, neutralCount: 0, lastConfidence: 0, trend: 'unknown' };
    }
}

// ─── Teaching Receipt Stability ─────────────────────────────────

async function summarizeTeachingReceiptStability(): Promise<TeachingReceiptStability> {
    try {
        const { seedLessonsIfEmpty } = await import('./teaching.js');
        await seedLessonsIfEmpty();
        const lessons = await listLessons();
        const active = lessons.filter(l => l.status === 'active').length;
        const resolved = lessons.filter(l => l.status === 'resolved').length;
        const critical = lessons.filter(l => l.severity === 'critical').length;
        const ceilings: Record<string, number> = {};
        for (const l of lessons) { const c = l.status ?? 'unknown'; ceilings[c] = (ceilings[c] ?? 0) + 1; }
        const last = lessons.length > 0 ? (lessons[0]?.lastSeen ?? 'unknown') : 'no lessons';
        return { lessonCount: lessons.length, activeLessons: active, resolvedLessons: resolved, criticalLessons: critical, evidenceCeilings: ceilings, lastLessonAt: last };
    } catch {
        return { lessonCount: 0, activeLessons: 0, resolvedLessons: 0, criticalLessons: 0, evidenceCeilings: {}, lastLessonAt: 'unknown' };
    }
}

// ─── Processor Fragment Stability ──────────────────────────────

async function summarizeProcessorStability(): Promise<ProcessorStability> {
    try {
        const fp = path.join(process.cwd(), '.cohbit', 'r21_fragments.json');
        const raw = await fs.readFile(fp, 'utf-8');
        const frags = JSON.parse(raw) as Array<{ logic?: string; evidenceLevel?: string; cpuMs?: number }>;
        const det = frags.filter(f => f.logic === 'deterministic').length;
        const heu = frags.filter(f => f.logic === 'heuristic').length;
        const hyb = frags.filter(f => f.logic === 'hybrid').length;
        const evOk = frags.every(f => f.evidenceLevel && f.evidenceLevel !== 'none');
        const cpu = frags.reduce((s, f) => s + (f.cpuMs ?? 0), 0);
        return { processorsAvailable: true, processorCount: frags.length, deterministicCount: det, heuristicCount: heu, hybridCount: hyb, allEvidencePresent: evOk, totalCpuMs: cpu };
    } catch {
        return { processorsAvailable: false, processorCount: 0, deterministicCount: 0, heuristicCount: 0, hybridCount: 0, allEvidencePresent: false, totalCpuMs: 0 };
    }
}

// ─── Canary + Drift Warnings ────────────────────────────────────

function computeCanaryWarnings(
    o: ObligationStability, a: AtlasStoreStability,
    p: PolarityStability, t: TeachingReceiptStability,
    pr: ProcessorStability,
): CanaryWarning[] {
    const w: CanaryWarning[] = [];
    if (o.open > 50) w.push({ rule: 'open_obligations_high', message: `${o.open} open obligations — may indicate backlog.`, severity: 'watch' });
    if (o.stale > 5) w.push({ rule: 'stale_obligations', message: `${o.stale} stale high-priority obligations — review needed.`, severity: 'watch' });
    if (a.totalEntries === 0) w.push({ rule: 'atlas_empty', message: 'No atlas entries — no audits have been run yet.', severity: 'info' });
    if (p.trend === 'drifting') w.push({ rule: 'polarity_drift', message: `Learning polarity trending negative.`, severity: 'watch' });
    if (p.lastConfidence < 1.0 && p.recordCount > 0) w.push({ rule: 'polarity_low_confidence', message: `Last polarity confidence is low (${p.lastConfidence}).`, severity: 'info' });
    if (t.criticalLessons > 0) w.push({ rule: 'critical_lessons', message: `${t.criticalLessons} high-severity operational lessons present. Advisory only — not runtime failures.`, severity: 'info' });
    if (pr.processorCount > 0 && !pr.allEvidencePresent) w.push({ rule: 'processor_missing_evidence', message: 'Some processor fragments are missing evidence levels.', severity: 'info' });
    return w;
}

function computeDriftWarnings(
    current: MemoryStabilityReport,
    prev: MemoryStabilityReport,
): DriftWarning[] {
    const w: DriftWarning[] = [];

    if (current.obligations.open > prev.obligations.open * 2 && prev.obligations.open > 0) {
        w.push({ rule: 'new_obligations_spike', message: `Obligations spiked from ${prev.obligations.open} to ${current.obligations.open} open.`, severity: 'degraded', previousValue: String(prev.obligations.open), currentValue: String(current.obligations.open) });
    }
    if (current.atlasStore.totalEntries < prev.atlasStore.totalEntries) {
        w.push({ rule: 'atlas_entries_decreased', message: `Atlas entries decreased from ${prev.atlasStore.totalEntries} to ${current.atlasStore.totalEntries}.`, severity: 'watch', previousValue: String(prev.atlasStore.totalEntries), currentValue: String(current.atlasStore.totalEntries) });
    }
    if (current.polarity.recordsAvailable && prev.polarity.recordsAvailable) {
        const d = current.polarity.lastConfidence - prev.polarity.lastConfidence;
        if (d < -2.0) w.push({ rule: 'polarity_confidence_drop', message: `Polarity confidence dropped from ${prev.polarity.lastConfidence} to ${current.polarity.lastConfidence}.`, severity: 'watch', previousValue: String(prev.polarity.lastConfidence), currentValue: String(current.polarity.lastConfidence) });
    }
    if (current.polarity.negativeCount > prev.polarity.negativeCount + 5) {
        w.push({ rule: 'negative_signals_increase', message: `Negative signals increased from ${prev.polarity.negativeCount} to ${current.polarity.negativeCount}.`, severity: 'watch', previousValue: String(prev.polarity.negativeCount), currentValue: String(current.polarity.negativeCount) });
    }
    if (!current.processors.processorsAvailable && prev.processors.processorsAvailable) {
        w.push({ rule: 'processors_missing_after_audit', message: 'Processor fragments were previously available but are now missing.', severity: 'info', previousValue: 'available', currentValue: 'missing' });
    }
    if (!current.patterns.available && current.obligations.total > 0) {
        w.push({ rule: 'patterns_absent_with_obligations', message: 'Obligations exist but canonical patterns are absent.', severity: 'info', previousValue: 'N/A', currentValue: 'obligations present, patterns absent' });
    }

    return w;
}

// ─── Report Builder ────────────────────────────────────────────

export async function buildMemoryStabilityReport(): Promise<MemoryStabilityReport> {
    const obligations = await summarizeObligationStability();
    const atlasStore = await summarizeAtlasStoreStability();
    const patterns = await summarizePatternStability();
    const polarity = await summarizePolarityStability();
    const teachingReceipts = await summarizeTeachingReceiptStability();
    const processors = await summarizeProcessorStability();

    const canaryWarnings = computeCanaryWarnings(obligations, atlasStore, polarity, teachingReceipts, processors);

    const summaryLines: string[] = [];
    summaryLines.push(`obligations: ${obligations.health}`);
    summaryLines.push(`atlas: ${atlasStore.totalEntries} entries`);
    summaryLines.push(patterns.available ? `patterns: ${patterns.patternCount}` : 'patterns: unavailable');
    summaryLines.push(`polarity: ${polarity.trend}`);
    summaryLines.push(`lessons: ${teachingReceipts.lessonCount}`);
    if (canaryWarnings.length > 0) summaryLines.push(`warnings: ${canaryWarnings.length}`);

    // ── Drift comparison ───────────────────────────────────
    let driftWarnings: DriftWarning[] = [];
    let previousRunAt: string | null = null;

    try {
        const prevPath = path.join(process.cwd(), '.cohbit', 'memory_previous.json');
        const prevRaw = await fs.readFile(prevPath, 'utf-8');
        const prev = JSON.parse(prevRaw) as MemoryStabilityReport;
        previousRunAt = prev.ranAt;
        driftWarnings = computeDriftWarnings({ ranAt: '', obligations, atlasStore, patterns, polarity, teachingReceipts, processors, canaryWarnings, driftWarnings: [], previousRunAt: null, summary: '' }, prev);
    } catch {
        // first run — no previous
    }

    const report: MemoryStabilityReport = {
        ranAt: new Date().toISOString(),
        obligations, atlasStore, patterns, polarity,
        teachingReceipts, processors,
        canaryWarnings, driftWarnings, previousRunAt,
        summary: summaryLines.join(' | '),
    };

    // Persist for next drift comparison
    try {
        const prevPath = path.join(process.cwd(), '.cohbit', 'memory_previous.json');
        await fs.mkdir(path.join(process.cwd(), '.cohbit'), { recursive: true });
        await fs.writeFile(prevPath, JSON.stringify(report, null, 2));
    } catch { /* best-effort */ }

    return report;
}

// ─── Renderers ─────────────────────────────────────────────────

export function renderMemoryStabilityMarkdown(report: MemoryStabilityReport): string {
    const l: string[] = [
        '# Memory Stability Dashboard',
        `**Ran:** ${report.ranAt}`,
        report.previousRunAt ? `**Previous run:** ${report.previousRunAt}` : '**Previous run:** none (first run)',
        '',
        '> ⚠ Memory health is not proof of correctness. Canary and drift warnings are advisory only. No memory mutation was performed.',
        '',
        '## Overall Health',
        `| Subsystem | Status | Detail |`,
        `|-----------|--------|--------|`,
        `| Obligations | ${report.obligations.health.toUpperCase()} | ${report.obligations.open} open, ${report.obligations.closed} closed |`,
        `| Atlas Store | ${report.atlasStore.totalEntries > 0 ? 'ACTIVE' : 'EMPTY'} | ${report.atlasStore.totalEntries} entries |`,
        `| Patterns | ${report.patterns.available ? 'ACTIVE' : 'UNAVAILABLE'} | ${report.patterns.patternCount} patterns, ${report.patterns.totalHits} hits |`,
        `| Learning Polarity | ${report.polarity.trend.toUpperCase()} | pos=${report.polarity.positiveCount}, neg=${report.polarity.negativeCount} |`,
        `| Teaching Receipts | ${report.teachingReceipts.lessonCount > 0 ? 'ACTIVE' : 'EMPTY'} | ${report.teachingReceipts.lessonCount} lessons |`,
        `| Processors | ${report.processors.processorsAvailable ? 'TRACKING' : 'UNAVAILABLE'} | ${report.processors.processorCount} fragments |`,
        '',
    ];

    if (report.canaryWarnings.length > 0) {
        l.push('## Canary Warnings', '');
        l.push('| Sev | Rule | Message |');
        l.push('|-----|------|---------|');
        for (const w of report.canaryWarnings) l.push(`| ${w.severity === 'watch' ? '⚠' : 'ℹ'} | ${w.rule} | ${w.message} |`);
        l.push('');
    }

    if (report.driftWarnings.length > 0) {
        l.push('## Drift Warnings (cross-run comparison)', '');
        l.push('| Sev | Rule | Previous | Current | Message |');
        l.push('|-----|------|----------|---------|---------|');
        for (const w of report.driftWarnings) {
            const icon = w.severity === 'degraded' ? '🔴' : w.severity === 'watch' ? '⚠' : 'ℹ';
            l.push(`| ${icon} | ${w.rule} | ${w.previousValue} | ${w.currentValue} | ${w.message} |`);
        }
        l.push('');
    }

    l.push('---', '', '*CohBit-Copilot v13.2 Memory Stability Dashboard. Read-only. Advisory only. No mutation.*');
    return l.join('\n');
}

export function renderMemoryStabilityJson(report: MemoryStabilityReport): string {
    return JSON.stringify(report, null, 2);
}