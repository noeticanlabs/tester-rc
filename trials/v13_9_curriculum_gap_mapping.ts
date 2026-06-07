// CohBit-Copilot v13.9 — Curriculum Gap Mapping
// Pipeline: Load gap findings → Search for matches → Classify → Report
//
// Operating law:
//   v13.9 may identify mapping relationships between internal Teaching KB modules
//   and external curriculum files. It may propose gap remediations. It may NOT
//   modify src/teaching.ts, create curriculum files, promote evidence, or claim
//   gaps are defects. All proposed actions require separate human authorization.
//
// Safe claim:
//   CohBit-Copilot v13.9 maps the 12 M0–M11 Teaching KB module gaps identified
//   in v13.7 against the external curriculum corpus and the First Principle Learning
//   module definitions. Each gap is classified as direct_match, partial_match,
//   requires_stub, requires_authoring, or deferred. No source files are modified.
//   All proposed actions are advisory only.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const V13_7_PATH = path.join(OUTPUT_DIR, 'v13_7_stable_candidate_review.json');
const CURRICULUM_ROOT = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\Doctrine curriuclum\\curriculum';
const VERSION = '13.9.0';

type GapClassification =
    | 'direct_match_found'
    | 'partial_match_found'
    | 'requires_external_module_stub'
    | 'requires_manual_authoring'
    | 'defer_no_clear_mapping';

interface GapMappingEntry {
    moduleNum: number;
    internalTopicKB: string;
    internalDoctrine: string;
    externalMatch: string | null;
    matchConfidence: number; // 0-1
    classification: GapClassification;
    recommendedAction: string;
    evidenceCeiling: string;
    reviewStatus: 'pending_human_review';
    applyStatus: 'not_applied';
}

interface GapMappingReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    priorV13_7Id: string;
    summary: {
        totalGaps: number;
        directMatch: number;
        partialMatch: number;
        requiresStub: number;
        requiresAuthoring: number;
        deferred: number;
    };
    mappings: GapMappingEntry[];
    attestation: string;
}

function loadJSON(p: string): any {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

// ─── Internal Teaching KB (from src/teaching.ts TOPIC_KB) ────────

const TOPIC_KB_MODULES: { moduleNum: number; topic: string; doctrine: string }[] = [
    { moduleNum: 0, topic: 'module 0: code as state transition', doctrine: 'Code should first be understood as a proposed state transition, not as syntax.' },
    { moduleNum: 1, topic: 'module 1: python safe file tool', doctrine: 'A Python script that touches the filesystem is not just beginner code.' },
    { moduleNum: 2, topic: 'module 2: typescript receipt validator', doctrine: 'A receipt is not just data — it is typed, schema-enforced evidence.' },
    { moduleNum: 3, topic: 'module 3: secure coding and cia lab', doctrine: 'Confidentiality, Integrity, and Availability are concrete constraints on every state transition.' },
    { moduleNum: 4, topic: 'module 4: sql persistence, audit tables, and rollback', doctrine: 'Database state is persistent, shared, and consequential.' },
    { moduleNum: 5, topic: 'module 5: resource-aware and constrained computing', doctrine: 'Every computation consumes resources. Ungoverned resource consumption is a DoS vulnerability.' },
    { moduleNum: 6, topic: 'module 6: governed apis, tool calls, and automation', doctrine: 'An API call is not a free action — it is a governed transition across a trust boundary.' },
    { moduleNum: 7, topic: 'module 7: multi-language transition interoperability', doctrine: 'Data crossing a language boundary must preserve meaning, type, and trust.' },
    { moduleNum: 8, topic: 'module 8: rust high-integrity verifier', doctrine: 'Rust ownership model enforces memory safety at compile time.' },
    { moduleNum: 9, topic: 'module 9: lean proof obligations and ctrl theorem repair', doctrine: 'Formal verification proves that code satisfies its specification for all possible inputs.' },
    { moduleNum: 10, topic: 'module 10: formal-to-runtime bridge and atlas memory', doctrine: 'A verified specification is valuable. Verified code extracted from that specification is more valuable.' },
    { moduleNum: 11, topic: 'module 11: cicd gates, release discipline, and governed packages', doctrine: 'A release is not a build artifact — it is a governed transition.' },
];

// ─── External Curriculum File Scanner ─────────────────────────────

function walkDir(dir: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dir)) return results;
    const stack = [dir];
    while (stack.length > 0) {
        const current = stack.pop()!;
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(current, { withFileTypes: true }); }
        catch { continue; }
        for (const e of entries) {
            const full = path.join(current, e.name);
            if (e.name.startsWith('.') || e.name === 'node_modules') continue;
            if (e.isDirectory()) { stack.push(full); }
            else { results.push(full); }
        }
    }
    return results;
}

function readFileSafe(absPath: string): string | null {
    try {
        const text = fs.readFileSync(absPath, 'utf-8');
        return text.trim() || null;
    } catch { return null; }
}

function computeSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let intersection = 0;
    for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
    return intersection / Math.max(wordsA.size, wordsB.size);
}

