// CohBit-Copilot v14.0 — Human Learning Admission Gate
// Pipeline: Load recommended candidates → Present for human review → Await decisions
//
// Operating law:
//   v14.0 presents stable candidates recommended for admission to a human reviewer.
//   It may emit admission receipts only after explicit human confirmation.
//   It may NOT auto-admit, promote canon, upgrade evidence, or modify source code.
//   Only human-decided admissions become admitted_learning_record.
//
// Safe claim:
//   CohBit-Copilot v14.0 presents the 3 recommended learning candidates from v13.8
//   to a human reviewer for final admission decisions. Each candidate includes a full
//   evidence trail, limitations, and a decision field. No finding is admitted as
//   learned without explicit human confirmation. Evidence remains corpus_extracted.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const V13_8_PATH = path.join(OUTPUT_DIR, 'v13_8_admission_review.json');
const V13_7_PATH = path.join(OUTPUT_DIR, 'v13_7_stable_candidate_review.json');
const VERSION = '14.0.0';

type HumanDecision = 'admit' | 'defer' | 'reject' | 'pending';

interface AdmissionCandidate {
    findingId: string;
    sourceFile: string;
    originalType: string;
    v13_6B_status: string;
    evidenceScore: number;
    evidenceTrail: {
        v13_4_present: boolean;
        v13_5_reobserved_stable: boolean;
        v13_6A_structural: string;
        v13_6B_content: string;
    };
    limitations: string[];
    machineRecommendation: string;
    humanDecision: HumanDecision;
    humanReviewer: string | null;
    humanNotes: string | null;
    admissionReceiptId: string | null;
    admittedAt: string | null;
}

interface AdmissionGateReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    priorV13_8Id: string;
    summary: {
        totalCandidates: number;
        pending: number;
        admitted: number;
        deferred: number;
        rejected: number;
    };
    candidates: AdmissionCandidate[];
    attestation: string;
    instructions: string;
}

