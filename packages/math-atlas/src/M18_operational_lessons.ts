// @cohbit/math-atlas — M18 Operational Lesson Memory (v8.8)
// Persists recurring build/formalization/operational lessons
// with compressed memory: same lesson → increment hitCount, merge modules.
//
// Persistence: .cohbit/atlas/operational_lessons.json
//
// Operating law:
//   Operational lessons aggregate operational experience, not duplicate it.
//   Same lesson/occurrence → update existing, increment hitCount.
//   Lessons are advisory memory, not execution gates.

import * as crypto from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ─── Types ─────────────────────────────────────────────────────

export interface OperationalLesson {
    lessonId: string;           // "LES_001"
    lessonHash: string;         // deterministic from lessonId
    title: string;
    diagnosis: string;
    repair: string;
    hitCount: number;
    sourceModules: string[];
    receiptRefs: string[];
    severity: 'critical' | 'high' | 'medium' | 'low';
    status: 'active' | 'mitigated' | 'resolved';
    firstSeen: string;
    lastSeen: string;
}

export interface OperationalLessonStore {
    version: 'v8.8';
    lastRun: string;
    lessons: Record<string, OperationalLesson>;
}

// ─── Pre-Seeded Lessons ────────────────────────────────────────

export const PRE_SEEDED_LESSONS: Omit<OperationalLesson, 'lessonHash' | 'hitCount' | 'sourceModules' | 'receiptRefs' | 'firstSeen' | 'lastSeen'>[] = [
    { lessonId: 'LES_001', title: 'Real.decidableLT regression', diagnosis: 'Lean 4 real number decidability fails where Nat decidability succeeds', repair: 'Check decidability context; avoid Real in decidable propositions where Nat suffices', severity: 'high', status: 'active' },
    { lessonId: 'LES_002', title: 'Unicode λ parse issue', diagnosis: 'Lean 4 parser rejects Unicode λ in certain contexts', repair: 'Use ASCII "fun" keyword or lam notation as fallback', severity: 'medium', status: 'active' },
    { lessonId: 'LES_003', title: 'Axiom body syntax', diagnosis: 'axiom declarations require explicit type body syntax', repair: 'Ensure axiom body follows Lean 4 axiom syntax: axiom name : type', severity: 'medium', status: 'active' },
    { lessonId: 'LES_004', title: 'BigOperators scoping', diagnosis: '∑ notation requires open scoped BigOperators import', repair: 'Add "open scoped BigOperators" before using ∑/∏ notation', severity: 'medium', status: 'active' },
    { lessonId: 'LES_005', title: 'lake env lean pass ≠ olean exists', diagnosis: 'lake env reports Lean passes but .olean files are absent or stale', repair: 'Run "lake build --clean" then "lake build" to rebuild olean cache', severity: 'high', status: 'active' },
    { lessonId: 'LES_006', title: 'Lakefile unregistered ≠ missing file', diagnosis: 'Lakefile exists but module is not registered in lakefile.lean', repair: 'Add module to lakefile.lean dependencies before importing', severity: 'medium', status: 'active' },
    { lessonId: 'LES_007', title: 'Failure classification required', diagnosis: 'Build failures are reported uniformly without distinguishing cause', repair: 'Classify failures as cascade/local/parse/type/tactic before acting', severity: 'critical', status: 'active' },
    { lessonId: 'LES_008', title: 'Cascade failure ≠ local content failure', diagnosis: 'Upstream module failure causes downstream module failure', repair: 'Fix root failure first; do not attempt to fix cascade failures independently', severity: 'critical', status: 'active' },
    { lessonId: 'LES_009', title: 'Tactic regression', diagnosis: 'Previously working tactic script fails after Lean version update', repair: 'Pin Lean toolchain version; test tactic scripts in CI', severity: 'medium', status: 'active' },
];

// ─── Paths ─────────────────────────────────────────────────────

function lessonsPath(): string {
    return path.join(process.cwd(), '.cohbit', 'atlas', 'operational_lessons.json');
}

// ─── Load / Save ───────────────────────────────────────────────

export async function loadLessonStore(): Promise<OperationalLessonStore> {
    try {
        const raw = await fs.readFile(lessonsPath(), 'utf-8');
        const store = JSON.parse(raw) as OperationalLessonStore;
        if (store.version !== 'v8.8') {
            return { version: 'v8.8', lastRun: '', lessons: {} };
        }
        return store;
    } catch {
        return { version: 'v8.8', lastRun: '', lessons: {} };
    }
}

export async function saveLessonStore(store: OperationalLessonStore): Promise<void> {
    const dir = path.dirname(lessonsPath());
    await fs.mkdir(dir, { recursive: true });
    store.lastRun = new Date().toISOString();
    await fs.writeFile(lessonsPath(), JSON.stringify(store, null, 2), 'utf-8');
}

// ─── Seeding ───────────────────────────────────────────────────

export function computeLessonHash(lessonId: string): string {
    return crypto.createHash('sha256').update(`lesson:${lessonId}`, 'utf8').digest('hex').slice(0, 16);
}

export async function seedLessonsIfEmpty(): Promise<number> {
    const store = await loadLessonStore();
    if (Object.keys(store.lessons).length > 0) return 0;

    const now = new Date().toISOString();
    let count = 0;
    for (const lesson of PRE_SEEDED_LESSONS) {
        const lessonHash = computeLessonHash(lesson.lessonId);
        store.lessons[lessonHash] = {
            ...lesson,
            lessonHash,
            hitCount: 1,
            sourceModules: [],
            receiptRefs: [],
            firstSeen: now,
            lastSeen: now,
        };
        count++;
    }
    store.lastRun = now;
    await saveLessonStore(store);
    return count;
}

// ─── Record/Update ─────────────────────────────────────────────

export async function recordLesson(lessonId: string, module?: string, receiptRef?: string): Promise<boolean> {
    const store = await loadLessonStore();
    const lessonHash = computeLessonHash(lessonId);
    const now = new Date().toISOString();

    const existing = store.lessons[lessonHash];
    if (existing) {
        existing.hitCount += 1;
        if (module && !existing.sourceModules.includes(module)) {
            existing.sourceModules.push(module);
            existing.sourceModules.sort();
        }
        if (receiptRef && !existing.receiptRefs.includes(receiptRef)) {
            existing.receiptRefs.push(receiptRef);
            existing.receiptRefs.sort();
        }
        existing.lastSeen = now;
    } else {
        // Find pre-seeded template or create new
        const template = PRE_SEEDED_LESSONS.find(l => l.lessonId === lessonId);
        store.lessons[lessonHash] = {
            lessonId,
            lessonHash,
            title: template?.title ?? lessonId,
            diagnosis: template?.diagnosis ?? 'Unknown operational issue',
            repair: template?.repair ?? 'Investigate and document',
            hitCount: 1,
            sourceModules: module ? [module] : [],
            receiptRefs: receiptRef ? [receiptRef] : [],
            severity: template?.severity ?? 'medium',
            status: template?.status ?? 'active',
            firstSeen: now,
            lastSeen: now,
        };
    }

    store.lastRun = now;
    await saveLessonStore(store);
    return true;
}

export async function listLessons(filter?: { status?: string; severity?: string }): Promise<OperationalLesson[]> {
    const store = await loadLessonStore();
    let lessons = Object.values(store.lessons);
    if (filter?.status) {
        lessons = lessons.filter(l => l.status === filter.status);
    }
    if (filter?.severity) {
        lessons = lessons.filter(l => l.severity === filter.severity);
    }
    return lessons.sort((a, b) => a.lessonId.localeCompare(b.lessonId));
}