function classifyMatch(similarity: number, hasExplicitModuleFile: boolean): GapClassification {
    if (hasExplicitModuleFile && similarity > 0.5) return 'direct_match_found';
    if (hasExplicitModuleFile && similarity > 0.2) return 'partial_match_found';
    if (similarity > 0.15) return 'partial_match_found';
    if (similarity > 0) return 'requires_external_module_stub';
    return 'requires_manual_authoring';
}

// ─── Main ─────────────────────────────────────────────────────────

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v13.9 — Curriculum Gap Mapping');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    const v13_7 = loadJSON(V13_7_PATH);
    const gapFindings = v13_7.findings.filter((f: any) => f.classification === 'gap_requires_mapping');
    console.log(`  Loaded ${gapFindings.length} gap findings from v13.7`);
    console.log('');

    // Scan external curriculum for module files
    console.log('═══ Scanning External Curriculum ═══\n');
    const allFiles = walkDir(CURRICULUM_ROOT);
    const fpDir = path.join(CURRICULUM_ROOT, 'First principle learning');
    const fpFiles = allFiles.filter(f => f.startsWith(fpDir)).filter(f => f.endsWith('.txt') || f.endsWith('.md') || f.endsWith('.jsonl') || f.endsWith('.json'));
    console.log(`  First Principle Learning files: ${fpFiles.length}`);
    console.log('');

    // Build a map of Module N file paths
    const moduleFiles = new Map<number, string>();
    for (const fp of fpFiles) {
        const basename = path.basename(fp, path.extname(fp)).toLowerCase();
        const m = basename.match(/module\s*(\d+)/i);
        if (m) {
            const num = parseInt(m[1]);
            if (!moduleFiles.has(num)) moduleFiles.set(num, fp);
        }
    }

    const mappings: GapMappingEntry[] = [];

    for (const mod of TOPIC_KB_MODULES) {
        const externalPath = moduleFiles.get(mod.moduleNum);
        const hasExplicitModuleFile = !!externalPath;

        let externalContent: string | null = null;
        let similarity = 0;
        let externalMatch: string | null = null;

        if (externalPath) {
            externalContent = readFileSafe(externalPath);
            if (externalContent) {
                externalMatch = path.relative(CURRICULUM_ROOT, externalPath);
                // Compare first lines for doctrine similarity
                const externalFirstLine = externalContent.split('\n')[0].trim();
                const internalFirstBase = mod.doctrine.split('.')[0].trim();
                similarity = computeSimilarity(externalFirstLine, internalFirstBase);
            }
        } else {
            // Try to find a partial match from any curriculum file
            let bestSim = 0;
            let bestFile: string | null = null;
            const keywords = mod.topic.toLowerCase().replace(/module \d+: /, '').split(/\s+/).filter(w => w.length > 3);
            for (const fp of fpFiles) {
                const content = readFileSafe(fp);
                if (!content) continue;
                const firstLine = content.split('\n')[0].trim().toLowerCase();
                const kwMatches = keywords.filter(kw => firstLine.includes(kw)).length;
                const sim = kwMatches / Math.max(keywords.length, 1);
                if (sim > bestSim) { bestSim = sim; bestFile = fp; }
            }
            similarity = bestSim;
            if (bestFile) externalMatch = path.relative(CURRICULUM_ROOT, bestFile);
        }

        const classification = classifyMatch(similarity, hasExplicitModuleFile);

        let recommendedAction: string;
        switch (classification) {
            case 'direct_match_found':
                recommendedAction = 'Document the existing mapping. Gap may be closed after human review confirms content alignment.';
                break;
            case 'partial_match_found':
                recommendedAction = 'Review the partial match. If content is sufficient, document the mapping. If not, create an explicit module stub file.';
                break;
            case 'requires_external_module_stub':
                recommendedAction = `Create a stub file for Module ${mod.moduleNum} in the curriculum corpus with the internal TOPIC_KB doctrine as the starting point.`;
                break;
            case 'requires_manual_authoring':
                recommendedAction = `Module ${mod.moduleNum} has no clear external counterpart. Human author must create the curriculum module file from scratch or document why the internal-only module is sufficient.`;
                break;
            default:
                recommendedAction = 'Deferred. Requires further investigation.';
        }

        mappings.push({
            moduleNum: mod.moduleNum,
            internalTopicKB: mod.topic,
            internalDoctrine: mod.doctrine.slice(0, 120),
            externalMatch,
            matchConfidence: similarity,
            classification,
            recommendedAction,
            evidenceCeiling: 'corpus_extracted',
            reviewStatus: 'pending_human_review',
            applyStatus: 'not_applied',
        });
    }

    // Tally
    const tally: Record<string, number> = {};
    for (const m of mappings) tally[m.classification] = (tally[m.classification] || 0) + 1;
    console.log('═══ Gap Classification Results ═══\n');
    for (const [c, n] of Object.entries(tally).sort()) {
        console.log(`  ${c}: ${n}`);
    }
    console.log('');

    // ─── Report ───────────────────────────────────────────────────

    const receiptId = `GM_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const receipt: GapMappingReceipt = {
        receiptId, version: VERSION,
        pipeline: 'v13.9 — Curriculum Gap Mapping',
        generatedAt: new Date().toISOString(),
        priorV13_7Id: v13_7.receiptId,
        summary: {
            totalGaps: mappings.length,
            directMatch: tally['direct_match_found'] || 0,
            partialMatch: tally['partial_match_found'] || 0,
            requiresStub: tally['requires_external_module_stub'] || 0,
            requiresAuthoring: tally['requires_manual_authoring'] || 0,
            deferred: tally['defer_no_clear_mapping'] || 0,
        },
        mappings,
        attestation:
            'CohBit-Copilot v13.9 maps 12 M0-M11 Teaching KB module gaps against the external curriculum corpus. ' +
            'Each gap is classified by match quality and receives an advisory recommended action. No source files are modified. ' +
            'No curriculum files are created. All proposed actions require separate human authorization. Evidence remains capped at corpus_extracted.',
    };

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonPath = path.join(OUTPUT_DIR, 'v13_9_curriculum_gap_mapping.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  JSON report:  ${jsonPath}`);

    // Markdown
    const md: string[] = [];
    md.push('# CohBit-Copilot v13.9 — Curriculum Gap Mapping');
    md.push('');
    md.push(`**Receipt ID:** \`${receipt.receiptId}\``);
    md.push(`**Generated:** ${receipt.generatedAt}`);
    md.push(`**Version:** ${receipt.version}`);
    md.push(`**Prior v13.7:** \`${receipt.priorV13_7Id}\``);
    md.push('');
    md.push('---');
    md.push('');
    md.push('## Safe Claim');
    md.push('');
    md.push('> CohBit-Copilot v13.9 maps the 12 M0–M11 Teaching KB module gaps');
    md.push('> identified in v13.7 against the external curriculum corpus. Each gap');
    md.push('> is classified by match quality and receives an advisory recommended');
    md.push('> action. No source files are modified. No curriculum files are created.');
    md.push('> All proposed actions require separate human authorization.');
    md.push('');
    md.push('---');
    md.push('');
    md.push('## Summary');
    md.push('');
    md.push(`| Classification | Count |`);
    md.push(`|----------------|-------|`);
    md.push(`| direct_match_found | ${receipt.summary.directMatch} |`);
    md.push(`| partial_match_found | ${receipt.summary.partialMatch} |`);
    md.push(`| requires_external_module_stub | ${receipt.summary.requiresStub} |`);
    md.push(`| requires_manual_authoring | ${receipt.summary.requiresAuthoring} |`);
    md.push(`| defer_no_clear_mapping | ${receipt.summary.deferred} |`);
    md.push('');
    md.push('---');
    md.push('');
    md.push('## M0–M11 Gap Mappings');
    md.push('');

    for (const m of mappings) {
        md.push(`### Module ${m.moduleNum}`);
        md.push('');
        md.push(`| Field | Value |`);
        md.push(`|-------|-------|`);
        md.push(`| Internal TOPIC_KB | ${m.internalTopicKB} |`);
        md.push(`| Internal doctrine | ${m.internalDoctrine}... |`);
        md.push(`| External match | \`${m.externalMatch || 'none'}\` |`);
        md.push(`| Match confidence | ${m.matchConfidence.toFixed(2)} |`);
        md.push(`| Classification | **\`${m.classification}\`** |`);
        md.push(`| Recommended action | ${m.recommendedAction} |`);
        md.push(`| Review status | \`${m.reviewStatus}\` |`);
        md.push(`| Apply status | \`${m.applyStatus}\` |`);
        md.push(`| Evidence ceiling | \`${m.evidenceCeiling}\` |`);
        md.push('');
    }

    md.push('---');
    md.push('');
    md.push('## Attestation');
    md.push('');
    md.push(receipt.attestation);
    md.push('');
    md.push('---');
    md.push('');
    md.push(`*Generated by CohBit-Copilot v13.9 Curriculum Gap Mapping Pipeline*`);
    md.push(`*Receipt ID: ${receipt.receiptId}*`);

    const mdPath = path.join(OUTPUT_DIR, 'v13_9_curriculum_gap_mapping.md');
    fs.writeFileSync(mdPath, md.join('\n'), 'utf-8');
    console.log(`  MD report:    ${mdPath}`);
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('  Pipeline Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log(`  direct_match_found:               ${tally['direct_match_found'] || 0}`);
    console.log(`  partial_match_found:               ${tally['partial_match_found'] || 0}`);
    console.log(`  requires_external_module_stub:     ${tally['requires_external_module_stub'] || 0}`);
    console.log(`  requires_manual_authoring:         ${tally['requires_manual_authoring'] || 0}`);
    console.log(`  defer_no_clear_mapping:            ${tally['defer_no_clear_mapping'] || 0}`);
    console.log('');
    console.log('  ⚠ No source files were modified.');
    console.log('  ⚠ All actions require separate human authorization.');
    console.log('  ⚠ Evidence ceiling: corpus_extracted (unchanged)');
    console.log('');
    console.log(`  Reports: ${mdPath}`);
    console.log(`           ${jsonPath}`);
}

main();