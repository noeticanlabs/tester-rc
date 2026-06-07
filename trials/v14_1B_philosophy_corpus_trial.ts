// CohBit-Copilot v14.1B — Philosophy Corpus Trial
// Runs the L17 philosophical language classifier against the TAP corpus
// in the philosophy curriculum directory.
//
// Output: per-file classification summary + aggregate report.
// All output is surface_detected advisory. No canonization occurs.

import * as fs from "node:fs";
import * as path from "node:path";
import { classifyPhilosophicalLanguage } from "../packages/tlt-atlas/src/philosophy/L17_philosophical_language.js";
import { detectPhilosophyOverclaim } from "../packages/tlt-atlas/src/philosophy/philosophy_guards.js";
import { extractPhilosophyPolaritySignals } from "../packages/tlt-atlas/src/philosophy/philosophy_polarity.js";
import type { PhilosophicalLanguageRecord } from "../packages/tlt-atlas/src/philosophy/L17_philosophical_language.js";

const CORPUS_ROOT = path.resolve(
    "C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\Doctrine curriuclum\\curriculum\\language\\Language\\philosophy"
);

interface FileResult {
    file: string;
    records: PhilosophicalLanguageRecord[];
    philosophicalLines: number;
    totalLines: number;
    warnings: number;
    overclaims: number;
    claimTypes: Record<string, number>;
    languageModes: Record<string, number>;
}

async function readTextFiles(dirPath: string): Promise<Array<{ file: string; text: string }>> {
    const results: Array<{ file: string; text: string }> = [];
    const entries = fs.readdirSync(dirPath);

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            const subResults = await readTextFiles(fullPath);
            results.push(...subResults);
        } else if (entry.endsWith(".txt") || entry.endsWith(".json") || entry.endsWith(".jsonl")) {
            try {
                const text = fs.readFileSync(fullPath, "utf-8");
                if (text.trim().length > 0) {
                    results.push({ file: path.relative(CORPUS_ROOT, fullPath), text });
                }
            } catch {
                // skip unreadable
            }
        }
    }

    return results;
}

async function main() {
    console.log("═══════════════════════════════════════════════════");
    console.log("  CohBit-Copilot v14.1B — Philosophy Corpus Trial");
    console.log("═══════════════════════════════════════════════════");
    console.log(`\n  Corpus: ${CORPUS_ROOT}\n`);

    const files = await readTextFiles(CORPUS_ROOT);
    console.log(`  Files found: ${files.length}\n`);

    const allResults: FileResult[] = [];
    let totalPhilosophicalLines = 0;
    let totalLines = 0;
    let totalWarnings = 0;
    let totalOverclaims = 0;
    const aggregateClaimTypes: Record<string, number> = {};
    const aggregateLanguageModes: Record<string, number> = {};
    let totalPositive = 0;
    let totalNegative = 0;

    for (const { file, text } of files) {
        const lines = text.split("\n");
        const records: PhilosophicalLanguageRecord[] = [];
        let philosophicalLines = 0;

        for (const line of lines) {
            if (line.trim().length < 10) continue;
            const record = classifyPhilosophicalLanguage(line, file);
            if (record.isPhilosophical) {
                records.push(record);
                philosophicalLines++;

                // Aggregate
                aggregateClaimTypes[record.claimType] = (aggregateClaimTypes[record.claimType] || 0) + 1;
                aggregateLanguageModes[record.languageMode] = (aggregateLanguageModes[record.languageMode] || 0) + 1;
                if (record.warnings.length > 0) totalWarnings++;
            }
        }

        const overclaims = detectPhilosophyOverclaim(text);

        const fileResult: FileResult = {
            file,
            records,
            philosophicalLines,
            totalLines: lines.length,
            warnings: records.filter(r => r.warnings.length > 0).length,
            overclaims: overclaims.length,
            claimTypes: {},
            languageModes: {},
        };

        for (const r of records) {
            fileResult.claimTypes[r.claimType] = (fileResult.claimTypes[r.claimType] || 0) + 1;
            fileResult.languageModes[r.languageMode] = (fileResult.languageModes[r.languageMode] || 0) + 1;

            const polarity = extractPhilosophyPolaritySignals(r);
            totalPositive += polarity.positive.length;
            totalNegative += polarity.negative.length;
        }

        totalPhilosophicalLines += philosophicalLines;
        totalLines += lines.length;
        totalOverclaims += overclaims.length;
        allResults.push(fileResult);
    }

    // ─── Per-File Summary ──────────────────────────────────
    console.log("═══ Per-File Summary ═══\n");
    for (const fr of allResults.sort((a, b) => b.philosophicalLines - a.philosophicalLines)) {
        if (fr.philosophicalLines === 0) continue;
        console.log(`  ${fr.file}`);
        console.log(`    Lines: ${fr.totalLines} total, ${fr.philosophicalLines} philosophical (${((fr.philosophicalLines / fr.totalLines) * 100).toFixed(1)}%)`);
        console.log(`    Warnings: ${fr.warnings} | Overclaims: ${fr.overclaims}`);
        console.log(`    Claim types: ${Object.entries(fr.claimTypes).map(([k, v]) => `${k}:${v}`).join(", ")}`);
        console.log(`    Language modes: ${Object.entries(fr.languageModes).map(([k, v]) => `${k}:${v}`).join(", ")}`);
        console.log();
    }

    // ─── Aggregate Report ─────────────────────────────────
    console.log("═══ Aggregate Report ═══\n");
    console.log(`  Total lines processed: ${totalLines}`);
    console.log(`  Philosophical lines: ${totalPhilosophicalLines} (${((totalPhilosophicalLines / totalLines) * 100).toFixed(1)}%)`);
    console.log(`  Lines with warnings: ${totalWarnings}`);
    console.log(`  Overclaim violations: ${totalOverclaims}`);
    console.log(`  Positive polarity signals: ${totalPositive}`);
    console.log(`  Negative polarity signals: ${totalNegative}`);
    console.log();
    console.log("  Claim Type Distribution:");
    for (const [k, v] of Object.entries(aggregateClaimTypes).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${k}: ${v}`);
    }
    console.log();
    console.log("  Language Mode Distribution:");
    for (const [k, v] of Object.entries(aggregateLanguageModes).sort((a, b) => b[1] - a[1])) {
        console.log(`    ${k}: ${v}`);
    }
    console.log("\n═══════════════════════════════════════════════════\n");
    console.log("  ⚠ All classifications are surface_detected advisory.");
    console.log("  No canonization occurred. canonApproved = false for all records.");
    console.log("═══════════════════════════════════════════════════");
}

main().catch(err => {
    console.error("v14.1B trial failed:", err);
    process.exit(1);
});