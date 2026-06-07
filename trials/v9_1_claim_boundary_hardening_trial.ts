// CohBit-Copilot v9.1 — TLT Claim Boundary Hardening Trial
// Verifies that TLT voice never upgrades graph status and that
// strong claim language ("verified", "proven", "production-ready")
// is checked against actual graph evidence.
//
// Input: crafted markdown with overconfident language
// Expected: claim_strength_mismatch + proof_debt + public_term_leak
// Voice must NEVER output "verified" without receipt evidence.
//
// Operating law:
//   TLT voice advises. It never certifies claims. If source says
//   "verified" but graph has only surface_detected evidence, voice
//   must flag the mismatch and suggest downgrade.

import { transformToTltGraph, buildTltEdges, type TltGraphNode } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import { renderGraphToVoice, renderExecutiveSummary, resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { checkClaimStrength, assessNodeStrength, assessAllClaims, resetViolationCounter } from '../packages/tlt-atlas/src/T_claim_guard.js';
import { checkPublicBoundary, isPublicFacing, detectInternalTermLeaks, resetLeakCounter } from '../packages/tlt-atlas/src/T_public_internal_boundary.js';
import { submitCandidatesFromScan, getCandidateReport, clearCandidateStore, promoteToCanon } from '../packages/tlt-atlas/src/T_tlt_atlas_feed.js';

// ─── Adversarial Fixture ────────────────────────────────────────

const ADVERSARIAL_MARKDOWN = `
# Test Document — Claim Boundary Hardening Trial

## Section 1: Overconfident Verification Claims

The theorem is verified and ready for public release.
This system is proven safe for production deployment.
We have completed the formal verification of all components.
The CohBit primitive guarantees admissibility under all conditions.

## Section 2: Mixed Evidence Claims

This approach appears to be consistent with existing results.
Further testing is recommended before deployment.
The implementation has passed initial smoke tests.
A formal proof is planned but not yet completed.

## Section 3: Internal Terminology in Public Context

This is a public announcement about Noetican Labs progress.
We are releasing the CohBit specification for community review.
CTRL has been integrated into the production pipeline.
PhaseLoom now supports persistent memory trajectories.
`;

// TLT input artifact
const FIXTURE = {
    path: 'test_fixture/v9_1_claim_test.md',
    language: 'markdown',
    text: ADVERSARIAL_MARKDOWN,
};

function main() {
    console.log('=== CohBit-Copilot v9.1 Claim Boundary Hardening Trial ===\n');

    // Reset counters
    resetViolationCounter();
    resetLeakCounter();
    clearCandidateStore();

    // ─── 1. Transform language → graph ─────────────────────────
    console.log('── 1. EARS: Language → Graph ──');
    const result = transformToTltGraph([FIXTURE]);
    const edges = buildTltEdges(result.nodes);
    result.edges.length = 0;
    for (const e of edges) result.edges.push(e);

    console.log(`Nodes: ${result.summary.totalNodes}`);
    console.log(`  Claims:      ${result.summary.claims}`);
    console.log(`  Risks:       ${result.summary.risks}`);
    console.log(`  Definitions: ${result.summary.definitions}`);
    console.log(`  Domain contexts: ${result.summary.domainContexts}`);

    const earsOk = result.summary.claims > 0;
    console.log(earsOk ? '  ✓ Graph transform produced nodes.\n' : '  ⚠ No nodes.\n');

    // ─── 2. Claim Guard: Strength Assessment ───────────────────
    console.log('── 2. CLAIM GUARD: Strength vs. Language ──');
    const guardReport = assessAllClaims(result.nodes);
    console.log(`Nodes assessed: ${guardReport.summary.totalNodes}`);
    console.log(`  Honest:  ${guardReport.summary.honestNodes}`);
    console.log(`  Violations: ${guardReport.summary.violations} total`);
    console.log(`    High:   ${guardReport.summary.highSeverity}`);
    console.log(`    Medium: ${guardReport.summary.mediumSeverity}`);
    console.log(`    Low:    ${guardReport.summary.lowSeverity}`);
    console.log(`  Requires human review: ${guardReport.summary.requiresHumanReview}`);

    // Print individual violations
    for (const assessment of guardReport.assessments) {
        if (!assessment.isHonest) {
            console.log(`\n  Node ${assessment.nodeId}: "${assessment.sourceText.substring(0, 80)}"`);
            console.log(`    Strength: ${assessment.actualStrength} | Verbs: ${assessment.sourceVerbs.join(', ')}`);
            for (const v of assessment.violations) {
                console.log(`    ⚠ [${v.severity}] ${v.message}`);
                console.log(`       Downgrade: "${v.suggestedDowngrade}"`);
            }
        }
    }

    // ─── VERIFICATION CHECK 1 ──────────────────────────────────
    // Voice must NEVER output "This claim is verified" without receipt
    const hasReceiptVerbs = guardReport.assessments.some(a => a.sourceVerbs.includes('verified'));
    const hasStrenghtViolations = guardReport.summary.violations > 0;

    const check1Pass = hasReceiptVerbs && hasStrenghtViolations;
    console.log(check1Pass
        ? '\n  ✓ CHECK 1: Strong claim verbs detected AND strength violations flagged.'
        : '\n  ⚠ CHECK 1 FAILED: Expected verifed/proven language to trigger violations.');

    // ─── VERIFICATION CHECK 2 ──────────────────────────────────
    // Specific nodes should have mismatches
    const verifiedNode = result.nodes.find(n => n.matchedText.toLowerCase().includes('verified'));
    const check2Pass = verifiedNode ? (() => {
        const assessment = checkClaimStrength(verifiedNode);
        return !assessment.isHonest && assessment.violations.some(v => v.sourceVerb === 'verified');
    })() : false;
    console.log(check2Pass
        ? '  ✓ CHECK 2: "verified" node flagged as claim strength mismatch.'
        : '  ⚠ CHECK 2 FAILED: "verified" language not flagged.');

    // ─── 3. Public/Internal Boundary ───────────────────────────
    console.log('\n── 3. PUBLIC/INTERNAL BOUNDARY ──');
    const publicNodes = result.nodes.filter(n => isPublicFacing(n));
    console.log(`Public-facing nodes: ${publicNodes.length}`);

    let leakCount = 0;
    for (const node of publicNodes) {
        const boundary = checkPublicBoundary(node);
        if (!boundary.passes) {
            for (const leak of boundary.termLeaks) {
                console.log(`  ⚠ ${leak.nodeId}: "${leak.term}" in public context (${leak.severity})`);
                console.log(`    Suggested: "${leak.suggestedRewrite.substring(0, 100)}"`);
                leakCount++;
            }
        }
    }

    // ─── VERIFICATION CHECK 3 ──────────────────────────────────
    const check3Pass = leakCount > 0;
    console.log(check3Pass
        ? '\n  ✓ CHECK 3: Internal terms in public context detected and flagged.'
        : '\n  ⚠ CHECK 3 FAILED: Expected internal term leaks (e.g., CohBit, CTRL) in public text.');

    // ─── 4. Voice: Graph → Advisory Language ───────────────────
    console.log('\n── 4. VOICE: Graph → Advisory Language ──');
    resetVoiceCounter();
    const voiceResult = renderGraphToVoice(result);

    const mismatches = voiceResult.statements.filter(s => s.category === 'claim_strength_mismatch');
    const leaks = voiceResult.statements.filter(s => s.category === 'public_term_leak');
    const proofDebt = voiceResult.statements.filter(s => s.category === 'proof_debt');

    console.log(`Voice statements: ${voiceResult.summary.totalStatements}`);
    console.log(`  Claim strength mismatches: ${mismatches.length}`);
    console.log(`  Public term leaks:      ${leaks.length}`);
    console.log(`  Proof debt flags:        ${proofDebt.length}`);

    // Print sample voice statements
    console.log('\n  Sample adversarial voice output:');
    for (const s of voiceResult.statements) {
        if (s.category === 'claim_strength_mismatch' || s.category === 'public_term_leak' || s.category === 'proof_debt') {
            console.log(`  ⚠ [${s.category}] ${s.text.substring(0, 130)}`);
        }
    }

    // ─── VERIFICATION CHECK 4 ──────────────────────────────────
    // Voice must include claim_strength_mismatch statements
    const check4Pass = mismatches.length > 0;
    console.log(check4Pass
        ? '\n  ✓ CHECK 4: Voice produces claim_strength_mismatch statements for overconfident language.'
        : '\n  ⚠ CHECK 4 FAILED: No claim_strength_mismatch voice statements.');

    // ─── VERIFICATION CHECK 5 ──────────────────────────────────
    // Voice must NEVER output "This is verified" without evidence
    const verifiedStatements = voiceResult.statements.filter(s => s.text.toLowerCase().includes('is verified'));
    const check5Pass = verifiedStatements.every(s =>
        s.category === 'claim_strength_mismatch' || s.category === 'proof_debt'
    );
    console.log(check5Pass
        ? '  ✓ CHECK 5: Voice never outputs "is verified" as a declarative claim — only as a flagged mismatch.'
        : '  ⚠ CHECK 5 FAILED: Voice produced "verified" language without flagging it as a mismatch.');

    // ─── VERIFICATION CHECK 6 ──────────────────────────────────
    // Feed: candidates must not be auto-promoted to canon
    const feedResult = submitCandidatesFromScan(result.nodes);
    const autoPromoted = feedResult.candidates.filter(c => c.status === 'canon_approved');
    const check6Pass = autoPromoted.length === 0;
    console.log(check6Pass
        ? '  ✓ CHECK 6: Feed candidates not auto-promoted to canon. All require explicit approval.'
        : `  ⚠ CHECK 6 FAILED: ${autoPromoted.length} candidates were auto-promoted.`);

    // ─── Nonexistent candidate ID should fail promoteToCanon ────
    const fakePromotion = promoteToCanon('ATC_NONEXISTENT', 'test', 'should fail');
    const check6bPass = !fakePromotion;
    console.log(check6bPass
        ? '  ✓ CHECK 6b: promoteToCanon correctly rejects nonexistent candidates.'
        : '  ⚠ CHECK 6b FAILED: promoteToCanon accepted a nonexistent candidate.');

    // ─── Summary ───────────────────────────────────────────────
    const checks = [
        { name: 'Strong claim verbs detected + violations flagged', passed: check1Pass },
        { name: '"verified" node flagged as mismatch', passed: check2Pass },
        { name: 'Internal terms in public context detected', passed: check3Pass },
        { name: 'Voice produces claim_strength_mismatch statements', passed: check4Pass },
        { name: 'Voice never outputs "verified" declaratively', passed: check5Pass },
        { name: 'Feed candidates not auto-promoted to canon', passed: check6Pass && check6bPass },
    ];

    console.log('\n═══ VERIFICATION SUMMARY ═══');
    let passed = 0;
    for (const check of checks) {
        console.log(`  ${check.passed ? '✓' : '⚠'} ${check.name}`);
        if (check.passed) passed++;
    }
    console.log(`\n${passed}/${checks.length} checks passed.`);
    console.log(passed >= 5
        ? '\n✓ v9.1 CLAIM BOUNDARY HARDENING TRIAL PASSED. Voice cannot upgrade graph status.'
        : '\n⚠ Some hardening checks failed — review above.');
}

try {
    main();
} catch (err) {
    console.error('v9.1 trial failed:', err);
    process.exit(1);
}
