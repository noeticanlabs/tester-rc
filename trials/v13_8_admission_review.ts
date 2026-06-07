// CohBit-Copilot v13.8 — Learning Admission Review
// Pipeline: Load stable candidates → Score → Recommend → Human review pending
//
// Operating law:
//   v13.8 may generate structured review cards with automated admission
//   recommendations. It may emit a learning admission receipt. It may NOT
//   auto-admit records, promote canon, upgrade evidence beyond corpus_extracted,
//   modify source code, or claim verification. All admission decisions require
//   explicit human review and sign-off. A machine recommendation is not a
//   machine decision.
//
// Safe claim:
//   CohBit-Copilot v13.8 reviews the 42 stable candidate curriculum findings,
//   scoring each by evidence strength and generating per-candidate admission
//   recommendations. Automated recommendations are advisory only — all admission
//   decisions remain pending_human_review. No findings are admitted as learned
//   without explicit human sign-off. Evidence remains capped at corpus_extracted.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const V13_7_PATH = path.join(OUTPUT_DIR, 'v13_7_stable_candidate_review.json');
const V13_4_PATH = path.join(OUTPUT_DIR, 'v13_4_curriculum_review.json');
const VERSION = '13.8.0';

type AdmissionDecision =
    | 'admit_as_learning_record'
    | 'defer_needs_content_review';

interface AdmissionReviewCard {
    findingId: string;
    sourceFile: string;
    originalType: string;
    v13_6B_upgradeStatus: string;
    evidenceScore: number;
    evidenceTrail: {
        v13_4_present: boolean;
        v13_5_reobserved_stable: boolean;
        v13_6A_structural: string;
        v13_6B_content: string;
    };
    knownLimitations: string[];
    automatedRecommendation: AdmissionDecision;
    humanReviewStatus: 'pending_human_review';
}

interface AdmissionReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    priorV13_7Id: string;
    priorV13_4Id: string;
    summary: {
        totalCandidates: number;
        recommendAdmit: number;
        recommendDeferContentReview: number;
    };
    reviewCards: AdmissionReviewCard[];
    humanReviewInstructions: string;
    attestation: string;
}

