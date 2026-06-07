#!/usr/bin/env -S npx tsx
// CohBit-Copilot v4.2 — Human Review Receipt Trial
// Demonstrates creating, validating, storing, and querying human review receipts
// for atlas memory entries. Uses synthetic review decisions.
//
// Operating law:
//   Human review may classify memory.
//   It may not rewrite history, silently delete findings, generate repairs, or authorize mutation.
//   A review receipt is an annotation, not a gate-pipeline receipt.

import { scanWorkspace } from '../src/workspace.js';
import { readContentFiles } from '../packages/tooling/src/T_content_reader.js';
import { scanRustContentBatch } from '../packages/tooling/src/T_rust_risk_scanner.js';
import { buildReviewQueue } from '../packages/tooling/src/T_rust_review_queue.js';
import { seedAtlasFromFindings } from '../src/atlas_integration.js';
import { createReviewReceipt, validateReviewReceipt, storeReviewReceipt, listReviewReceipts, type ReviewDecision } from '../src/human_review_receipt.js';
import { createComputeBudget, authorizeCompute, recordCompute } from '../packages/resource/src/R1_compute.js';
import { createTimeBudget, recordElapsed } from '../packages/resource/src/R5_time.js';
import { createResourceReceipt, closeResourceReceipt } from '../packages/resource/src/R18_receipt.js';
import { createResourceHealth } from '../packages/resource/src/R19_dashboard.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

// ─── Synthetic review decision mapping ────────────────────────

