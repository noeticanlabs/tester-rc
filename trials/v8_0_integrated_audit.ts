#!/usr/bin/env -S npx tsx
// CohBit-Copilot v8.0 — Integrated Audit Trial
// One command, one report, one JSON. Full v3.0–v7.3 pipeline.

import { runIntegratedAudit } from '../src/integrated_pipeline.js';
import { getOpenRepairs } from '../packages/tooling/src/T8_repair_queue.js';
import * as path from 'node:path';

async function main() {
    const targetDir = process.argv[2] || process.cwd();
    const root = path.resolve(targetDir);
    console.log(`v8.0 Integrated Audit`);
    console.log(`Target: ${root}\n`);

    const result = await runIntegratedAudit(root);

    console.log(`\n═══ v8.0 Integrated Audit Complete ═══`);
    console.log(`  Files: ${result.summary.files} | Findings: ${result.summary.totalFindings}`);
    console.log(`  P0: ${result.summary.p0} | P1: ${result.summary.p1}`);
    console.log(`  Atlas: ${result.summary.atlasEntriesWritten} | Obligations: ${result.summary.obligations}`);
    console.log(`  Proposals: ${result.summary.proposals} | Open repairs: ${getOpenRepairs().length}`);
    console.log(`  Report: reports/v8_0_integrated_audit.md`);
    console.log(`  JSON: reports/v8_0_integrated_audit.json`);
}

main().catch(err => { console.error(err); process.exit(1); });