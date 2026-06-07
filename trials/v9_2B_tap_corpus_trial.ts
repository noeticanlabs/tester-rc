// CohBit-Copilot v9.2B — TAP Corpus Ingestion Trial
// Runs the full v9.2A summary pipeline against The Admissible Path (TAP)
// framework corpus. Verifies that the system correctly processes its own
// source material — canonical definitions, pillar text, and structured
// JSON schemas — through all 5 audience modes.
//
// This is the "eat your own dogfood" test:
//   The framework that defines admissible language governance
//   is itself processed by that governance system.
//
// Phases:
//   1. Ingestion — read all .txt and .json files from TAP directory
//   2. Graph construction — transform to TLT nodes + edges
//   3. Summary generation — all 5 modes
//   4. Canon self-consistency — internal terms, claim strength, limitations
//   5. Receipt — trial stats and checks
//
// Operating law:
//   Voice may explain graph state. Voice may not upgrade graph state.
//   Public language must inherit evidence limits from the graph.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { transformToTltGraph, buildTltEdges } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import { resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { resetViolationCounter } from '../packages/tlt-atlas/src/T_claim_guard.js';
import { resetLeakCounter } from '../packages/tlt-atlas/src/T_public_internal_boundary.js';
import {
    generateAllSummaries,
    renderSummaryToText,
    isSummarySafeForAudience,
    type SummaryMode,
    type EvidenceAwareSummary,
} from '../packages/tlt-atlas/src/T_summary_generator.js';

// ─── Configuration ──────────────────────────────────────────────

const TAP_DIR = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\TAP';
const MAX_FILE_BYTES = 500_000; // 500KB per file max
const TEXT_EXTENSIONS = new Set(['.txt', '.md']);
const JSON_EXTENSIONS = new Set(['.json']);

interface FixtureArtifact {
    path: string;
    language: string;
    text: string;
}

// ─── Phase 1: Ingestion ─────────────────────────────────────────