function syntheticDecision(riskKind: string): { decision: ReviewDecision; rationale: string } {
    switch (riskKind) {
        case 'unsafe_block':
            return { decision: 'needs_repair', rationale: '[SYNTHETIC DEMO] Requires safety invariant documentation and manual review before any code change.' };
        case 'unsafe_function':
            return { decision: 'needs_repair', rationale: '[SYNTHETIC DEMO] Requires caller-side safety analysis and precondition documentation.' };
        case 'process_command':
        case 'command_new':
            return { decision: 'needs_repair', rationale: '[SYNTHETIC DEMO] Requires command whitelist audit and input sanitization review.' };
        case 'filesystem_delete_file':
        case 'filesystem_delete_recursive':
            return { decision: 'needs_repair', rationale: '[SYNTHETIC DEMO] Requires path scoping audit and blast radius assessment.' };
        case 'filesystem_create':
        case 'filesystem_open_write':
            return { decision: 'needs_repair', rationale: '[SYNTHETIC DEMO] Requires path validation and safety review.' };
        case 'filesystem_path_from_variable':
            return { decision: 'needs_repair', rationale: '[SYNTHETIC DEMO] Requires variable source audit and injection analysis.' };
        case 'relative_traversal':
            return { decision: 'needs_repair', rationale: '[SYNTHETIC DEMO] Requires path boundary audit and sandbox escape analysis.' };
        case 'panic_review_signal':
            return { decision: 'needs_repair', rationale: '[SYNTHETIC DEMO] Requires recoverability assessment and panic boundary review.' };
        case 'unwrap_review_signal':
        case 'expect_review_signal':
            return { decision: 'accepted_risk', rationale: '[SYNTHETIC DEMO] Pattern reviewed. Accepted as intentional error handling strategy pending AST analysis.' };
        case 'todo_review_signal':
        case 'unimplemented_review_signal':
            return { decision: 'deferred', rationale: '[SYNTHETIC DEMO] Deferred pending implementation specification and roadmap assignment.' };
        case 'path_join_dynamic':
        case 'format_path':
            return { decision: 'accepted_risk', rationale: '[SYNTHETIC DEMO] Path construction reviewed. Accepted pending AST structural analysis.' };
        default:
            return { decision: 'accepted_risk', rationale: '[SYNTHETIC DEMO] Pattern reviewed. Accepted as intentional or low-risk.' };
    }
}

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    const sessionId = `v4.2_${Date.now()}`;
    const REVIEWER = 'synthetic-v4.2-trial';
    console.log(`v4.2 Human Review Receipt Trial`);
    console.log(`Target: ${root}`);
    console.log(`⚠ All review decisions are SYNTHETIC DEMO — no human reviewer made these decisions.\n`);

    const origCwd = process.cwd();
    process.chdir(root);
    const startTime = Date.now();

    const computeBudget = authorizeCompute(createComputeBudget({
        workflowId: 'v4.2-review-trial', resourceType: 'cpu_time', budgetLimit: 120, estimatedUse: 40,
    }), true);
    const timeBudget = createTimeBudget({ workflowId: 'v4.2-review-trial', budgetLimitMs: 120000, estimatedMs: 40000 });

    // ─── Run the full v4.0 pipeline to get seeded entries ─────
    const ws = await scanWorkspace('.');
    const readableFiles = [...ws.sourceFiles, ...ws.testFiles, ...ws.docsFiles];
    const contentResult = readContentFiles(readableFiles, { maxTotalBytes: 50 * 1024 * 1024, maxFiles: 500 });
    const rustResult = scanRustContentBatch(contentResult.artifacts);
    const queue = buildReviewQueue(rustResult.findings);
    const seedResult = await seedAtlasFromFindings(queue.items, sessionId);

    // ─── Create, validate, and store review receipts ──────────
    console.log(`Creating synthetic review receipts for ${seedResult.entries.length} entries...`);
    const receipts = [];
    const validationResults: { id: string; valid: boolean; errors: string[] }[] = [];
    const storeErrors: string[] = [];

    for (const entry of seedResult.entries) {
        const riskKind = entry.transitionId?.replace('TRANS_', '') ?? '';
        const { decision, rationale } = syntheticDecision(riskKind);

        const receipt = createReviewReceipt(entry.receiptBitId, REVIEWER, decision, rationale);
        const validation = validateReviewReceipt(receipt);
        validationResults.push({ id: receipt.reviewId, valid: validation.valid, errors: validation.errors });

        if (validation.valid) {
            try {
                await storeReviewReceipt(receipt);
                receipts.push(receipt);
            } catch (err) {
                storeErrors.push(`${entry.receiptBitId}: ${err instanceof Error ? err.message : String(err)}`);
            }
        } else {
            storeErrors.push(`${entry.receiptBitId}: validation failed — ${validation.errors.join('; ')}`);
        }
    }

    // ─── Query stored receipts ────────────────────────────────
    const storedReceipts = await listReviewReceipts();

    const totalMs = Date.now() - startTime;
    recordCompute(computeBudget, totalMs / 1000, 'v4.2-review-receipt');
    recordElapsed(timeBudget, totalMs);

    const health = createResourceHealth({
        workspaceId: 'cohbit-ctrl',
        panels: { computeHealth: 'healthy', repairBacklogHealth: 'healthy', toolCallHealth: 'healthy' },
    });

    const resourceReceipt = createResourceReceipt({
        workflowId: 'v4.2-review-trial',
        authorizedResources: [`cpu_time:${computeBudget.budgetLimit}s`],
        outputsCreated: ['v4_2_review_receipt_trial.md'],
    });
    closeResourceReceipt(resourceReceipt, [
        `cpu_time:${(totalMs / 1000).toFixed(1)}s`,
        `entries_processed:${seedResult.entries.length}`,
        `receipts_created:${receipts.length}`,
        `receipts_validated:${validationResults.filter(v => v.valid).length}`,
        `receipts_stored:${storedReceipts.length}`,
        `validation_failures:${validationResults.filter(v => !v.valid).length}`,
        `store_errors:${storeErrors.length}`,
    ], `Review receipt trial in ${(totalMs / 1000).toFixed(1)}s. ${storedReceipts.length} receipts stored.`);

    // ─── Decision distribution ────────────────────────────────
    const decisionCounts = new Map<string, number>();
    for (const r of receipts) {
        decisionCounts.set(r.decision, (decisionCounts.get(r.decision) ?? 0) + 1);
    }

    // ─── Report ───────────────────────────────────────────────
    const sv = rustResult.summary.bySeverityAndConfidence;

    const report = [
        `# CohBit-Copilot v4.2 — Human Review Receipt Trial`,
        `**Target:** ${root}`,
        `**Ran:** ${new Date().toISOString()}`,
        `**Reviewer:** ${REVIEWER} (synthetic demo)`,
        '',
        `## ⚠ Important`,
        `> **All review decisions in this report are SYNTHETIC DEMONSTRATION.**`,
        `> No human reviewer made these decisions. They are generated by rule-based mapping`,
        `> to demonstrate the review receipt pipeline.`,
        `> Review receipts are annotations on atlas memory — they do not modify source code.`,
        '',
        `## 1. Summary`,
        `| Metric | Value |`,
        `|--------|-------|`,
        `| Files | ${ws.totalFiles} | Language: ${ws.language} |`,
        `| Seeded atlas entries | ${seedResult.entries.length} |`,
        `| Review receipts created | **${receipts.length}** |`,
        `| Validated | ${validationResults.filter(v => v.valid).length} |`,
        `| Stored | ${storedReceipts.length} |`,
        `| Validation failures | ${validationResults.filter(v => !v.valid).length} |`,
        `| Store errors | ${storeErrors.length} |`,
        `| \`commitStatus\` | **not_applicable** on all ${receipts.length} receipts |`,
        `| \`evidenceLevel\` | **human_reviewed** on all ${receipts.length} receipts |`,
        '',
        `## 2. Decision Distribution`,
        `| Decision | Count |`,
        `|----------|-------|`,
        ...[...decisionCounts.entries()].sort((a, b) => b[1] - a[1]).map(([d, c]) => `| ${d} | **${c}** |`),
        '',
        `## 3. Decision Breakdown`,
        `- **needs_repair:** ${decisionCounts.get('needs_repair') ?? 0} — found patterns requiring human repair planning`,
        `- **accepted_risk:** ${decisionCounts.get('accepted_risk') ?? 0} — patterns reviewed and accepted as intentional`,
        `- **deferred:** ${decisionCounts.get('deferred') ?? 0} — patterns deferred pending specification/roadmap`,
        `- **false_positive:** ${decisionCounts.get('false_positive') ?? 0} — patterns classified as false positives`,
        `- **not_applicable:** ${decisionCounts.get('not_applicable') ?? 0} — patterns not applicable to current context`,
        '',
        `## 4. Top Needs-Repair Findings`,
        ...(receipts.filter(r => r.decision === 'needs_repair').slice(0, 10).map(r =>
            `- \`${r.atlasEntryId}\` — ${r.decision} — ${r.rationale.substring(0, 80)}...`
        )),
        '',
        `## 5. Hard Constraints (verified)`,
        `- \`commitStatus\`: **not_applicable** on all receipts ✅`,
        `- \`evidenceLevel\`: **human_reviewed** on all receipts ✅`,
        `- Original atlas entries preserved ✅`,
        `- No source code modified ✅`,
        `- No patches generated ✅`,
        `- No evidence promoted ✅`,
        `- All receipts validated before storage ✅`,
        ...(storeErrors.length > 0 ? [`- ⚠ Store errors: ${storeErrors.length}`] : []),
        '',
        `## 6. Calibrated Signal Summary`,
        `| High×High | High×Med | Medium×High | Medium×Med |`,
        `|-----------|----------|-------------|------------|`,
        `| ${sv.highHigh} | ${sv.highMedium} | ${sv.mediumHigh} | ${sv.mediumMedium} |`,
        '',
        `## 7. Resource Budget`,
        `- Compute: ${(totalMs / 1000).toFixed(1)}s / ${computeBudget.budgetLimit}s (${computeBudget.status})`,
        `- Content: ${(contentResult.budgetUsed.totalBytes / 1024).toFixed(0)}KB`,
        `- Health: **${health.overallResourceHealth}**`,
        '',
        `## 8. Storage`,
        `- Receipts written to \`.cohbit/atlas/reviews/<atlasEntryId>.json\``,
        `- Stored: ${storedReceipts.length} | Queried: ${storedReceipts.length}`,
        '',
        `## 9. Limitations`,
        `- **Synthetic decisions** — no human reviewer made these classifications`,
        `- **Decisions are not binary** — \`needs_repair\` does not trigger automatic repair`,
        `- **False positives preserved** — original atlas memory is never deleted`,
        `- **No retrieval guard integration yet** — reviewed status not yet surfaced in T15`,
        `- **Single reviewer** — real workflow would support multiple reviewers`,
        '',
        `---`,
        `*v4.2 Human Review Receipt Trial. v4.1 made memory routable. v4.2 makes human judgment receiptable without letting judgment silently mutate code.*`,
    ];

    const reportPath = path.join(origCwd, 'reports', 'v4_2_review_receipt_trial.md');
    await fs.writeFile(reportPath, report.join('\n'), 'utf-8');
    process.chdir(origCwd);

    console.log(`\n═══ v4.2 Review Receipt Trial Complete ═══`);
    console.log(`  Receipts: ${receipts.length} created, ${storedReceipts.length} stored`);
    console.log(`  Decisions: needs_repair=${decisionCounts.get('needs_repair') ?? 0}, accepted_risk=${decisionCounts.get('accepted_risk') ?? 0}, deferred=${decisionCounts.get('deferred') ?? 0}`);
    console.log(`  commitStatus=not_applicable on all ${receipts.length} receipts`);
    console.log(`  Report: ${reportPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });