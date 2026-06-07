// CohBit-Copilot v14.2 — Starter Demo Runner
// Runs a guided demo against fixture code. No real code touched.
//
// Operating law:
//   The demo may show audit output, teaching explanations, dashboard summaries,
//   and trust-kernel status. It may NOT mutate any source code, apply patches,
//   or generate proposals against real repositories.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatAccessStatus } from './access_control.js';
import { formatSystemExplain } from './system_explain.js';

export function runStarterDemo(): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════');
    lines.push('  CohBit-Copilot — Starter Demo');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');
    lines.push('  Welcome! This demo shows what CohBit-Copilot can do');
    lines.push('  without touching your real code.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 1: What This Tool Is');
    lines.push('');
    lines.push('  CohBit-Copilot is a local governed development and teaching');
    lines.push('  copilot for code-change judgment. It helps you inspect, review,');
    lines.push('  and govern code changes with evidence, receipts, and memory.');
    lines.push('');
    lines.push('  It is NOT an LLM agent, NOT a code generator, and NOT a');
    lines.push('  replacement developer.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 2: What It Can Do (And What It Refuses)');
    lines.push('');
    lines.push('  ✅ Audit your code for risk patterns');
    lines.push('  ✅ Find structural issues and security concerns');
    lines.push('  ✅ Generate review-grade findings (NOT verified defects)');
    lines.push('  ✅ Teach governed development concepts');
    lines.push('  ✅ Track memory stability across runs');
    lines.push('  ✅ Verify receipts with Rust trust kernels');
    lines.push('');
    lines.push('  ❌ Auto-apply patches without human review');
    lines.push('  ❌ Self-authorize proposals');
    lines.push('  ❌ Claim verification without evidence receipts');
    lines.push('  ❌ Close obligations via learning alone');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 3: Finding Types You Might See');
    lines.push('');
    lines.push('  surface_detected   — A pattern was matched. May be a false positive.');
    lines.push('  needs_evidence     — More verification is required.');
    lines.push('  receipt_available  — A verification receipt has been linked.');
    lines.push('');
    lines.push('  A finding is a REVIEW SIGNAL, not a confirmed defect.');
    lines.push('  Every finding must be triaged by a human before action.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 4: The Governed Patch Path (Path A)');
    lines.push('');
    lines.push('  propose → review → authorize → apply → test → receipt');
    lines.push('');
    lines.push('  Each step is a gate. The copilot cannot skip gates.');
    lines.push('  Proposals require human review and authorization.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 5: The Audit Path (Path B)');
    lines.push('');
    lines.push('  scan → find → triage → obligation → report');
    lines.push('');
    lines.push('  Audit observes and reports. It NEVER mutates code.');
    lines.push('  Findings are review signals, not commands.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 6: Teaching Mode');
    lines.push('');
    lines.push('  The copilot can teach governed development concepts:');
    lines.push('');
    lines.push('  Example teaching topics:');
    lines.push('  • "proposal vs authority" — Why detection ≠ repair permission');
    lines.push('  • "surface detected vs verified" — The evidence ladder');
    lines.push('  • "why receipts matter" — Decisions need receipts');
    lines.push('  • "obligation vs defect" — Open tasks ≠ confirmed bugs');
    lines.push('');
    lines.push('  Try: cohbit-copilot teach "proposal vs authority"');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 7: Trust Kernels');
    lines.push('');
    lines.push('  The copilot uses Rust-based trust kernels for:');
    lines.push('  • Receipt verification (SHA-256 hash chains)');
    lines.push('  • Path safety (no directory traversal)');
    lines.push('  • Deterministic IDs (hash-based, no collisions)');
    lines.push('  • Scanner evidence (policy gate checks)');
    lines.push('');
    lines.push('  TypeScript orchestrates. Rust verifies. CohBit receipts the boundary.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 8: What Gets Stored Locally');
    lines.push('');
    lines.push('  .cohbit/config.json       — Your access profile');
    lines.push('  .cohbit/gates/            — Gate records and receipts');
    lines.push('  .cohbit/atlas/            — Learning records');
    lines.push('  reports/                  — Audit reports');
    lines.push('');
    lines.push('  Nothing leaves your machine. No cloud. No telemetry.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 9: Your Current Access');
    lines.push('');

    // Show access status inline
    lines.push(formatAccessStatus());
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## STEP 10: Commands to Try Next');
    lines.push('');
    lines.push('  cohbit-copilot system explain     — Full system overview');
    lines.push('  cohbit-copilot start              — Interactive command hub');
    lines.push('  cohbit-copilot audit .            — Audit your code');
    lines.push('  cohbit-copilot teach "why receipts matter"');
    lines.push('  cohbit-copilot memory stability   — Check system health');
    lines.push('  cohbit-copilot dashboard          — View obligation health');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('  The copilot observes. You decide.');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
}