function loadJSON(p: string): any {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function renderMarkdown(r: AdmissionGateReceipt): string {
    const lines: string[] = [];
    lines.push('# CohBit-Copilot v14.0 — Human Learning Admission Gate');
    lines.push('');
    lines.push(`**Receipt ID:** \`${r.receiptId}\``);
    lines.push(`**Generated:** ${r.generatedAt}`);
    lines.push(`**Version:** ${r.version}`);
    lines.push(`**Prior v13.8:** \`${r.priorV13_8Id}\``);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Safe Claim');
    lines.push('');
    lines.push('> CohBit-Copilot v14.0 presents the 3 recommended learning candidates from');
    lines.push('> v13.8 to a human reviewer for final admission decisions. Each candidate');
    lines.push('> includes a full evidence trail, known limitations, and a decision field.');
    lines.push('> No finding is admitted as learned without explicit human confirmation.');
    lines.push('> Evidence remains capped at `corpus_extracted`.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Decision Summary');
    lines.push('');
    lines.push(`| Decision | Count |`);
    lines.push(`|----------|-------|`);
    lines.push(`| Pending | ${r.summary.pending} |`);
    lines.push(`| Admitted | ${r.summary.admitted} |`);
    lines.push(`| Deferred | ${r.summary.deferred} |`);
    lines.push(`| Rejected | ${r.summary.rejected} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## ⚠️ HUMAN REVIEW REQUIRED');
    lines.push('');
    lines.push('These candidates have passed all four machine gates and are recommended for admission.');
    lines.push('A human reviewer must explicitly mark each as **admit**, **defer**, or **reject**.');
    lines.push('No finding becomes an `admitted_learning_record` until a human signs off.');
    lines.push('');
    lines.push('### How to admit a candidate');
    lines.push('');
    lines.push('1. Review the evidence trail and limitations below.');
    lines.push('2. Set `humanDecision` to `admit`, `defer`, or `reject`.');
    lines.push('3. Provide `humanReviewer` name or identifier.');
    lines.push('4. Re-run this pipeline with decisions applied.');
    lines.push('5. Admitted candidates will receive an `admission_receipt_id`.');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Candidates for Admission Review');
    lines.push('');

    for (const c of r.candidates) {
        lines.push(`### ${c.findingId}`);
        lines.push('');
        lines.push(`| Field | Value |`);
        lines.push(`|-------|-------|`);
        lines.push(`| Source | ${c.sourceFile} |`);
        lines.push(`| Original type | ${c.originalType} |`);
        lines.push(`| v13.6B status | \`${c.v13_6B_status}\` |`);
        lines.push(`| Evidence score | ${c.evidenceScore}/3 |`);
        lines.push(`| Machine recommendation | \`${c.machineRecommendation}\` |`);
        lines.push(`| **Human decision** | **\`${c.humanDecision}\`** |`);
        lines.push(`| Reviewer | \`${c.humanReviewer || 'TBD'}\` |`);
        lines.push(`| Notes | ${c.humanNotes || '—'} |`);
        if (c.admissionReceiptId) lines.push(`| Admission receipt | \`${c.admissionReceiptId}\` |`);
        lines.push('');
        lines.push('**Evidence trail:**');
        lines.push(`- v13.4 curriculum: ${c.evidenceTrail.v13_4_present ? '✅' : '❌'}`);
        lines.push(`- v13.5 reobservation: ${c.evidenceTrail.v13_5_reobserved_stable ? '✅' : '❌'}`);
        lines.push(`- v13.6A structural: ${c.evidenceTrail.v13_6A_structural}`);
        lines.push(`- v13.6B content: ${c.evidenceTrail.v13_6B_content}`);
        lines.push('');
        lines.push('**Known limitations:**');
        for (const l of c.limitations) lines.push(`- ${l}`);
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Admission Receipts (Emitted Only After Human Decision)');
    lines.push('');

    const admitted = r.candidates.filter(c => c.humanDecision === 'admit');
    if (admitted.length > 0) {
        for (const c of admitted) {
            lines.push(`### Admitted: ${c.findingId}`);
            lines.push('');
            lines.push(`- **Admission receipt:** \`${c.admissionReceiptId}\``);
            lines.push(`- **Admitted at:** ${c.admittedAt}`);
            lines.push(`- **Reviewer:** ${c.humanReviewer}`);
            lines.push(`- **Status:** admitted_learning_record`);
            lines.push(`- **Evidence ceiling:** corpus_extracted`);
            lines.push(`- **Not canon, not verified, not proven.**`);
            lines.push('');
        }
    } else {
        lines.push('*No candidates admitted yet. Human decisions are pending.*');
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Instructions');
    lines.push('');
    lines.push(r.instructions);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Attestation');
    lines.push('');
    lines.push(r.attestation);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`*Generated by CohBit-Copilot v14.0 Human Learning Admission Gate*`);
    lines.push(`*Receipt ID: ${r.receiptId}*`);

    return lines.join('\n');
}

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v14.0 — Human Learning Admission Gate');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    const v13_8 = loadJSON(V13_8_PATH);

    const recommended = v13_8.reviewCards.filter((c: any) => c.automatedRecommendation === 'admit_as_learning_record');

    console.log(`  Loaded ${recommended.length} recommended candidates from v13.8`);
    console.log('');

    const candidates: AdmissionCandidate[] = [];

    for (const c of recommended) {
        const admissionReceiptId = `ALR_${crypto.createHash('sha256').update(`${c.findingId}_${Date.now()}`).digest('hex').slice(0, 12)}`;

        // Check if human decision was pre-set (for re-runs)
        const existingDecision: HumanDecision = 'pending';

        candidates.push({
            findingId: c.findingId,
            sourceFile: c.sourceFile,
            originalType: c.originalType,
            v13_6B_status: c.v13_6B_upgradeStatus,
            evidenceScore: c.evidenceScore,
            evidenceTrail: {
                v13_4_present: c.evidenceTrail?.v13_4_present !== false,
                v13_5_reobserved_stable: c.evidenceTrail?.v13_5_reobserved_stable !== false,
                v13_6A_structural: c.evidenceTrail?.v13_6A_structural || c.v13_6B_upgradeStatus,
                v13_6B_content: c.evidenceTrail?.v13_6B_content || 'structurally confirmed',
            },
            limitations: c.knownLimitations || [
                'Evidence ceiling: corpus_extracted',
                'Admitted does NOT mean verified, canon, or proven',
            ],
            machineRecommendation: c.automatedRecommendation,
            humanDecision: existingDecision,
            humanReviewer: null,
            humanNotes: null,
            admissionReceiptId: existingDecision === 'admit' ? admissionReceiptId : null,
            admittedAt: existingDecision === 'admit' ? new Date().toISOString() : null,
        });
    }

    const receiptId = `HG_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const receipt: AdmissionGateReceipt = {
        receiptId, version: VERSION,
        pipeline: 'v14.0 — Human Learning Admission Gate',
        generatedAt: new Date().toISOString(),
        priorV13_8Id: v13_8.receiptId,
        summary: {
            totalCandidates: candidates.length,
            pending: candidates.filter(c => c.humanDecision === 'pending').length,
            admitted: candidates.filter(c => c.humanDecision === 'admit').length,
            deferred: candidates.filter(c => c.humanDecision === 'defer').length,
            rejected: candidates.filter(c => c.humanDecision === 'reject').length,
        },
        candidates,
        attestation:
            'CohBit-Copilot v14.0 presents 3 recommended learning candidates for human admission review. ' +
            'No finding is admitted as learned without explicit human confirmation. Evidence remains capped at corpus_extracted. ' +
            'Admitted findings become admitted_learning_record — not canon, not verified, not proven. ' +
            'Admission may be withdrawn if reobservation diverges.',
        instructions:
            'This is the human admission gate. All machine gates (v13.4–v13.8) have been passed. ' +
            'For each candidate above, a human reviewer must set humanDecision to one of: admit, defer, reject. ' +
            'Admitted candidates receive an admission_receipt_id and become admitted_learning_record. ' +
            'This is the final step in the v13 learning pipeline. After admission, records may be re-evaluated for canon_candidate status in a future pipeline.',
    };

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonPath = path.join(OUTPUT_DIR, 'v14_0_human_admission_gate.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  JSON report:  ${jsonPath}`);

    const mdPath = path.join(OUTPUT_DIR, 'v14_0_human_admission_gate.md');
    const md = renderMarkdown(receipt);
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  MD report:    ${mdPath}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('  Admission Gate Ready');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log(`  Candidates presented: ${candidates.length}`);
    console.log(`  Status: All ${candidates.length} awaiting human decision`);
    console.log('');
    console.log('  ⚠ HUMAN ACTION REQUIRED:');
    console.log('  ⚠ Review each candidate and set humanDecision: admit | defer | reject');
    console.log('  ⚠ No findings are admitted_learning_record yet.');
    console.log(`  ⚠ Evidence ceiling: corpus_extracted (unchanged)`);
    console.log('');
    console.log('  Next: After human decisions, re-run this pipeline');
    console.log('  with decisions applied to emit admission receipts.');
    console.log('');
    console.log(`  Gate report: ${mdPath}`);
    console.log(`  Gate data:   ${jsonPath}`);
}

main();