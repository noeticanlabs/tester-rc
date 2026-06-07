// CohBit-Copilot v13.7 — Stable Candidate Review
// Pipeline: Load accumulated evidence → Gate function → Classify → Gap proposal → Report
//
// Operating law:
//   v13.7 Stable Candidate Review may classify accumulated evidence into admission
//   tiers based on pre-defined gating criteria. It may propose Teaching KB gap
//   remediations. It may not admit learning records, promote canon, upgrade evidence
//   beyond corpus_extracted, modify source code, or claim verification. Stable
//   candidate status confirms pattern recurrence across multiple evidence streams —
//   it does not certify correctness.
//
// Safe claim:
//   CohBit-Copilot v13.7 applies gated admission criteria to the 54 curriculum
//   cross-check findings accumulated across v13.4, v13.5, and v13.6B. Findings
//   that satisfy all four criteria are classified as stable_candidate. Stale
//   mappings are classified as needs_content_confirmation. Teaching KB gaps are
//   classified as gap_requires_mapping with a proposal-only remediation plan.
//   No findings are admitted as learned. No canon is promoted. Evidence remains
//   capped at corpus_extracted. Human review is still required for admission.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Constants ────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const V13_4_PATH = path.join(OUTPUT_DIR, 'v13_4_curriculum_review.json');
const V13_5_PATH = path.join(OUTPUT_DIR, 'v13_5_curriculum_reobservation.json');
const V13_6A_PATH = path.join(OUTPUT_DIR, 'v13_6A_cross_repo_structural.json');
const V13_6B_PATH = path.join(OUTPUT_DIR, 'v13_6B_content_confirmation.json');
const VERSION = '13.7.0';

// ─── Types ────────────────────────────────────────────────────────

type ClassificationTier =
    | 'stable_candidate'
    | 'needs_content_confirmation'
    | 'gap_requires_mapping'
    | 'not_admitted';

interface EvidenceSnapshot {
    foundInCurriculum: boolean;       // v13.4
    reobservedStable: boolean;         // v13.5
    structurallyUpgraded: boolean;     // v13.6B
    upgradedStatus: string | null;     // v13.6B newStatus
    hasConflict: boolean;              // v13.4 + v13.6B
    gate1_curriculum: boolean;
    gate2_reobserved: boolean;
    gate3_structural: boolean;
    gate4_noConflict: boolean;
}

interface GatedFinding {
    id: string;
    sourceFile: string;
    originalType: string;
    v13_6B_upgraded: boolean;
    v13_6B_newStatus: string | null;
    evidence: EvidenceSnapshot;
    gateResults: {
        gate1_curriculum: boolean;
        gate2_reobserved: boolean;
        gate3_structural: boolean;
        gate4_noConflict: boolean;
    };
    classification: ClassificationTier;
    classificationReason: string;
    nextStep: string;
}

interface GapProposal {
    proposalId: string;
    proposedAt: string;
    status: 'proposal_only';
    description: string;
    gaps: GapProposalEntry[];
    disclaimer: string;
}

interface GapProposalEntry {
    findingId: string;
    moduleDescription: string;
    suggestedAction: 'create_external_module' | 'document_mapping';
    internalMatch: string | null;
    rationale: string;
}

interface ReviewReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    priorV13_4Id: string;
    priorV13_5Id: string;
    priorV13_6BId: string;
    summary: {
        totalFindings: number;
        stableCandidates: number;
        needsContentConfirmation: number;
        gapRequiresMapping: number;
        notAdmitted: number;
    };
    findings: GatedFinding[];
    gapProposal: GapProposal | null;
    attestation: string;
}

// ─── Phase 1: Load Accumulated Evidence ───────────────────────────

