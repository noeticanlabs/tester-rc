#!/usr/bin/env -S npx tsx
// CohBit-Copilot v2.7 — Real Repo Audit Runner
// Scans the project workspace and runs the integrated governed atlas audit.
// Read-only. No filesystem mutation.

import { scanWorkspace } from '../src/workspace.js';
import { auditRepository, generateIntegratedAuditMarkdown } from '../packages/tooling/src/T_integrated_audit.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

async function main() {
    const root = process.cwd();
    console.log(`Scanning workspace at ${root}...`);

    const ws = await scanWorkspace(root);
    const allFiles = [
        ...ws.sourceFiles,
        ...ws.testFiles,
        ...ws.configFiles,
        ...ws.docsFiles,
    ];

    console.log(`Found ${allFiles.length} files. Running integrated audit...`);

    const result = auditRepository(allFiles, { includeBenchmark: true });
    const markdown = generateIntegratedAuditMarkdown(result);

    const outPath = path.join(root, 'reports', 'v2_7_repo_audit.md');
    await fs.writeFile(outPath, markdown, 'utf-8');

    console.log(`\nAudit complete.`);
    console.log(`  Files scanned: ${result.scan.filesScanned}`);
    console.log(`  Code: ${result.scan.detectedArtifacts.codeFiles} | Math docs: ${result.scan.detectedArtifacts.mathDocs} | Proof: ${result.scan.detectedArtifacts.proofFiles} | Language: ${result.scan.detectedArtifacts.languageDocs}`);
    console.log(`  Risks: ${result.risks.totalRiskWarnings}`);
    console.log(`  Open repairs: ${result.repair.openRepairs}`);
    console.log(`  Retrieval evidence level: ${result.retrieval.evidenceLevel}`);
    console.log(`  Report saved to: ${outPath}`);
}

main().catch(err => { console.error(err); process.exit(1); });