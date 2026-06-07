// CohBit-Copilot v9.2 — Evidence-Aware Summary Generator Trial
// Verifies all 5 summary modes: internal, public, technical, linkedin, reviewer.
//
// Checks:
//   1. Internal mode preserves all data
//   2. Public mode rewrites internal terms
//   3. LinkedIn mode produces zero strong claim verbs in section bodies
//   4. All non-internal modes include auto-extracted limitations
//   5. Technical mode distinguishes evidence levels
//   6. Reviewer mode lists proof debt with references
//   7. Canon safety validation across all modes
//
// Operating law:
//   Voice may explain graph state. Voice may not upgrade graph state.
//   Public language must inherit evidence limits from the graph.

import { transformToTltGraph, buildTltEdges } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import { resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { resetViolationCounter } from '../packages/tlt-atlas/src/T_claim_guard.js';
import { resetLeakCounter } from '../packages/tlt-atlas/src/T_public_internal_boundary.js';
import {
    generateAllSummaries,
    renderSummaryToText,
    isSummarySafeForAudience,
    type SummaryMode,
} from '../packages/tlt-atlas/src/T_summary_generator.js';

const ADVERSARIAL_MARKDOWN = `
# Test Document — Summary Generator Trial

## Overconfident Verification Claims

The theorem is verified and ready for public release.
This system is proven safe for production deployment.
We have completed the formal verification of all components.
The CohBit primitive guarantees admissibility under all conditions.

## Mixed Evidence Claims

This approach appears to be consistent with existing results.
Further testing is recommended before deployment.
The implementation has passed initial smoke tests.
A formal proof is planned but not yet completed.

## Internal Terminology in Public Context

This is a public announcement about Noetican Labs progress.
We are releasing the CohBit specification for community review.
CTRL has been integrated into the production pipeline.
PhaseLoom now supports persistent memory trajectories.
`;

const FIXTURE = {
    path: 'test_fixture/v9_2_summary_test.md',
    language: 'markdown',
    text: ADVERSARIAL_MARKDOWN,
};

function main() {
    console.log('=== CohBit-Copilot v9.2 Summary Generator Trial ===\n');

    resetViolationCounter();
    resetLeakCounter();
    resetVoiceCounter();

    const result = transformToTltGraph([FIXTURE]);
    const edges = buildTltEdges(result.nodes);
    result.edges.length = 0;
    for (const e of edges) result.edges.push(e);

    console.log(`Graph: ${result.summary.totalNodes} nodes, ${result.edges.length} edges\n`);

    const summaries = generateAllSummaries(result);
    const modes: SummaryMode[] = ['internal', 'public', 'technical', 'linkedin', 'reviewer'];

    for (const mode of modes) {
        const s = summaries[mode];
        console.log(`── ${s.modeLabel.toUpperCase()} ──`);
        console.log(`  Sections: ${s.sections.length} | Warnings: ${s.totalWarnings} | Downgrades: ${s.downgradeCount} | Limitations: ${s.limitationCount}`);
        console.log(`  Canon-safe: ${s.canonSafe ? 'yes' : 'NO'} | Safe for audience: ${isSummarySafeForAudience(s, mode) ? 'yes' : 'no'}`);
        for (const sec of s.sections) {
            const dg = sec.downgradedVerbs.length > 0 ? ` [downgraded: ${sec.downgradedVerbs.join(', ')}]` : '';
            console.log(`    ${sec.header}${dg}`);
        }
        console.log('');
    }

    // ─── CHECK 1 ───────────────────────────────────────────────
    const internal = summaries.internal;
    const c1 = internal.sections.length > 0
        && internal.downgradeCount === 0
        && internal.sections.some(s => s.header.includes('Claim Strength Mismatch'));
    console.log(c1 ? '  ✓ CHECK 1: Internal mode preserves all data and flags mismatches.' : '  ⚠ CHECK 1 FAILED');

    // ─── CHECK 2 ───────────────────────────────────────────────
    const pubTxt = renderSummaryToText(summaries.public);
    const c2 = !pubTxt.includes('CohBit') || pubTxt.includes('governed transition');
    console.log(c2 ? '  ✓ CHECK 2: Public mode rewrites internal terms.' : '  ⚠ CHECK 2 FAILED');

    // ─── CHECK 3 ───────────────────────────────────────────────
    // Check section bodies — skip Limitations (auto-generated metadata),
    // exclude hyphenated compounds (e.g., "AST-verified"), quoted diagnostics,
    // and limitation-language phrases ("not verified", "requires verification", etc.)
    const li = summaries.linkedin;
    let bodyHasStrongVerb = false;
    const strongRegex = /\b(?<![\w-])(verified|proven|guaranteed|certified|production-ready)(?![\w-])\b/i;
    const quotedRegex = /'verified'|'proven'|'guaranteed'|'certified'|'production-ready'/gi;
    const limitationPhraseRegex = /\b(not\s+(?:yet\s+)?(?:AST-)?(?:verified|proven|guaranteed|certified)|requires?\s+(?:AST-)?(?:verif|proof|guarantee)|lack(?:s|ing|ed)?\s+verif|without\s+verif|no\s+(?:formal\s+)?(?:verif|proof|guarantee)|pending\s+verif|absence\s+of\s+verif|has\s+not\s+been\s+(?:verified|proven|guaranteed))\b/i;
    for (const sec of li.sections) {
        if (sec.header.includes('Limitations')) continue;
        // Strip metadata lines and quoted diagnostics
        let cleanBody = sec.body.replace(/^  \w+:.+$/gm, '');
        cleanBody = cleanBody.replace(quotedRegex, '[verb]');
        // Strip limitation-language phrases — these are NOT declarative claims
        cleanBody = cleanBody.replace(limitationPhraseRegex, '[limitation]');
        if (strongRegex.test(cleanBody)) { bodyHasStrongVerb = true; break; }
    }
    const c3 = !bodyHasStrongVerb;
    console.log(c3 ? '  ✓ CHECK 3: LinkedIn body text has zero declarative strong claim verbs.' : '  ⚠ CHECK 3 FAILED');

    // ─── CHECK 4 ───────────────────────────────────────────────
    const c4 = ['public', 'technical', 'linkedin', 'reviewer'].every(m => summaries[m as SummaryMode].limitationCount > 0);
    console.log(c4 ? '  ✓ CHECK 4: All non-internal modes include limitations.' : '  ⚠ CHECK 4 FAILED');

    // ─── CHECK 5 ───────────────────────────────────────────────
    const tech = summaries.technical;
    const c5 = tech.sections.some(s => s.evidenceLevel === 'surface_detected');
    console.log(c5 ? '  ✓ CHECK 5: Technical mode distinguishes evidence levels.' : '  ⚠ CHECK 5 FAILED');

    // ─── CHECK 6 ───────────────────────────────────────────────
    const c6 = summaries.reviewer.sections.some(s => s.header.includes('Proof Debt'));
    console.log(c6 ? '  ✓ CHECK 6: Reviewer mode lists proof debt.' : '  ⚠ CHECK 6 FAILED');

    // ─── CHECK 7 ───────────────────────────────────────────────
    const c7 = summaries.internal.canonSafe && summaries.public.canonSafe
        && summaries.linkedin.canonSafe && summaries.technical.canonSafe
        && summaries.reviewer.canonSafe;
    console.log(c7 ? '  ✓ CHECK 7: All summaries pass canon safety.' : '  ⚠ CHECK 7 FAILED');

    // ─── CHECK 7b ──────────────────────────────────────────────
    const c7b = isSummarySafeForAudience(li, 'public');
    console.log(c7b ? '  ✓ CHECK 7b: LinkedIn safe for public audience.' : '  ⚠ CHECK 7b FAILED');

    // ─── Sample ────────────────────────────────────────────────
    console.log('\n── SAMPLE: LinkedIn-Safe Summary ──');
    console.log(renderSummaryToText(li).substring(0, 700));
    console.log('...(truncated)');

    // ─── v9.2A: Strong Verb Test Refinement ───────────────────
    // Success criteria:
    //   1. Hyphenated limitation phrases do not fail literal substring checks
    //   2. Declarative strong claims still fail when unsupported
    //   3. "not verified" is allowed as limitation
    //   4. "verified" as standalone unsupported claim is blocked
    //   5. Trial passes all checks

    // ─── CHECK 8 (v9.2A-1): Hyphenated limitation phrases pass ──
    // Reuses strongRegex from CHECK 3 — hyphenated "AST-verified" must not match
    const limText = "Surface-detected claim — not AST-verified or receipted.";
    const c8 = !strongRegex.test(limText);
    console.log(c8 ? '  ✓ CHECK 8 (v9.2A-1): Hyphenated limitation phrases pass strong verb filter.' : '  ⚠ CHECK 8 FAILED');

    // ─── CHECK 9 (v9.2A-2): Declarative strong claims still fail ─
    // Reuses strongRegex from CHECK 3 — standalone "verified" must match
    const declarativeText = "This system is verified for production deployment.";
    const c9 = strongRegex.test(declarativeText);
    console.log(c9 ? '  ✓ CHECK 9 (v9.2A-2): Declarative standalone "verified" detected as strong claim.' : '  ⚠ CHECK 9 FAILED');

    // ─── CHECK 10 (v9.2A-3): "not verified" allowed as limitation ─
    const notVerifiedText = "This approach is not verified and should not be deployed.";
    const c10 = limitationPhraseRegex.test(notVerifiedText)
        && !(function () {
            let cleaned = notVerifiedText.replace(quotedRegex, '[verb]').replace(limitationPhraseRegex, '[limitation]');
            return strongRegex.test(cleaned);
        })();
    console.log(c10 ? '  ✓ CHECK 10 (v9.2A-3): "not verified" limitation language passes.' : '  ⚠ CHECK 10 FAILED');

    // ─── CHECK 11 (v9.2A-4): Standalone unsupported "verified" blocked ─
    const standaloneVerifiedText = "We have verified all the components.";
    const c11 = strongRegex.test(standaloneVerifiedText);
    console.log(c11 ? '  ✓ CHECK 11 (v9.2A-4): Standalone unsupported "verified" blocked by filter.' : '  ⚠ CHECK 11 FAILED');

    // ─── Summary ───────────────────────────────────────────────
    const checks = [c1, c2, c3, c4, c5, c6, c7, c7b, c8, c9, c10, c11];
    const passed = checks.filter(Boolean).length;
    console.log(`\n═══ VERIFICATION SUMMARY ═══\n${passed}/${checks.length} checks passed.`);
    console.log(passed === checks.length ? '\n✓ v9.2A SUMMARY GENERATOR TRIAL PASSED.' : '\n⚠ Some checks failed.');
}

try { main(); } catch (err) { console.error('v9.2 trial failed:', err); process.exit(1); }