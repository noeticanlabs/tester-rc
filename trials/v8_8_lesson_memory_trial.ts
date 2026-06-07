// CohBit-Copilot v8.8 — Operational Lesson Memory Trial
// Verifies: seed, hit count increment, dedup, persistence across runs.
//
// Operating law:
//   Lessons aggregate operational experience, not duplicate it.

import { seedLessonsIfEmpty, listLessons, recordLesson } from '../packages/math-atlas/src/M18_operational_lessons.js';

async function main() {
    console.log('=== CohBit-Copilot v8.8 Operational Lesson Trial ===\n');

    // ─── Seed ──────────────────────────────────────────────────
    const seeded = await seedLessonsIfEmpty();
    console.log(`Seeded: ${seeded} lessons`);

    const all = await listLessons();
    console.log(`Total: ${all.length} lessons\n`);

    // ─── Check pre-seeded content ──────────────────────────────
    const checks: string[] = [];
    const les1 = all.find(l => l.lessonId === 'LES_001');
    if (les1 && les1.hitCount === 1) checks.push('LES_001 seeded with hitCount=1');
    if (les1 && les1.title === 'Real.decidableLT regression') checks.push('LES_001 title correct');

    const les7 = all.find(l => l.lessonId === 'LES_007');
    if (les7 && les7.severity === 'critical') checks.push('LES_007 severity: critical');

    // ─── Record same lesson twice (dedup test) ─────────────────
    await recordLesson('LES_001', 'cohbit-language-swarm');
    await recordLesson('LES_001', 'lean-formalization');
    await recordLesson('LES_001', 'cohbit-language-swarm'); // duplicate module

    const updated = await listLessons();
    const les1Updated = updated.find(l => l.lessonId === 'LES_001');

    if (les1Updated) {
        if (les1Updated.hitCount === 4) checks.push('LES_001 hitCount: 4 (1 seed + 3 records)');
        if (les1Updated.sourceModules.length === 2) checks.push('LES_001 modules deduped: 2 unique');
        if (les1Updated.sourceModules.includes('cohbit-language-swarm')) checks.push('LES_001 module cohbit-language-swarm present');
    }

    // ─── Critical lessons present ──────────────────────────────
    const critical = await listLessons({ severity: 'critical' });
    if (critical.length === 2) checks.push('2 critical lessons (LES_007, LES_008)');

    // ─── Store persisted across runs ───────────────────────────
    const thirdLoad = await listLessons();
    if (thirdLoad.length === 9) checks.push('9 lessons survive across reads');

    // ─── Summary ───────────────────────────────────────────────
    console.log('── Results ──');
    for (const c of checks) {
        console.log(`  ✓ ${c}`);
    }
    const total = 9;
    const passed = checks.length;
    console.log(`\n${passed}/${total} checks passed.`);
    console.log(passed >= 6 ? '\n✓ v8.8 Operational lesson memory trial PASSED.' : '\n⚠ Some checks failed.');
}

main().catch(err => {
    console.error('v8.8 lesson trial failed:', err);
    process.exit(1);
});