function ingestTapDirectory(): { artifacts: FixtureArtifact[]; skipped: string[]; errors: string[] } {
    const artifacts: FixtureArtifact[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    const entries = fs.readdirSync(TAP_DIR);

    for (const entry of entries) {
        const fullPath = path.join(TAP_DIR, entry);
        const ext = path.extname(entry).toLowerCase();

        // Skip non-text/non-json files
        if (!TEXT_EXTENSIONS.has(ext) && !JSON_EXTENSIONS.has(ext)) {
            skipped.push(`${entry} (non-text extension: ${ext})`);
            continue;
        }

        // Skip training data files
        if (entry.includes('.jsonl') || entry.includes('training') || entry.includes('machine')) {
            skipped.push(`${entry} (training data)`);
            continue;
        }

        try {
            const stat = fs.statSync(fullPath);
            if (!stat.isFile()) {
                skipped.push(`${entry} (not a file)`);
                continue;
            }
            if (stat.size > MAX_FILE_BYTES) {
                skipped.push(`${entry} (too large: ${stat.size} bytes)`);
                continue;
            }

            const text = fs.readFileSync(fullPath, 'utf-8');
            if (text.trim().length === 0) {
                skipped.push(`${entry} (empty)`);
                continue;
            }

            const language = ext === '.json' ? 'json' : 'markdown';
            artifacts.push({ path: fullPath, language, text });
        } catch (err: any) {
            errors.push(`${entry}: ${err.message}`);
        }
    }

    return { artifacts, skipped, errors };
}

// ─── v9.2A Strong Verb Refinement Helpers ───────────────────────

const STRONG_REGEX = /\b(?<![\w-])(verified|proven|guaranteed|certified|production-ready)(?![\w-])\b/i;
const QUOTED_REGEX = /'verified'|'proven'|'guaranteed'|'certified'|'production-ready'/gi;
const LIMITATION_PHRASE_REGEX = /\b(not\s+(?:yet\s+)?(?:AST-)?(?:verified|proven|guaranteed|certified)|requires?\s+(?:AST-)?(?:verif|proof|guarantee)|lack(?:s|ing|ed)?\s+verif|without\s+verif|no\s+(?:formal\s+)?(?:verif|proof|guarantee)|pending\s+verif|absence\s+of\s+verif|has\s+not\s+been\s+(?:verified|proven|guaranteed))\b/i;

function hasDeclarativeStrongVerb(body: string): boolean {
    let clean = body.replace(/^  \w+:.+$/gm, '');
    clean = clean.replace(QUOTED_REGEX, '[verb]');
    clean = clean.replace(LIMITATION_PHRASE_REGEX, '[limitation]');
    return STRONG_REGEX.test(clean);
}

// ─── Internal Terms Detection ───────────────────────────────────

const INTERNAL_TERMS = ['CohBit', 'CTRL', 'PhaseLoom', 'Coh-GMI', 'Coh primitive', 'Noetican', 'Admissible Path'];

function countInternalTerms(text: string): string[] {
    return INTERNAL_TERMS.filter(t => text.includes(t));
}

// ─── Main Trial ─────────────────────────────────────────────────

function main() {
    console.log('=== CohBit-Copilot v9.2B — TAP Corpus Ingestion Trial ===\n');
    console.log(`Source: ${TAP_DIR}\n`);

    // ─── Phase 1: Ingestion ────────────────────────────────────
    resetViolationCounter();
    resetLeakCounter();
    resetVoiceCounter();

    const { artifacts, skipped, errors } = ingestTapDirectory();

    console.log('── PHASE 1: INGESTION ──');
    console.log(`  Files read: ${artifacts.length}`);
    console.log(`  Skipped: ${skipped.length}`);
    console.log(`  Errors: ${errors.length}`);
    for (const s of skipped.slice(0, 5)) console.log(`    skip: ${s}`);
    if (skipped.length > 5) console.log(`    ... and ${skipped.length - 5} more`);
    for (const e of errors) console.log(`    error: ${e}`);

    // ─── Phase 2: Graph Construction ───────────────────────────
    console.log('\n── PHASE 2: GRAPH CONSTRUCTION ──');

    const result = transformToTltGraph(artifacts);
    const edges = buildTltEdges(result.nodes);
    result.edges.length = 0;
    for (const e of edges) result.edges.push(e);

    const nodeTypes = new Map<string, number>();
    for (const n of result.nodes) {
        nodeTypes.set(n.nodeType, (nodeTypes.get(n.nodeType) || 0) + 1);
    }

    console.log(`  Total nodes: ${result.summary.totalNodes}`);
    console.log(`  Total edges: ${result.edges.length}`);
    console.log(`  Artifacts processed: ${result.artifactsProcessed}`);
    console.log('  Node type breakdown:');
    for (const [type, count] of nodeTypes) {
        console.log(`    ${type}: ${count}`);
    }

    // ─── Phase 3: Summary Generation ───────────────────────────
    console.log('\n── PHASE 3: SUMMARY GENERATION ──');

    const summaries = generateAllSummaries(result);
    const modes: SummaryMode[] = ['internal', 'public', 'technical', 'linkedin', 'reviewer'];

    for (const mode of modes) {
        const s = summaries[mode];
        console.log(`  ${s.modeLabel}:`);
        console.log(`    Sections: ${s.sections.length} | Warnings: ${s.totalWarnings} | Downgrades: ${s.downgradeCount} | Limitations: ${s.limitationCount}`);
        console.log(`    Canon-safe: ${s.canonSafe ? 'yes' : 'NO'} | Safe for audience: ${isSummarySafeForAudience(s, mode) ? 'yes' : 'no'}`);
        for (const sec of s.sections) {
            const dg = sec.downgradedVerbs.length > 0 ? ` [downgraded: ${sec.downgradedVerbs.join(', ')}]` : '';
            console.log(`      ${sec.header}${dg}`);
        }
    }

    // ─── Phase 4: Canon Self-Consistency Checks ────────────────
    console.log('\n── PHASE 4: CANON SELF-CONSISTENCY ──');

    const checks: { label: string; passed: boolean }[] = [];

    // CHECK 1: All readable files ingested without error
    const c1 = artifacts.length >= 10 && errors.length === 0;
    const chk1 = { label: 'CHECK 1: All readable TAP files ingested (>=10 artifacts, 0 errors)', passed: c1 };
    checks.push(chk1);
    console.log(c1 ? '  ✓' : '  ⚠', chk1.label);

    // CHECK 2: Graph contains multiple node categories
    const c2 = nodeTypes.size >= 3;
    const chk2 = { label: `CHECK 2: Graph contains >=3 node types (actual: ${nodeTypes.size})`, passed: c2 };
    checks.push(chk2);
    console.log(c2 ? '  ✓' : '  ⚠', chk2.label);

    // CHECK 3: Graph nodes capture internal Noetican terminology from source
    // Voice output is advisory, not source reprints. Check source text in graph nodes instead.
    const sourceInternalsFound = new Set<string>();
    for (const n of result.nodes) {
        for (const term of INTERNAL_TERMS) {
            if (n.matchedText && n.matchedText.includes(term)) {
                sourceInternalsFound.add(term);
            }
        }
    }
    const c3 = sourceInternalsFound.size >= 2;
    const chk3 = { label: `CHECK 3: Source graph nodes contain internal terms (found: ${[...sourceInternalsFound].join(', ') || 'none'})`, passed: c3 };
    checks.push(chk3);
    console.log(c3 ? '  ✓' : '  ⚠', chk3.label);

    // CHECK 4: LinkedIn mode suppresses claim strength mismatches (diagnostic content)
    // Internal mode has Claim Strength Mismatches section; LinkedIn mode does not
    const intHasMismatch = summaries.internal.sections.some(s => s.header.includes('Claim Strength Mismatch'));
    const liHasMismatch = summaries.linkedin.sections.some(s => s.header.includes('Claim Strength Mismatch'));
    const c4 = intHasMismatch && !liHasMismatch;
    const chk4 = { label: `CHECK 4: LinkedIn mode suppresses claim strength mismatches (internal has: ${intHasMismatch}, linkedin has: ${liHasMismatch})`, passed: c4 };
    checks.push(chk4);
    console.log(c4 ? '  ✓' : '  ⚠', chk4.label);

    // CHECK 5: Limitations section populated by auto-extraction
    const c5 = summaries.linkedin.limitationCount > 0 && summaries.public.limitationCount > 0;
    const chk5 = { label: `CHECK 5: Limitations auto-extracted (linkedin: ${summaries.linkedin.limitationCount}, public: ${summaries.public.limitationCount})`, passed: c5 };
    checks.push(chk5);
    console.log(c5 ? '  ✓' : '  ⚠', chk5.label);

    // CHECK 6: Canon safety passes for all 5 modes
    const c6 = summaries.internal.canonSafe && summaries.public.canonSafe
        && summaries.linkedin.canonSafe && summaries.technical.canonSafe
        && summaries.reviewer.canonSafe;
    const chk6 = { label: 'CHECK 6: All 5 summary modes pass canon safety', passed: c6 };
    checks.push(chk6);
    console.log(c6 ? '  ✓' : '  ⚠', chk6.label);

    // CHECK 7: v9.2A — hyphenated limitation phrases do not trigger false positive
    // Check that Limitations section body text (which contains "not AST-verified")
    // does not trigger the declarative strong-verb check
    const limSection = summaries.linkedin.sections.find(s => s.header.includes('Limitations'));
    const c7 = limSection ? !hasDeclarativeStrongVerb(limSection.body) : true;
    const chk7 = { label: 'CHECK 7 (v9.2A): Hyphenated limitation phrases exempt from strong-verb filter', passed: c7 };
    checks.push(chk7);
    console.log(c7 ? '  ✓' : '  ⚠', chk7.label);

    // CHECK 8: LinkedIn non-Limitations sections have no declarative strong verbs
    let linkedinHasStrong = false;
    for (const sec of summaries.linkedin.sections) {
        if (sec.header.includes('Limitations')) continue;
        if (hasDeclarativeStrongVerb(sec.body)) { linkedinHasStrong = true; break; }
    }
    const c8 = !linkedinHasStrong;
    const chk8 = { label: 'CHECK 8 (v9.2A): LinkedIn non-Limitations sections have zero declarative strong verbs', passed: c8 };
    checks.push(chk8);
    console.log(c8 ? '  ✓' : '  ⚠', chk8.label);

    // CHECK 9: LinkedIn safe for public audience
    const c9 = isSummarySafeForAudience(summaries.linkedin, 'public');
    const chk9 = { label: 'CHECK 9: LinkedIn summary safe for public audience', passed: c9 };
    checks.push(chk9);
    console.log(c9 ? '  ✓' : '  ⚠', chk9.label);

    // CHECK 10: No crash/exception — if we reached here, this passes
    const c10 = true;
    const chk10 = { label: 'CHECK 10: Full pipeline completed without crash', passed: c10 };
    checks.push(chk10);
    console.log(c10 ? '  ✓' : '  ⚠', chk10.label);

    // ─── Phase 5: Trial Receipt ─────────────────────────────────
    console.log('\n── PHASE 5: TRIAL RECEIPT ──');

    const receipt = {
        trial: 'v9.2B',
        description: 'TAP Corpus Ingestion — Admissible Path framework processed through v9.2A summary pipeline',
        sourceDirectory: TAP_DIR,
        generatedAt: new Date().toISOString(),
        ingestion: {
            filesRead: artifacts.length,
            filesSkipped: skipped.length,
            fileErrors: errors.length,
            skippedSamples: skipped.slice(0, 10),
        },
        graph: {
            totalNodes: result.summary.totalNodes,
            totalEdges: result.edges.length,
            artifactsProcessed: result.artifactsProcessed,
            nodeTypeBreakdown: Object.fromEntries(nodeTypes),
        },
        summaries: {} as Record<string, any>,
        checks: {
            total: checks.length,
            passed: checks.filter(c => c.passed).length,
            details: checks,
        },
    };

    for (const mode of modes) {
        const s = summaries[mode];
        receipt.summaries[mode] = {
            modeLabel: s.modeLabel,
            sections: s.sections.length,
            warnings: s.totalWarnings,
            downgrades: s.downgradeCount,
            limitations: s.limitationCount,
            canonSafe: s.canonSafe,
            safeForAudience: isSummarySafeForAudience(s, mode),
            sectionHeaders: s.sections.map(sec => sec.header),
        };
    }

    console.log(JSON.stringify(receipt, null, 2));

    // ─── Final Summary ──────────────────────────────────────────
    const passed = checks.filter(c => c.passed).length;
    console.log(`\n═══ VERIFICATION SUMMARY ═══`);
    console.log(`${passed}/${checks.length} checks passed.`);
    console.log(passed === checks.length
        ? '\n✓ v9.2B TAP CORPUS INGESTION TRIAL PASSED.'
        : '\n⚠ Some checks failed.');

    // ─── LinkedIn Summary Sample ────────────────────────────────
    console.log('\n── SAMPLE: LinkedIn-Safe Summary (first 800 chars) ──');
    console.log(renderSummaryToText(summaries.linkedin).substring(0, 800));
    console.log('...(truncated)');
}

try {
    main();
} catch (err) {
    console.error('v9.2B trial failed:', err);
    process.exit(1);
}