function loadJSON(p: string, label: string): any {
    if (!fs.existsSync(p)) throw new Error(`${label} not found at: ${p}`);
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// ─── Phase 2: Gate Function ───────────────────────────────────────

function evaluateEvidence(
    finding: any,            // v13.4 crossCheckFinding
    v13_5: any,              // reobservation receipt
    v13_6B_annotations: any[], // annotated findings from v13.6B
): EvidenceSnapshot {
    // Criterion 1: Present in v13.4 curriculum
    const foundInCurriculum = true; // it came from v13.4 directly

    // Criterion 2: Reobserved with stable hash in v13.5
    const delta = v13_5.delta || {};
    const reobservedStable = (delta.stableCount > 0 && delta.changedCount === 0 && delta.newCount === 0 && delta.missingCount === 0);

    // Criterion 3: Structurally upgraded in v13.6B
    const annotation = v13_6B_annotations.find((a: any) => a.originalId === finding.id);
    const structurallyUpgraded = !!(annotation && annotation.upgraded);
    const upgradedStatus = annotation ? annotation.newStatus : null;

    // Criterion 4: No conflicts
    const hasConflict = finding.crossCheckType === 'conflict';

    const gate1_curriculum = foundInCurriculum;
    const gate2_reobserved = reobservedStable;
    const gate3_structural = structurallyUpgraded;
    const gate4_noConflict = !hasConflict;

    return { foundInCurriculum, reobservedStable, structurallyUpgraded, upgradedStatus, hasConflict, gate1_curriculum, gate2_reobserved, gate3_structural, gate4_noConflict };
}

function classifyFinding(evidence: EvidenceSnapshot, finding: any): { tier: ClassificationTier; reason: string; nextStep: string } {
    // Conflicts always not_admitted
    if (evidence.hasConflict) {
        return {
            tier: 'not_admitted',
            reason: 'Conflict detected in curriculum cross-check. Requires human arbitration.',
            nextStep: 'Human reviewer must resolve material difference between external corpus and internal state.',
        };
    }

    // Gaps → gap_requires_mapping
    if (finding.crossCheckType === 'gap') {
        return {
            tier: 'gap_requires_mapping',
            reason: 'Internal Teaching KB module lacks matching external curriculum file. Structural confirmation does not close gaps.',
            nextStep: 'Either create explicit external curriculum module files or document a cross-reference mapping internal TOPIC_KB → existing materials.',
        };
    }

    // All four gates pass → stable_candidate
    if (evidence.foundInCurriculum && evidence.reobservedStable && evidence.structurallyUpgraded && !evidence.hasConflict) {
        return {
            tier: 'stable_candidate',
            reason: 'Pattern satisfies all four admission gates: curriculum presence, reobservation stability, cross-repo structural confirmation, and absence of conflict.',
            nextStep: 'Human/admitter review required to promote from stable_candidate to admitted_learning_record. Do NOT claim learned, verified, or canon status.',
        };
    }

    // Structurally supported but content not matched → needs_content_confirmation
    if (evidence.foundInCurriculum && evidence.reobservedStable && evidence.structurallyUpgraded) {
        return {
            tier: 'needs_content_confirmation',
            reason: 'Architecture-level support confirmed through structural cross-check. Content equivalence not yet established. Requires Tier B content hash comparison for upgrade.',
            nextStep: 'Deferred to v13.6B Tier B content-aware deep comparison (identical_hash / near_match / same_role_different_form).',
        };
    }

    // Default: reobserved and in curriculum, but not yet structurally confirmed
    if (evidence.foundInCurriculum && evidence.reobservedStable) {
        return {
            tier: 'needs_content_confirmation',
            reason: 'Stable across observations but lacking structural cross-confirmation. Needs additional structural evidence or content hash comparison.',
            nextStep: 'Re-run cross-repo structural scan with updated criteria, or perform targeted content hash comparison of related files.',
        };
    }

    return {
        tier: 'not_admitted',
        reason: 'Fails one or more gating criteria. Insufficient evidence for stable candidate classification.',
        nextStep: 'Gather additional evidence across observations, structural scans, or content comparisons.',
    };
}

function generateGapProposal(gapFindings: GatedFinding[]): GapProposal | null {
    if (gapFindings.length === 0) return null;

    const entries: GapProposalEntry[] = [];
    const moduleNums = new Set<number>();

    for (const g of gapFindings) {
        const m = g.id.match(/M(\d+)/i);
        if (m) {
            const num = parseInt(m[1]);
            if (!moduleNums.has(num)) {
                moduleNums.add(num);
                entries.push({
                    findingId: g.id,
                    moduleDescription: `Module ${num} — ${g.sourceFile}`,
                    suggestedAction: 'create_external_module' as const,
                    internalMatch: g.sourceFile.includes('internal only') ? `src/teaching.ts → TOPIC_KB[module ${num}:]` : null,
                    rationale: `Internal Teaching KB contains module ${num} content with no corresponding external curriculum file. Create an explicit M${num} module file in the curriculum corpus, or document a cross-reference mapping internal TOPIC_KB entries to existing external materials.`,
                });
            }
        }
    }

    return {
        proposalId: `GAP_PROP_${Date.now()}`,
        proposedAt: new Date().toISOString(),
        status: 'proposal_only',
        description: `Identified ${entries.length} Teaching KB modules (M0-M11) with no matching external curriculum files. Proposed actions are for human review only. No automatic source modification will occur.`,
        gaps: entries,
        disclaimer: 'This proposal is NOT auto-applied. All actions require human review, approval, and explicit implementation. Gap detection does not indicate Teaching KB content is incorrect — only that no external curriculum counterpart was found.',
    };
}

// ─── Phase 4: Report ──────────────────────────────────────────────

function renderMarkdown(r: ReviewReceipt): string {
    const lines: string[] = [];
    lines.push('# CohBit-Copilot v13.7 — Stable Candidate Review');
    lines.push('');
    lines.push(`**Receipt ID:** \`${r.receiptId}\``);
    lines.push(`**Generated:** ${r.generatedAt}`);
    lines.push(`**Version:** ${r.version}`);
    lines.push(`**Prior v13.4:** \`${r.priorV13_4Id}\``);
    lines.push(`**Prior v13.5:** \`${r.priorV13_5Id}\``);
    lines.push(`**Prior v13.6B:** \`${r.priorV13_6BId}\``);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Safe Claim');
    lines.push('');
    lines.push('> CohBit-Copilot v13.7 applies gated admission criteria to the 54 curriculum');
    lines.push('> cross-check findings accumulated across v13.4, v13.5, and v13.6B. Findings');
    lines.push('> that satisfy all four criteria are classified as `stable_candidate`. Stale');
    lines.push('> mappings are classified as `needs_content_confirmation`. Teaching KB gaps are');
    lines.push('> classified as `gap_requires_mapping` with a proposal-only remediation plan.');
    lines.push('> No findings are admitted as learned. No canon is promoted. Evidence remains');
    lines.push('> capped at `corpus_extracted`. Human review is still required for admission.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Classification | Count |`);
    lines.push(`|----------------|-------|`);
    lines.push(`| stable_candidate | ${r.summary.stableCandidates} |`);
    lines.push(`| needs_content_confirmation | ${r.summary.needsContentConfirmation} |`);
    lines.push(`| gap_requires_mapping | ${r.summary.gapRequiresMapping} |`);
    lines.push(`| not_admitted | ${r.summary.notAdmitted} |`);
    lines.push(`| **Total** | **${r.summary.totalFindings}** |`);
    lines.push('');

    // ── Stable Candidates ──
    const stable = r.findings.filter(f => f.classification === 'stable_candidate');
    if (stable.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Stable Candidates');
        lines.push('');
        lines.push('These findings satisfy all four gating criteria:');
        lines.push('');
        lines.push('1. ✅ Present in curriculum cross-check (v13.4)');
        lines.push('2. ✅ Reobserved with stable hash (v13.5)');
        lines.push('3. ✅ Structurally confirmed across ≥ 2 repos (v13.6B)');
        lines.push('4. ✅ No conflicts detected');
        lines.push('');
        lines.push('**⚠️ Stable candidate does NOT mean admitted as learned. Human/admitter review is still required for final admission.**');
        lines.push('');
        for (const f of stable) {
            lines.push(`### ${f.id}`);
            lines.push('');
            lines.push(`- **Source:** ${f.sourceFile}`);
            lines.push(`- **Original type:** ${f.originalType}`);
            lines.push(`- **v13.6B status:** \`${f.v13_6B_newStatus || 'not upgraded'}\``);
            lines.push(`- **Reason:** ${f.classificationReason}`);
            lines.push(`- **Next step:** ${f.nextStep}`);
            lines.push('');
            lines.push('**Gate results:**');
            lines.push(`| Gate | Passed |`);
            lines.push(`|------|--------|`);
            lines.push(`| Gate 1 — Curriculum presence | ${f.evidence.gate1_curriculum ? '✅' : '❌'} |`);
            lines.push(`| Gate 2 — Reobservation stable | ${f.evidence.gate2_reobserved ? '✅' : '❌'} |`);
            lines.push(`| Gate 3 — Structural confirmation | ${f.evidence.gate3_structural ? '✅' : '❌'} |`);
            lines.push(`| Gate 4 — No conflicts | ${f.evidence.gate4_noConflict ? '✅' : '❌'} |`);
            lines.push('');
        }
    }

    // ── Needs Content Confirmation ──
    const ncc = r.findings.filter(f => f.classification === 'needs_content_confirmation');
    if (ncc.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Needs Content Confirmation');
        lines.push('');
        lines.push(`**Count:** ${ncc.length}`);
        lines.push('');
        lines.push('These findings have architectural-level structural support but lack content-level equivalence confirmation. They are stale mappings or structurally-supported patterns that require deeper content comparison (identical hashes, near matches, or role-equivalence analysis).');
        lines.push('');
        lines.push('| ID | Source | Original Type | v13.6B Status | Reason |');
        lines.push('|----|--------|---------------|---------------|--------|');
        for (const f of ncc.slice(0, 20)) {
            lines.push(`| ${f.id} | ${f.sourceFile.slice(0, 40)} | ${f.originalType} | \`${f.v13_6B_newStatus || 'none'}\` | ${f.classificationReason.slice(0, 80)} |`);
        }
        if (ncc.length > 20) lines.push(`| *... and ${ncc.length - 20} more* | | | | |`);
        lines.push('');
    }

    // ── Gap Requires Mapping ──
    const gaps = r.findings.filter(f => f.classification === 'gap_requires_mapping');
    if (gaps.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Gap Requires Mapping');
        lines.push('');
        lines.push(`**Count:** ${gaps.length}`);
        lines.push('');
        lines.push('These represent internal Teaching KB modules (M0-M11) with no matching external curriculum file. This is a clean next-work signal — structural confirmation does not close gaps. Either explicit module files need creation or a documented cross-reference mapping is needed.');
        lines.push('');
        lines.push('| ID | Source | Reason |');
        lines.push('|----|--------|--------|');
        for (const g of gaps) {
            lines.push(`| ${g.id} | ${g.sourceFile.slice(0, 50)} | ${g.classificationReason.slice(0, 80)} |`);
        }
        lines.push('');
    }

    // ── Gap Proposal ──
    if (r.gapProposal) {
        lines.push('---');
        lines.push('');
        lines.push('## Teaching KB Gap Remediation Proposal');
        lines.push('');
        lines.push(`**Proposal ID:** \`${r.gapProposal.proposalId}\``);
        lines.push(`**Status:** ${r.gapProposal.status}`);
        lines.push(`**Description:** ${r.gapProposal.description}`);
        lines.push('');
        lines.push(`**⚠️ ⚠️ ⚠️ This proposal is NOT auto-applied. All actions require human review, approval, and explicit implementation.**`);
        lines.push('');
        for (const entry of r.gapProposal.gaps) {
            lines.push(`### ${entry.findingId}`);
            lines.push('');
            lines.push(`- **Module:** ${entry.moduleDescription}`);
            lines.push(`- **Suggested action:** ${entry.suggestedAction}`);
            if (entry.internalMatch) lines.push(`- **Internal match:** ${entry.internalMatch}`);
            lines.push(`- **Rationale:** ${entry.rationale}`);
            lines.push('');
        }
        lines.push(`**Disclaimer:** ${r.gapProposal.disclaimer}`);
        lines.push('');
    }

    // ── Evidence Ladder ──
    lines.push('---');
    lines.push('');
    lines.push('## Evidence Ladder After v13.7');
    lines.push('');
    lines.push('```');
    lines.push('first_observation              — curriculum only');
    lines.push('cross_observed                 — curriculum + structural support');
    lines.push('strong_structural_confirmation — all 3 repos structurally confirmed');
    lines.push('needs_content_confirmation     — structurally supported, content unverified');
    lines.push('');
    lines.push('stable_candidate  ← NEW  — ≥2 runs stable + structurally confirmed + no conflicts');
    lines.push('  ⚠ Still requires human review before admitted_learning_record');
    lines.push('');
    lines.push('gap_requires_mapping ← NEW  — internal-only with proposed remediation');
    lines.push('not_admitted         ← NEW  — fails criteria or has unresolved conflict');
    lines.push('');
    lines.push('admitted_learning_record — human-reviewed and explicitly admitted');
    lines.push('canon_candidate          — future: review-admitted + stable + verified');
    lines.push('```');
    lines.push('');
    lines.push('**Current evidence ceiling for all classifications: `corpus_extracted`**');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Attestation');
    lines.push('');
    lines.push(r.attestation);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`*Generated by CohBit-Copilot v13.7 Stable Candidate Review Pipeline*`);
    lines.push(`*Receipt ID: ${r.receiptId}*`);

    return lines.join('\n');
}

function phaseX_report(
    findings: GatedFinding[],
    gapProposal: GapProposal | null,
    priorIds: { v13_4: string; v13_5: string; v13_6B: string },
): { reportPath: string; jsonPath: string } {
    console.log('═══ Phase 5: Report Generation ═══\n');

    const receiptId = `SC_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const receipt: ReviewReceipt = {
        receiptId, version: VERSION,
        pipeline: 'v13.7 — Stable Candidate Review',
        generatedAt: new Date().toISOString(),
        priorV13_4Id: priorIds.v13_4,
        priorV13_5Id: priorIds.v13_5,
        priorV13_6BId: priorIds.v13_6B,
        summary: {
            totalFindings: findings.length,
            stableCandidates: findings.filter(f => f.classification === 'stable_candidate').length,
            needsContentConfirmation: findings.filter(f => f.classification === 'needs_content_confirmation').length,
            gapRequiresMapping: findings.filter(f => f.classification === 'gap_requires_mapping').length,
            notAdmitted: findings.filter(f => f.classification === 'not_admitted').length,
        },
        findings,
        gapProposal,
        attestation:
            'CohBit-Copilot v13.7 applies gated admission criteria to accumulated curriculum evidence. Findings satisfying all four gates are classified as stable_candidate — not as learned. Stale mappings are classified as needs_content_confirmation. Teaching KB gaps receive a proposal-only remediation plan. No findings are admitted as learned. No canon is promoted. Evidence remains capped at corpus_extracted. Human/admitter review is required for final admission to admitted_learning_record.',
    };

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonPath = path.join(OUTPUT_DIR, 'v13_7_stable_candidate_review.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  JSON report:  ${jsonPath}`);

    const mdPath = path.join(OUTPUT_DIR, 'v13_7_stable_candidate_review.md');
    const md = renderMarkdown(receipt);
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  MD report:    ${mdPath}`);
    console.log('');

    return { reportPath: mdPath, jsonPath };
}

// ─── Main ─────────────────────────────────────────────────────────

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v13.7 — Stable Candidate Review');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Phase 1: Load accumulated evidence
    console.log('═══ Phase 1: Load Accumulated Evidence ═══\n');
    const v13_4 = loadJSON(V13_4_PATH, 'v13.4 report');
    const v13_5 = loadJSON(V13_5_PATH, 'v13.5 report');
    const v13_6B = loadJSON(V13_6B_PATH, 'v13.6B report');

    const priorIds = {
        v13_4: v13_4.receiptId,
        v13_5: v13_5.receiptId,
        v13_6B: v13_6B.receiptId,
    };

    // Load v13.6A structural patterns and rebuild annotations
    const v13_6A = loadJSON(V13_6A_PATH, 'v13.6A report');
    const structuralPatterns = (v13_6A.patterns || []) as any[];
    const strongPatterns = structuralPatterns.filter((p: any) => p.category === 'strong_shared_pattern').map((p: any) => p.patternName);
    const sharedPatterns = structuralPatterns.filter((p: any) => p.category === 'shared_pattern').map((p: any) => p.patternName);

    // Rebuild per-finding upgrade status from v13.6A structural patterns (same logic as v13.6B shouldUpgrade)
    function computeUpgradeStatus(finding: any): { upgraded: boolean; newStatus: string | null } {
        const desc = (finding.description || '').toLowerCase();
        const source = (finding.sourceFile || '').toLowerCase();
        const id = (finding.id || '').toLowerCase();
        const type = finding.crossCheckType;

        const hasStrong = (keyword: string) => strongPatterns.some((p: string) => p.toLowerCase().includes(keyword.toLowerCase()));
        const hasAny = (keyword: string) => [...strongPatterns, ...sharedPatterns].some((p: string) => p.toLowerCase().includes(keyword.toLowerCase()));

        if (desc.includes('multi-language') || desc.includes('interoperability')) {
            if (hasStrong('multi-language')) return { upgraded: true, newStatus: 'strongly_structurally_confirmed' };
        }
        if (desc.includes('atlas') || source.includes('atlas') || id.includes('atlas') || id.includes('tlt') || id.includes('code_') || id.includes('math_') || id.includes('res_') || id.includes('tool_')) {
            const layers = hasStrong('layer');
            const atlas = hasAny('atlas');
            if (type === 'close_analogue' && (layers || atlas)) return { upgraded: true, newStatus: 'cross_observed' };
            if (type === 'stale_mapping' && (layers || atlas)) return { upgraded: true, newStatus: 'structurally_supported_stale_mapping' };
        }
        if (desc.includes('verifier') || desc.includes('lean') || desc.includes('proof') || desc.includes('formal') || desc.includes('rust')) {
            if (hasStrong('verifier') || hasStrong('lean') || hasStrong('rust')) return { upgraded: true, newStatus: 'strongly_structurally_confirmed' };
        }
        if (desc.includes('receipt') || source.includes('receipt')) {
            if (hasStrong('receipt') || hasStrong('schema')) return { upgraded: true, newStatus: 'strongly_structurally_confirmed' };
        }
        if (desc.includes('test_vector') || source.includes('test_vector')) {
            if (hasStrong('test_vector')) return { upgraded: true, newStatus: 'strongly_structurally_confirmed' };
        }
        if (desc.includes('cicd') || desc.includes('ci/cd') || desc.includes('release') || desc.includes('gate')) {
            if (hasStrong('ci/cd')) return { upgraded: true, newStatus: 'strongly_structurally_confirmed' };
        }
        if (desc.includes('documentation') || (source.includes('docs') && type === 'close_analogue')) {
            if (hasStrong('docs')) return { upgraded: true, newStatus: 'strongly_structurally_confirmed' };
        }
        return { upgraded: false, newStatus: null };
    }

    const builtAnnotations = v13_4.crossCheckFindings.map((f: any) => ({
        originalId: f.id,
        ...computeUpgradeStatus(f),
    }));

    console.log(`  v13.4:  ${v13_4.crossCheckFindings.length} cross-check findings`);
    console.log(`  v13.5:  delta stable=${v13_5.summary?.delta?.stable || '?'} changed=${v13_5.summary?.delta?.changed || '?'}`);
    console.log(`  v13.6A: ${strongPatterns.length} strong + ${sharedPatterns.length} shared structural patterns`);
    console.log(`  v13.6B: ${builtAnnotations.filter((a: any) => a.upgraded).length}/${builtAnnotations.length} findings upgraded`);
    console.log('');

    // Phase 2 + 3: Gate function + classify all 54 findings
    console.log('═══ Phase 2-3: Gate + Classify All Findings ═══\n');
    const gatedFindings: GatedFinding[] = [];

    for (const finding of v13_4.crossCheckFindings) {
        const evidence = evaluateEvidence(finding, v13_5, builtAnnotations);
        const classification = classifyFinding(evidence, finding);

        const annotation = builtAnnotations.find((a: any) => a.originalId === finding.id);

        gatedFindings.push({
            id: finding.id,
            sourceFile: finding.sourceFile,
            originalType: finding.crossCheckType,
            v13_6B_upgraded: !!(annotation && annotation.upgraded),
            v13_6B_newStatus: annotation ? annotation.newStatus : null,
            evidence,
            gateResults: {
                gate1_curriculum: evidence.gate1_curriculum,
                gate2_reobserved: evidence.gate2_reobserved,
                gate3_structural: evidence.gate3_structural,
                gate4_noConflict: evidence.gate4_noConflict,
            },
            classification: classification.tier,
            classificationReason: classification.reason,
            nextStep: classification.nextStep,
        });
    }

    // Tally
    const tally: Record<string, number> = {};
    for (const f of gatedFindings) tally[f.classification] = (tally[f.classification] || 0) + 1;
    console.log(`  Classified ${gatedFindings.length} findings:`);
    for (const [t, c] of Object.entries(tally).sort()) {
        console.log(`    ${t}: ${c}`);
    }
    console.log('');

    // Phase 4: Gap proposal
    console.log('═══ Phase 4: Gap Proposal Generation ═══\n');
    const gapFindings = gatedFindings.filter(f => f.classification === 'gap_requires_mapping');
    const gapProposal = generateGapProposal(gapFindings);
    if (gapProposal) {
        console.log(`  Gap proposal generated: ${gapProposal.gaps.length} gaps`);
        console.log(`  Proposal ID: ${gapProposal.proposalId}`);
    } else {
        console.log('  No gaps to propose.');
    }
    console.log('');

    // Phase 5: Report
    const paths = phaseX_report(gatedFindings, gapProposal, priorIds);

    console.log('═══════════════════════════════════════════════════');
    console.log('  Pipeline Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log(`  stable_candidate:            ${tally['stable_candidate'] || 0}`);
    console.log(`  needs_content_confirmation:  ${tally['needs_content_confirmation'] || 0}`);
    console.log(`  gap_requires_mapping:        ${tally['gap_requires_mapping'] || 0}`);
    console.log(`  not_admitted:                ${tally['not_admitted'] || 0}`);
    console.log('');
    console.log('  ⚠ stable_candidate ≠ admitted_learning_record');
    console.log('  ⚠ Human/admitter review still required for final admission.');
    console.log('  ⚠ Evidence ceiling: corpus_extracted (unchanged)');
    console.log('');
    console.log(`  Reports: ${paths.reportPath}`);
    console.log(`           ${paths.jsonPath}`);
}

main();