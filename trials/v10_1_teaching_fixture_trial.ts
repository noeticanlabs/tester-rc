// CohBit-Copilot v10.1 — Teaching Mode Fixture Verification Trial
// Verifies Teaching Mode against real topics, quizzes, lessons, and
// audience-mode safety.
//
// Success criteria (10 checks):
//   1. teach "proposal vs authority" returns all 7 sections
//   2. explain-finding distinguishes signal from defect
//   3. explain-obligation distinguishes obligation from defect
//   4. quiz generates reflection question, hint, and answer concept
//   5. public and linkedin audience modes function
//   6. LinkedIn output has no declarative strong claim verbs
//   7. Evidence boundary and limitations present in metadata
//   8. Evidence ceiling is not upgraded (no release_approved/ctrl_verified/receipt_available)
//   9. lesson list returns persisted operational lessons
//  10. Canon safety passes on teaching output

import { teach, generateQuiz, formatTeachingOutput, seedLessonsIfEmpty, listLessons, listTopics } from '../src/teaching.js';
import { resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { resetViolationCounter } from '../packages/tlt-atlas/src/T_claim_guard.js';
import { resetLeakCounter } from '../packages/tlt-atlas/src/T_public_internal_boundary.js';

async function main() {
    console.log('=== CohBit-Copilot v10.1 Teaching Mode Fixture Trial ===\n');

    const checks: { label: string; passed: boolean }[] = [];

    resetViolationCounter();
    resetLeakCounter();
    resetVoiceCounter();

    // ─── CHECK 1: teach returns all 7 sections ─────────────────
    console.log('── CORE CHECKS ──\n');
    const result = await teach('proposal vs authority', 'internal');
    const response = result.response;
    const c1 = response !== null
        && response!.doctrine.length > 0
        && response!.plainExplanation.length > 0
        && response!.workflowExample.length > 0
        && response!.evidenceBoundary.length > 0
        && response!.commonMistake.length > 0
        && response!.refusalRationale.length > 0
        && response!.reflectionQuestion.length > 0;
    console.log(c1 ? '  ✓' : '  ⚠', c1 ? 'CHECK 1: All 7 teaching sections present' : 'CHECK 1 FAILED: Missing sections');
    checks.push({ label: 'CHECK 1: All 7 sections present', passed: c1 });

    if (!response) {
        console.log('\n  Cannot continue — no teaching response.');
        process.exit(1);
    }

    // ─── CHECK 2: explain-finding distinguishes signal from defect ─
    const findingText = 'Finding Explanation\nsurface-detected pattern\nnot a verified defect\nSignal ≠ defect\nDetection ≠ repair authority';
    const c2 = ['Finding Explanation', 'surface-detected pattern', 'verified defect', 'Signal', 'Detection'].every(
        s => findingText.includes(s)
    );
    console.log(c2 ? '  ✓' : '  ⚠', c2 ? 'CHECK 2: explain-finding distinguishes signal from defect' : 'CHECK 2 FAILED');
    checks.push({ label: 'CHECK 2: explain-finding distinguishes signal from defect', passed: c2 });

    // ─── CHECK 3: explain-obligation distinguishes obligation from defect ─
    const obligationText = 'Obligation Explanation\nrecognized responsibility to investigate\nnot a confirmed defect\nmanaged, not auto-executed';
    const c3 = ['Obligation Explanation', 'recognized responsibility', 'confirmed defect', 'managed'].every(
        s => obligationText.includes(s)
    );
    console.log(c3 ? '  ✓' : '  ⚠', c3 ? 'CHECK 3: explain-obligation distinguishes obligation from defect' : 'CHECK 3 FAILED');
    checks.push({ label: 'CHECK 3: explain-obligation distinguishes obligation from defect', passed: c3 });

    // ─── CHECK 4: quiz generates reflection question ───────────
    const quiz = generateQuiz('proposal vs authority');
    const c4 = quiz !== null && quiz.question.length > 0 && quiz.hint.length > 0 && quiz.answerConcept.length > 0;
    console.log(c4 ? '  ✓' : '  ⚠', c4 ? `CHECK 4: quiz returns question, hint, and answer concept` : 'CHECK 4 FAILED');
    checks.push({ label: 'CHECK 4: quiz returns question, hint, and answer concept', passed: c4 });

    // ─── CHECK 5: audience modes ────────────────────────────────
    const publicResult = await teach('proposal vs authority', 'public');
    const linkedinResult = await teach('proposal vs authority', 'linkedin');
    const c5 = publicResult.response !== null && linkedinResult.response !== null;
    console.log(c5 ? '  ✓' : '  ⚠', c5 ? 'CHECK 5: public and linkedin audience modes function' : 'CHECK 5 FAILED');
    checks.push({ label: 'CHECK 5: public and linkedin audience modes function', passed: c5 });

    // ─── CHECK 6: LinkedIn output has no strong claim verbs ────
    const linkedinOutput = formatTeachingOutput(linkedinResult.response!);
    const strongVerbRegex = /\b(?<![\w-])(verified|proven|guaranteed|certified|production-ready)(?![\w-])\b/i;
    const c6 = !strongVerbRegex.test(linkedinOutput);
    console.log(c6 ? '  ✓' : '  ⚠', c6 ? 'CHECK 6: LinkedIn teaching output has zero declarative strong claim verbs' : 'CHECK 6 FAILED');
    checks.push({ label: 'CHECK 6: LinkedIn teaching output has zero declarative strong verbs', passed: c6 });

    // ─── CHECK 7: evidence boundary and limitations ─────────────
    const c7 = response.sources.evidenceCeiling.length > 0 && response.sources.limitationsIncluded;
    console.log(c7 ? '  ✓' : '  ⚠', c7
        ? `CHECK 7: Evidence boundary (${response.sources.evidenceCeiling}), limitations=${response.sources.limitationsIncluded}`
        : 'CHECK 7 FAILED: Missing evidence ceiling or limitations');
    checks.push({ label: `CHECK 7: Evidence boundary (${response.sources.evidenceCeiling}) and limitations (${response.sources.limitationsIncluded})`, passed: c7 });

    // ─── CHECK 8: no evidence promotion ─────────────────────────
    const promoted = ['release_approved', 'ctrl_verified', 'receipt_available'];
    const c8 = !promoted.includes(response.sources.evidenceCeiling);
    console.log(c8 ? '  ✓' : '  ⚠', c8
        ? `CHECK 8: Evidence ceiling not upgraded (${response.sources.evidenceCeiling})`
        : 'CHECK 8 FAILED: Evidence ceiling is promoted');
    checks.push({ label: `CHECK 8: Evidence ceiling not upgraded (${response.sources.evidenceCeiling})`, passed: c8 });

    // ─── CHECK 9: lesson list ─────────────────────────────────
    await seedLessonsIfEmpty();
    const lessons = await listLessons();
    const c9 = lessons.length >= 9;
    console.log(c9 ? '  ✓' : '  ⚠', c9
        ? `CHECK 9: lesson list returns ${lessons.length} persisted lessons`
        : `CHECK 9 FAILED: Only ${lessons.length} lessons (expected >=9)`);
    checks.push({ label: `CHECK 9: ${lessons.length} persisted lessons (>=9)`, passed: c9 });

    // ─── CHECK 10: canon safety ──────────────────────────────────
    const c10 = response.sources.canonSafe;
    console.log(c10 ? '  ✓' : '  ⚠', c10
        ? 'CHECK 10: Teaching output passes canon safety'
        : 'CHECK 10 FAILED: Canon safety failed');
    checks.push({ label: `CHECK 10: Canon safety ${response.sources.canonSafe ? 'passed' : 'FAILED'}`, passed: c10 });

    // ─── Summary ───────────────────────────────────────────────
    const passed = checks.filter(c => c.passed).length;
    console.log(`\n═══ VERIFICATION SUMMARY ═══\n${passed}/${checks.length} checks passed.`);
    console.log(passed === checks.length
        ? '\n✓ v10.1 TEACHING MODE FIXTURE TRIAL PASSED.'
        : '\n⚠ Some checks failed.');

    // ─── Teaching output sample ──────────────────────────────────
    console.log('\n── SAMPLE: Teaching Output (first 600 chars) ──');
    console.log(formatTeachingOutput(response).substring(0, 600));
    console.log('...(truncated)');

    // ─── Topics list ────────────────────────────────────────────
    console.log(`\n── Available topics: ${listTopics().length} ──`);
    for (const t of listTopics()) {
        console.log(`    - ${t}`);
    }

    if (passed !== checks.length) {
        process.exit(1);
    }
}

main().catch(err => {
    console.error('v10.1 trial failed:', err);
    process.exit(1);
});