function loadJSON(p: string): any {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function scoreFinding(v13_6BStatus: string): number {
    if (v13_6BStatus === 'strongly_structurally_confirmed') return 3;
    if (v13_6BStatus === 'cross_observed') return 2;
    return 1; // structurally_supported_stale_mapping
}

function recommend(score: number): AdmissionDecision {
    return score >= 2 ? 'admit_as_learning_record' : 'defer_needs_content_review';
}

function buildLimitations(status: string): string[] {
    const base = [
        'Evidence ceiling: corpus_extracted',
        'Admitted does NOT mean verified, canon, or proven',
        'Admission may be withdrawn if reobservation diverges',
    ];
    if (status === 'structurally_supported_stale_mapping') {
        base.push('Stale mapping — content equivalence not yet confirmed');
    }
    return base;
}

function renderMarkdown(r: AdmissionReceipt): string {
    const lines: string[] = [];
    lines.push('# CohBit-Copilot v13.8 — Learning Admission Review');
    lines.push('');
    lines.push(`**Receipt ID:** \`${r.receiptId}\``);
    lines.push(`**Generated:** ${r.generatedAt}`);
    lines.push(`**Version:** ${r.version}`);
    lines.push(`**Prior v13.7:** \`${r.priorV13_7Id}\``);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Safe Claim');
    lines.push('');
    lines.push('> CohBit-Copilot v13.8 reviews the 42 stable candidate curriculum findings,');
    lines.push('> scoring each by evidence strength and generating per-candidate admission');
    lines.push('> recommendations. Automated recommendations are advisory only — all admission');
    lines.push('> decisions remain `pending_human_review`. No findings are admitted as learned');
    lines.push('> without explicit human sign-off. Evidence remains capped at `corpus_extracted`.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total candidates | ${r.summary.totalCandidates} |`);
    lines.push(`| Recommend: admit_as_learning_record | ${r.summary.recommendAdmit} |`);
    lines.push(`| Recommend: defer_needs_content_review | ${r.summary.recommendDeferContentReview} |`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Scoring Rules');
    lines.push('');
    lines.push('| v13.6B Status | Score | Recommendation |');
    lines.push('|---------------|-------|----------------|');
    lines.push('| `strongly_structurally_confirmed` | 3 | `admit_as_learning_record` |');
    lines.push('| `cross_observed` | 2 | `admit_as_learning_record` |');
    lines.push('| `structurally_supported_stale_mapping` | 1 | `defer_needs_content_review` |');
    lines.push('');

    const admit = r.reviewCards.filter(c => c.automatedRecommendation === 'admit_as_learning_record');
    const defer = r.reviewCards.filter(c => c.automatedRecommendation === 'defer_needs_content_review');

    if (admit.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push(`## Recommended: Admit as Learning Record (${admit.length})`);
        lines.push('');
        for (const c of admit) {
            lines.push(`### ${c.findingId}`);
            lines.push('');
            lines.push(`| Field | Value |`);
            lines.push(`|-------|-------|`);
            lines.push(`| Source | ${c.sourceFile} |`);
            lines.push(`| Original type | ${c.originalType} |`);
            lines.push(`| v13.6B status | \`${c.v13_6B_upgradeStatus}\` |`);
            lines.push(`| Score | ${c.evidenceScore}/3 |`);
            lines.push(`| Recommendation | **\`${c.automatedRecommendation}\`** |`);
            lines.push(`| Human review | **pending_human_review** |`);
            lines.push('');
            lines.push('**Evidence trail:**');
            lines.push(`- v13.4 curriculum: ✅`);
            lines.push(`- v13.5 reobservation: ✅`);
            lines.push(`- v13.6A structural: ${c.evidenceTrail.v13_6A_structural}`);
            lines.push(`- v13.6B content: ${c.evidenceTrail.v13_6B_content}`);
            lines.push('');
            lines.push('**Limitations:**');
            for (const l of c.knownLimitations) lines.push(`- ${l}`);
            lines.push('');
        }
    }

    if (defer.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push(`## Recommended: Defer — Needs Content Review (${defer.length})`);
        lines.push('');
        lines.push('| Finding ID | Source | Score | Status |');
        lines.push('|------------|--------|-------|--------|');
        for (const c of defer) {
            lines.push(`| ${c.findingId} | ${c.sourceFile.slice(0, 40)} | ${c.evidenceScore} | \`${c.v13_6B_upgradeStatus}\` |`);
        }
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Human Review Instructions');
    lines.push('');
    lines.push(r.humanReviewInstructions);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Attestation');
    lines.push('');
    lines.push(r.attestation);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`*Generated by CohBit-Copilot v13.8 Learning Admission Review Pipeline*`);
    lines.push(`*Receipt ID: ${r.receiptId}*`);

    return lines.join('\n');
}

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v13.8 — Learning Admission Review');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    const v13_7 = loadJSON(V13_7_PATH);
    const v13_4 = loadJSON(V13_4_PATH);

    const stableFindings = v13_7.findings.filter((f: any) => f.classification === 'stable_candidate');
    console.log(`  Loaded ${stableFindings.length} stable candidates from v13.7`);
    console.log('');

    const reviewCards: AdmissionReviewCard[] = [];

    for (const f of stableFindings) {
        const status = f.v13_6B_newStatus || 'not_upgraded';
        const score = scoreFinding(status);
        const rec = recommend(score);

        reviewCards.push({
            findingId: f.id,
            sourceFile: f.sourceFile,
            originalType: f.originalType,
            v13_6B_upgradeStatus: status,
            evidenceScore: score,
            evidenceTrail: {
                v13_4_present: true,
                v13_5_reobserved_stable: true,
                v13_6A_structural: status,
                v13_6B_content: status === 'structurally_supported_stale_mapping'
                    ? 'same_role_different_form (stale mapping)'
                    : 'structurally confirmed',
            },
            knownLimitations: buildLimitations(status),
            automatedRecommendation: rec,
            humanReviewStatus: 'pending_human_review',
        });
    }

    const tally = {
        admit: reviewCards.filter(c => c.automatedRecommendation === 'admit_as_learning_record').length,
        deferContent: reviewCards.filter(c => c.automatedRecommendation === 'defer_needs_content_review').length,
    };

    console.log(`  Recommendations:`);
    console.log(`    admit_as_learning_record:     ${tally.admit}`);
    console.log(`    defer_needs_content_review:   ${tally.deferContent}`);
    console.log('');

    const receiptId = `AR_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const receipt: AdmissionReceipt = {
        receiptId, version: VERSION,
        pipeline: 'v13.8 — Learning Admission Review',
        generatedAt: new Date().toISOString(),
        priorV13_7Id: v13_7.receiptId,
        priorV13_4Id: v13_4.receiptId,
        summary: {
            totalCandidates: reviewCards.length,
            recommendAdmit: tally.admit,
            recommendDeferContentReview: tally.deferContent,
        },
        reviewCards,
        humanReviewInstructions:
            'This report contains automated advisory recommendations. No findings have been admitted as learned. ' +
            'For each candidate marked admit_as_learning_record, a human reviewer must explicitly confirm admission. ' +
            'For each candidate marked defer_needs_content_review, deeper content hash comparison is recommended before re-review. ' +
            'Evidence ceiling remains corpus_extracted for all candidates. Admitted learning records may be promoted to canon_candidate only after independent verification and additional stability runs.',
        attestation:
            'CohBit-Copilot v13.8 reviews 42 stable candidate curriculum findings with automated advisory recommendations. ' +
            'All admission decisions remain pending_human_review. No findings are admitted as learned without explicit human sign-off. ' +
            'Evidence remains capped at corpus_extracted. No canon is promoted. No source is modified.',
    };

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonPath = path.join(OUTPUT_DIR, 'v13_8_admission_review.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  JSON report:  ${jsonPath}`);

    const mdPath = path.join(OUTPUT_DIR, 'v13_8_admission_review.md');
    const md = renderMarkdown(receipt);
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  MD report:    ${mdPath}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('  Pipeline Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log(`  Recommend admit:     ${tally.admit}`);
    console.log(`  Recommend defer:     ${tally.deferContent}`);
    console.log('');
    console.log('  ⚠ All admission decisions: pending_human_review');
    console.log('  ⚠ Machine recommends — human decides.');
    console.log('  ⚠ Evidence ceiling: corpus_extracted (unchanged)');
    console.log('');
    console.log(`  Reports: ${mdPath}`);
    console.log(`           ${jsonPath}`);
}

main();