// CohBit-Copilot v13.5 — Curriculum Reobservation + Drift Check
// Pipeline: Re-ingest → Load Prior → Cross-Check → Delta Analysis →
//   Promote Stable to Reobserved → Report
//
// Operating law:
//   Reobservation confirms cross-run stability of an observation.
//   It does NOT verify correctness, upgrade evidence beyond corpus_extracted,
//   promote canon, or modify the Teaching KB.
//
// Safe claim:
//   CohBit-Copilot v13.5 re-ingests the external curriculum corpus, compares
//   results against the v13.4 first-observation baseline, promotes hash-stable
//   files to reobserved status, and separately reports content drift (changed
//   hashes), missing files, new files, and cross-check finding deltas.
//   Reobserved status confirms cross-run stability of the observation — it
//   does not verify correctness, upgrade evidence, modify canon, or update
//   the Teaching KB. All evidence remains capped at corpus_extracted.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Constants ────────────────────────────────────────────────────

const CURRICULUM_ROOT =
    'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\Doctrine curriuclum\\curriculum';
const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const PRIOR_REPORT_PATH = path.join(OUTPUT_DIR, 'v13_4_curriculum_review.json');
const VERSION = '13.5.0';

// ─── Types (reused from v13.4 + new delta types) ──────────────────

type CorpusFamily =
    | 'FirstPrincipleLearning' | 'NoeticanCode' | 'Mathematics'
    | 'Language' | 'History' | 'Unknown';

type CrossCheckResult =
    | 'match' | 'close_analogue' | 'stale_mapping' | 'gap' | 'conflict';

type AdmissionStatus =
    | 'first_observation' | 'reobserved' | 'stable_candidate'
    | 'admitted_learning_record' | 'refused';

type EvidenceLevel =
    | 'none' | 'surface_detected' | 'corpus_extracted'
    | 'cross_run_stable' | 'verified';

interface IngestedFile {
    sourceFile: string;
    relativePath: string;
    corpusFamily: CorpusFamily;
    contentHash: string;
    sizeBytes: number;
    lineCount: number;
    extension: string;
}

interface CrossCheckFinding {
    id: string;
    sourceFile: string;
    corpusFamily: CorpusFamily;
    crossCheckType: CrossCheckResult;
    matchedInternalModule: string | null;
    externalContent: string;
    internalContent: string | null;
    description: string;
    matchedInternalLayer: string | null;
}

interface LearningAdmission {
    eventId: string;
    sourceFile: string;
    corpusFamily: CorpusFamily;
    contentHash: string;
    matchedInternalModule: string | null;
    classification: CorpusFamily;
    evidenceCeiling: EvidenceLevel;
    admissionStatus: AdmissionStatus;
    refusalReason: string | null;
    crossCheckType: CrossCheckResult | null;
    nextVerificationStep: string;
    limitations: string[];
    classifiedBy: string;
    classificationTimestamp: string;
}

interface PriorReviewReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    summary: {
        totalFilesIngested: number;
        filesByFamily: Record<string, number>;
        crossCheckFindings: {
            match: number; close_analogue: number; stale_mapping: number;
            gap: number; conflict: number;
        };
        admissions: {
            first_observation: number; reobserved: number; stable_candidate: number;
            admitted_learning_record: number; refused: number;
        };
        attestation: string;
    };
    ingestedFiles: IngestedFile[];
    crossCheckFindings: CrossCheckFinding[];
    learningAdmissions: LearningAdmission[];
}

// ─── New v13.5 Types ──────────────────────────────────────────────

interface FindingDelta {
    sourceFile: string;
    priorType: CrossCheckResult | null;
    currentType: CrossCheckResult | null;
    delta: 'appeared' | 'disappeared' | 'unchanged' | 'changed_type';
}

interface ReobservationDelta {
    stableCount: number;
    changedCount: number;
    newCount: number;
    missingCount: number;
    changedHashes: { relativePath: string; priorHash: string; currentHash: string }[];
    missingFiles: string[];
    newFiles: string[];
    findingDeltas: FindingDelta[];
}

interface ReobservationReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    priorReportId: string;
    priorReportGeneratedAt: string;
    summary: {
        totalFilesIngested: number;
        filesByFamily: Record<string, number>;
        delta: {
            stable: number;
            changed: number;
            new: number;
            missing: number;
        };
        crossCheckFindings: {
            match: number; close_analogue: number; stale_mapping: number;
            gap: number; conflict: number;
        };
        findingDeltas: {
            appeared: number; disappeared: number; unchanged: number; changed_type: number;
        };
        admissions: {
            first_observation: number; reobserved: number;
            stable_candidate: number; admitted_learning_record: number; refused: number;
        };
        attestation: string;
    };
    delta: ReobservationDelta;
    ingestedFiles: IngestedFile[];
    crossCheckFindings: CrossCheckFinding[];
    learningAdmissions: LearningAdmission[];
}

// ─── Phase 1: Re-Ingest (identical to v13.4) ──────────────────────

function classifyCorpusFamily(relPath: string): CorpusFamily {
    const lower = relPath.toLowerCase();
    if (lower.includes('first principle learning') || lower.includes('first principle')) return 'FirstPrincipleLearning';
    if (lower.includes('noetican code') || lower.includes('noetican')) return 'NoeticanCode';
    if (lower.includes('mathematics') || lower.includes('math')) return 'Mathematics';
    if (lower.includes('language') || lower.includes('bilingual')) return 'Language';
    if (lower.includes('history')) return 'History';
    return 'Unknown';
}

function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex').slice(0, 16);
}

function walkDirectory(dir: string, baseDir: string): { relativePath: string; absolutePath: string }[] {
    const results: { relativePath: string; absolutePath: string }[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const abs = path.join(dir, entry.name);
        const rel = path.relative(baseDir, abs);
        if (entry.isDirectory()) {
            results.push(...walkDirectory(abs, baseDir));
        } else if (entry.isFile()) {
            results.push({ relativePath: rel, absolutePath: abs });
        }
    }
    return results;
}

function safeReadFile(absPath: string): string | null {
    try {
        const text = fs.readFileSync(absPath, 'utf-8');
        if (!text.trim()) return null;
        return text;
    } catch {
        return null;
    }
}

function phase1_ingest(): { ingested: IngestedFile[]; skipped: string[] } {
    console.log('═══ Phase 1: Re-Ingest Corpus ═══\n');

    const ingested: IngestedFile[] = [];
    const skipped: string[] = [];
    const files = walkDirectory(CURRICULUM_ROOT, CURRICULUM_ROOT);

    for (const file of files) {
        const ext = path.extname(file.relativePath).toLowerCase();
        if (['.zip', '.png', '.jpg', '.gif', '.pdf', '.exe', '.dll', '.so', '.o'].includes(ext)) {
            skipped.push(`${file.relativePath} (binary/archive)`);
            continue;
        }
        const content = safeReadFile(file.absolutePath);
        if (content === null) {
            skipped.push(`${file.relativePath} (unreadable or empty)`);
            continue;
        }
        const contentHash = hashContent(content);
        const corpusFamily = classifyCorpusFamily(file.relativePath);
        ingested.push({
            sourceFile: path.basename(file.relativePath),
            relativePath: file.relativePath,
            corpusFamily,
            contentHash,
            sizeBytes: Buffer.byteLength(content, 'utf-8'),
            lineCount: content.split('\n').length,
            extension: ext,
        });
    }

    const byFamily: Record<string, number> = {};
    for (const f of ingested) byFamily[f.corpusFamily] = (byFamily[f.corpusFamily] || 0) + 1;

    console.log(`  Files ingested: ${ingested.length}`);
    console.log(`  Files skipped:  ${skipped.length}`);
    for (const [family, count] of Object.entries(byFamily).sort()) {
        console.log(`    ${family}: ${count}`);
    }
    console.log('');
    return { ingested, skipped };
}

// ─── Phase 1.5: Load Prior Report ─────────────────────────────────

function phase1_5_loadPrior(): PriorReviewReceipt {
    console.log('═══ Phase 1.5: Load Prior v13.4 Report ═══\n');

    if (!fs.existsSync(PRIOR_REPORT_PATH)) {
        throw new Error(`Prior report not found at: ${PRIOR_REPORT_PATH}. Run v13.4 first.`);
    }

    const raw = fs.readFileSync(PRIOR_REPORT_PATH, 'utf-8');
    const prior: PriorReviewReceipt = JSON.parse(raw);

    console.log(`  Prior report ID: ${prior.receiptId}`);
    console.log(`  Prior generated: ${prior.generatedAt}`);
    console.log(`  Prior version:   ${prior.version}`);
    console.log(`  Prior files:     ${prior.summary.totalFilesIngested}`);
    console.log(`  Prior admissions: ${prior.learningAdmissions.length}`);
    console.log('');

    return prior;
}

// ─── Phase 2: Cross-Check (same as v13.4) ─────────────────────────

interface InternalState {
    codeAtlasLayers: string[];
    mathAtlasLayers: string[];
    resourceLayers: string[];
    toolingLayers: string[];
    tltAtlasLayers: string[];
    topicKBModules: Map<string, { topic: string; doctrine: string }>;
}

function buildInternalState(): InternalState {
    const codeAtlasDir = path.join(process.cwd(), 'packages', 'code-atlas', 'src');
    const codeAtlasLayers = fs.existsSync(codeAtlasDir)
        ? fs.readdirSync(codeAtlasDir).filter(f => f.endsWith('.ts')).sort() : [];

    const mathAtlasDir = path.join(process.cwd(), 'packages', 'math-atlas', 'src');
    const mathAtlasLayers = fs.existsSync(mathAtlasDir)
        ? fs.readdirSync(mathAtlasDir).filter(f => f.endsWith('.ts')).sort() : [];

    const resourceDir = path.join(process.cwd(), 'packages', 'resource', 'src');
    const resourceLayers = fs.existsSync(resourceDir)
        ? fs.readdirSync(resourceDir).filter(f => f.endsWith('.ts')).sort() : [];

    const toolingDir = path.join(process.cwd(), 'packages', 'tooling', 'src');
    const toolingLayers = fs.existsSync(toolingDir)
        ? fs.readdirSync(toolingDir).filter(f => f.endsWith('.ts')).sort() : [];

    const tltAtlasDir = path.join(process.cwd(), 'packages', 'tlt-atlas', 'src');
    const tltAtlasLayers = fs.existsSync(tltAtlasDir)
        ? fs.readdirSync(tltAtlasDir).filter(f => f.endsWith('.ts')).sort() : [];

    const topicKBModules = new Map<string, { topic: string; doctrine: string }>();
    const knownModules = [
        { topic: 'module 0: code as state transition', doctrine: 'Code should first be understood as a proposed state transition, not as syntax.' },
        { topic: 'module 1: python safe file tool', doctrine: 'A Python script that touches the filesystem is not just beginner code.' },
        { topic: 'module 2: typescript receipt validator', doctrine: 'A receipt is not just data — it is typed, schema-enforced evidence.' },
        { topic: 'module 3: secure coding and cia lab', doctrine: 'Confidentiality, Integrity, and Availability are concrete constraints on every state transition.' },
        { topic: 'module 4: sql persistence, audit tables, and rollback', doctrine: 'Database state is persistent, shared, and consequential.' },
        { topic: 'module 5: resource-aware and constrained computing', doctrine: 'Every computation consumes resources. Ungoverned resource consumption is a DoS vulnerability.' },
        { topic: 'module 6: governed apis, tool calls, and automation', doctrine: 'An API call is not a free action — it is a governed transition across a trust boundary.' },
        { topic: 'module 7: multi-language transition interoperability', doctrine: 'Data crossing a language boundary must preserve meaning, type, and trust.' },
        { topic: 'module 8: rust high-integrity verifier', doctrine: 'Rust ownership model enforces memory safety at compile time.' },
        { topic: 'module 9: lean proof obligations and ctrl theorem repair', doctrine: 'Formal verification proves that code satisfies its specification for all possible inputs.' },
        { topic: 'module 10: formal-to-runtime bridge and atlas memory', doctrine: 'A verified specification is valuable. Verified code extracted from that specification is more valuable.' },
        { topic: 'module 11: cicd gates, release discipline, and governed packages', doctrine: 'A release is not a build artifact — it is a governed transition.' },
    ];
    for (const m of knownModules) topicKBModules.set(m.topic, m);

    return { codeAtlasLayers, mathAtlasLayers, resourceLayers, toolingLayers, tltAtlasLayers, topicKBModules };
}

function extractLayersFromName(fileName: string): string[] {
    const parts = fileName.split(/\s+/);
    return parts.filter(p => /^[vV]\d+[.]\d+/.test(p) || /^[LM]\d+/.test(p));
}

function compareAtlasVersions(externalLayers: string[], internalLayers: string[], _family: string): CrossCheckResult {
    if (internalLayers.length === 0) return 'gap';
    if (externalLayers.length === 0) return 'close_analogue';
    let matches = 0;
    for (const ext of externalLayers) {
        const extClean = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const intl of internalLayers) {
            const intlClean = intl.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (intlClean.includes(extClean) || extClean.includes(intlClean)) { matches++; break; }
        }
    }
    if (matches === 0) return 'stale_mapping';
    if (matches >= externalLayers.length * 0.5) return 'close_analogue';
    if (matches > 0) return 'stale_mapping';
    return 'gap';
}

function computeTextSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    let intersection = 0;
    for (const w of wordsA) { if (wordsB.has(w)) intersection++; }
    return intersection / Math.max(wordsA.size, wordsB.size);
}

function phase2_crossCheck(ingested: IngestedFile[], internal: InternalState): CrossCheckFinding[] {
    console.log('═══ Phase 2: Cross-Check Against Internal State ═══\n');

    const findings: CrossCheckFinding[] = [];
    let counter = 0;

    // Atlas cross-check
    const noeticanFiles = ingested.filter(f => f.corpusFamily === 'NoeticanCode');
    for (const file of noeticanFiles) {
        const name = file.sourceFile.toLowerCase();

        if (name.includes('code invariant atlas') || name.includes('code invariant')) {
            counter++;
            const extLayers = extractLayersFromName(name);
            const mt = compareAtlasVersions(extLayers, internal.codeAtlasLayers, 'code');
            findings.push({
                id: `CC_CODE_${counter}`, sourceFile: file.relativePath, corpusFamily: 'NoeticanCode',
                crossCheckType: mt, matchedInternalModule: 'packages/code-atlas', externalContent: file.sourceFile,
                internalContent: (mt === 'match' || mt === 'close_analogue') ? `packages/code-atlas layers: ${internal.codeAtlasLayers.join(', ')}` : null,
                description: `External Code Invariant Atlas version compared to internal code-atlas package. Result: ${mt}`,
                matchedInternalLayer: 'code-atlas',
            });
        }
        if (name.includes('multimodel mathematics') || name.includes('mathematics')) {
            counter++;
            const extLayers = extractLayersFromName(name);
            const mt = compareAtlasVersions(extLayers, internal.mathAtlasLayers, 'math');
            findings.push({
                id: `CC_MATH_${counter}`, sourceFile: file.relativePath, corpusFamily: 'NoeticanCode',
                crossCheckType: mt, matchedInternalModule: 'packages/math-atlas', externalContent: file.sourceFile,
                internalContent: (mt === 'match' || mt === 'close_analogue') ? `packages/math-atlas layers: ${internal.mathAtlasLayers.join(', ')}` : null,
                description: `External Mathematics atlas version compared to internal math-atlas package. Result: ${mt}`,
                matchedInternalLayer: 'math-atlas',
            });
        }
        if (name.includes('resource layer')) {
            counter++;
            const extLayers = extractLayersFromName(name);
            const mt = compareAtlasVersions(extLayers, internal.resourceLayers, 'resource');
            findings.push({
                id: `CC_RES_${counter}`, sourceFile: file.relativePath, corpusFamily: 'NoeticanCode',
                crossCheckType: mt, matchedInternalModule: 'packages/resource', externalContent: file.sourceFile,
                internalContent: (mt === 'match' || mt === 'close_analogue') ? `packages/resource layers: ${internal.resourceLayers.join(', ')}` : null,
                description: `External Resource Layer version compared to internal resource package. Result: ${mt}`,
                matchedInternalLayer: 'resource',
            });
        }
        if (name.includes('tooling layer')) {
            counter++;
            const extLayers = extractLayersFromName(name);
            const mt = compareAtlasVersions(extLayers, internal.toolingLayers, 'tooling');
            findings.push({
                id: `CC_TOOL_${counter}`, sourceFile: file.relativePath, corpusFamily: 'NoeticanCode',
                crossCheckType: mt, matchedInternalModule: 'packages/tooling', externalContent: file.sourceFile,
                internalContent: (mt === 'match' || mt === 'close_analogue') ? `packages/tooling layers: ${internal.toolingLayers.join(', ')}` : null,
                description: `External Tooling Layer version compared to internal tooling package. Result: ${mt}`,
                matchedInternalLayer: 'tooling',
            });
        }
        if (name.includes('bilingual atlas') || name.includes('bilingual')) {
            counter++;
            const extLayers = extractLayersFromName(name);
            const mt = compareAtlasVersions(extLayers, internal.tltAtlasLayers, 'tlt');
            findings.push({
                id: `CC_TLT_${counter}`, sourceFile: file.relativePath, corpusFamily: 'NoeticanCode',
                crossCheckType: mt, matchedInternalModule: 'packages/tlt-atlas', externalContent: file.sourceFile,
                internalContent: (mt === 'match' || mt === 'close_analogue') ? `packages/tlt-atlas layers: ${internal.tltAtlasLayers.join(', ')}` : null,
                description: `External Bilingual Atlas compared to internal tlt-atlas package. Result: ${mt}`,
                matchedInternalLayer: 'tlt-atlas',
            });
        }
        if (name.includes('layers') && !name.includes('atlas')) {
            counter++;
            findings.push({
                id: `CC_LAYERS_${counter}`, sourceFile: file.relativePath, corpusFamily: 'NoeticanCode',
                crossCheckType: 'close_analogue', matchedInternalModule: 'packages/*/src (all atlas packages)',
                externalContent: file.sourceFile, internalContent: 'Internal packages: code-atlas, math-atlas, resource, tooling, tlt-atlas',
                description: 'External layer structure documentation — analogous to internal package layer architecture',
                matchedInternalLayer: 'multi-package',
            });
        }
    }

    // Curriculum module cross-check
    const fpFiles = ingested.filter(f => f.corpusFamily === 'FirstPrincipleLearning');
    const moduleFiles = fpFiles.filter(f => {
        const n = f.sourceFile.toLowerCase();
        return n.includes('module') && /\d+/.test(n);
    });
    for (const file of moduleFiles) {
        const moduleMatch = file.sourceFile.match(/module\s*(\d+)/i);
        if (!moduleMatch) continue;
        const moduleNum = moduleMatch[1];
        const rawContent = safeReadFile(path.join(CURRICULUM_ROOT, file.relativePath));
        if (!rawContent) continue;
        const content: string = rawContent;
        const kbKey = `module ${moduleNum}:`;
        let kbEntry: { topic: string; doctrine: string } | undefined;
        for (const [key, val] of internal.topicKBModules.entries()) {
            if (key.toLowerCase().includes(kbKey)) { kbEntry = val; break; }
        }
        counter++;
        if (kbEntry) {
            const externalFirstLine = content.split('\n')[0].trim();
            const internalFirstLine = kbEntry.doctrine.split('.')[0].trim();
            const similarity = computeTextSimilarity(externalFirstLine, internalFirstLine);
            let matchType: CrossCheckResult;
            if (similarity > 0.7) matchType = 'match';
            else if (similarity > 0.3) matchType = 'close_analogue';
            else if (similarity > 0) matchType = 'stale_mapping';
            else matchType = 'conflict';
            findings.push({
                id: `CC_M${moduleNum}_${counter}`, sourceFile: file.relativePath, corpusFamily: 'FirstPrincipleLearning',
                crossCheckType: matchType, matchedInternalModule: `src/teaching.ts → TOPIC_KB[${kbEntry.topic}]`,
                externalContent: externalFirstLine.slice(0, 200), internalContent: kbEntry.doctrine.slice(0, 200),
                description: `Module ${moduleNum}: external vs internal doctrine comparison. Similarity: ${similarity.toFixed(2)}. Result: ${matchType}`,
                matchedInternalLayer: 'teaching',
            });
        } else {
            findings.push({
                id: `CC_M${moduleNum}_${counter}`, sourceFile: file.relativePath, corpusFamily: 'FirstPrincipleLearning',
                crossCheckType: 'gap', matchedInternalModule: null,
                externalContent: content.split('\n')[0].trim().slice(0, 200), internalContent: null,
                description: `Module ${moduleNum}: external module has no corresponding TOPIC_KB entry. Gap detected.`,
                matchedInternalLayer: 'teaching',
            });
        }
    }

    const externalModules = new Set<number>();
    for (const f of moduleFiles) {
        const m = f.sourceFile.match(/module\s*(\d+)/i);
        if (m) externalModules.add(parseInt(m[1]));
    }
    for (const [key] of internal.topicKBModules.entries()) {
        const m = key.match(/module\s*(\d+)/i);
        if (m) {
            const num = parseInt(m[1]);
            if (!externalModules.has(num)) {
                counter++;
                findings.push({
                    id: `CC_M${num}_INT_${counter}`, sourceFile: 'N/A (internal only)', corpusFamily: 'NoeticanCode',
                    crossCheckType: 'gap', matchedInternalModule: `src/teaching.ts → TOPIC_KB[${key}]`,
                    externalContent: '', internalContent: key,
                    description: `Module ${num}: exists in internal TOPIC_KB but no external curriculum file found. Internal-only module.`,
                    matchedInternalLayer: 'teaching',
                });
            }
        }
    }

    const tally: Record<string, number> = { match: 0, close_analogue: 0, stale_mapping: 0, gap: 0, conflict: 0 };
    for (const f of findings) tally[f.crossCheckType]++;
    console.log(`  Total cross-check findings: ${findings.length}`);
    console.log(`    match:          ${tally.match}`);
    console.log(`    close_analogue: ${tally.close_analogue}`);
    console.log(`    stale_mapping:  ${tally.stale_mapping}`);
    console.log(`    gap:            ${tally.gap}`);
    console.log(`    conflict:       ${tally.conflict}`);
    console.log('');

    return findings;
}

// ─── Phase 2.5: Delta Analysis ────────────────────────────────────

function phase2_5_delta(
    currentIngested: IngestedFile[],
    prior: PriorReviewReceipt,
    currentFindings: CrossCheckFinding[],
): ReobservationDelta {
    console.log('═══ Phase 2.5: Delta Analysis (Prior vs Current) ═══\n');

    // Build lookup maps
    const priorByPath = new Map<string, IngestedFile>();
    for (const f of prior.ingestedFiles) priorByPath.set(f.relativePath, f);

    const currentByPath = new Map<string, IngestedFile>();
    for (const f of currentIngested) currentByPath.set(f.relativePath, f);

    // Compare files
    const changedHashes: { relativePath: string; priorHash: string; currentHash: string }[] = [];
    const missingFiles: string[] = [];
    const newFiles: string[] = [];
    let stableCount = 0;
    let changedCount = 0;

    // Check current files against prior
    for (const [path, curr] of currentByPath) {
        const p = priorByPath.get(path);
        if (!p) {
            newFiles.push(path);
        } else if (p.contentHash === curr.contentHash) {
            stableCount++;
        } else {
            changedCount++;
            changedHashes.push({ relativePath: path, priorHash: p.contentHash, currentHash: curr.contentHash });
        }
    }

    // Check prior files against current (missing)
    for (const [path] of priorByPath) {
        if (!currentByPath.has(path)) {
            missingFiles.push(path);
        }
    }

    // Compare cross-check findings
    const priorFindingsBySource = new Map<string, CrossCheckResult>();
    for (const f of prior.crossCheckFindings) priorFindingsBySource.set(f.sourceFile, f.crossCheckType);

    const currentFindingsBySource = new Map<string, CrossCheckResult>();
    for (const f of currentFindings) currentFindingsBySource.set(f.sourceFile, f.crossCheckType);

    const findingDeltas: FindingDelta[] = [];
    const allSources = new Set([...priorFindingsBySource.keys(), ...currentFindingsBySource.keys()]);

    for (const source of allSources) {
        const priorType = priorFindingsBySource.get(source) || null;
        const currentType = currentFindingsBySource.get(source) || null;

        let delta: FindingDelta['delta'];
        if (priorType === null && currentType !== null) delta = 'appeared';
        else if (priorType !== null && currentType === null) delta = 'disappeared';
        else if (priorType === currentType) delta = 'unchanged';
        else delta = 'changed_type';

        findingDeltas.push({ sourceFile: source, priorType, currentType, delta });
    }

    // Print summary
    console.log(`  File stability:`);
    console.log(`    stable:  ${stableCount}`);
    console.log(`    changed: ${changedCount}`);
    console.log(`    new:     ${newFiles.length}`);
    console.log(`    missing: ${missingFiles.length}`);
    console.log('');
    console.log(`  Finding deltas:`);
    const fd: Record<string, number> = { appeared: 0, disappeared: 0, unchanged: 0, changed_type: 0 };
    for (const d of findingDeltas) fd[d.delta]++;
    for (const [k, v] of Object.entries(fd)) console.log(`    ${k}: ${v}`);
    console.log('');

    if (changedHashes.length > 0) {
        console.log(`  ⚠ CHANGED HASHES: ${changedHashes.length}`);
        for (const c of changedHashes.slice(0, 5)) {
            console.log(`    ${c.relativePath}`);
            console.log(`      prior:   ${c.priorHash}`);
            console.log(`      current: ${c.currentHash}`);
        }
        if (changedHashes.length > 5) console.log(`    ... and ${changedHashes.length - 5} more`);
        console.log('');
    }

    if (missingFiles.length > 0) {
        console.log(`  ⚠ MISSING FILES: ${missingFiles.length}`);
        for (const m of missingFiles.slice(0, 5)) console.log(`    ${m}`);
        if (missingFiles.length > 5) console.log(`    ... and ${missingFiles.length - 5} more`);
        console.log('');
    }

    if (newFiles.length > 0) {
        console.log(`  ⚠ NEW FILES: ${newFiles.length}`);
        for (const n of newFiles.slice(0, 5)) console.log(`    ${n}`);
        if (newFiles.length > 5) console.log(`    ... and ${newFiles.length - 5} more`);
        console.log('');
    }

    return {
        stableCount, changedCount,
        newCount: newFiles.length, missingCount: missingFiles.length,
        changedHashes, missingFiles, newFiles, findingDeltas,
    };
}

// ─── Phase 3: Governed Admission (with promotion) ─────────────────

function phase3_admission(
    currentIngested: IngestedFile[],
    prior: PriorReviewReceipt,
    crossCheckFindings: CrossCheckFinding[],
    delta: ReobservationDelta,
): LearningAdmission[] {
    console.log('═══ Phase 3: Governed Learning Admission (with Reobservation) ═══\n');

    const admissions: LearningAdmission[] = [];
    const timestamp = new Date().toISOString();

    const ccBySource = new Map<string, CrossCheckFinding[]>();
    for (const cc of crossCheckFindings) {
        const existing = ccBySource.get(cc.sourceFile) || [];
        existing.push(cc);
        ccBySource.set(cc.sourceFile, existing);
    }

    // Build prior admission lookup by relativePath
    const priorAdmissionsByPath = new Map<string, LearningAdmission>();
    for (const a of prior.learningAdmissions) {
        priorAdmissionsByPath.set(a.sourceFile, a);
    }

    // Build stable path set
    const stablePaths = new Set<string>();
    for (const [path, curr] of new Map(currentIngested.map(f => [f.relativePath, f]))) {
        const p = prior.ingestedFiles.find(pr => pr.relativePath === path);
        if (p && p.contentHash === curr.contentHash) stablePaths.add(path);
    }

    for (const file of currentIngested) {
        const ccs = ccBySource.get(file.relativePath) || [];
        const eventId = `LR_${file.contentHash}`;
        const priorAdmission = priorAdmissionsByPath.get(file.relativePath);

        // Determine admission status
        let admissionStatus: AdmissionStatus = 'first_observation';
        let refusalReason: string | null = null;
        let crossCheckType: CrossCheckResult | null = null;

        if (ccs.length > 0) {
            const conflicts = ccs.filter(c => c.crossCheckType === 'conflict');
            if (conflicts.length > 0) {
                admissionStatus = 'refused';
                refusalReason = `Conflict detected: external corpus differs materially from internal state. Conflicts: ${conflicts.map(c => c.id).join(', ')}. Becomes a review obligation, not an automatic update.`;
                crossCheckType = 'conflict';
            } else {
                crossCheckType = ccs[0].crossCheckType;
                // Promotion: if hash-stable across runs, promote to reobserved
                if (stablePaths.has(file.relativePath) && priorAdmission) {
                    admissionStatus = 'reobserved';
                } else {
                    admissionStatus = 'first_observation';
                }
            }
        } else {
            // No cross-check finding — pure ingestion
            crossCheckType = null;
            if (stablePaths.has(file.relativePath) && priorAdmission) {
                admissionStatus = 'reobserved';
            } else {
                admissionStatus = 'first_observation';
            }
        }

        const evidenceCeiling: EvidenceLevel = 'corpus_extracted';

        const limitations: string[] = [];
        if (admissionStatus === 'reobserved') {
            limitations.push('Reobserved — hash-identical across ≥ 2 runs');
            limitations.push('Reobserved does NOT mean verified');
            limitations.push('Reobserved does NOT promote evidence ceiling beyond corpus_extracted');
            limitations.push('Stable hash does not certify content correctness');
        } else {
            limitations.push('First-pass observation — not cross-run stable');
            limitations.push('Evidence capped at corpus_extracted');
            limitations.push('No independent verification performed');
        }
        if (admissionStatus === 'refused') {
            limitations.push('Admission refused — requires human review of conflict');
        }

        let nextVerificationStep: string;
        if (admissionStatus === 'refused') {
            nextVerificationStep = 'Human reviewer must resolve conflict between external corpus and internal state';
        } else if (admissionStatus === 'reobserved') {
            nextVerificationStep = 'One more stable re-run needed to reach stable_candidate status';
        } else {
            nextVerificationStep = 'Re-run curriculum review pipeline to establish cross-run stability (reobserved status)';
        }

        admissions.push({
            eventId, sourceFile: file.relativePath, corpusFamily: file.corpusFamily,
            contentHash: file.contentHash,
            matchedInternalModule: ccs.length > 0 ? ccs[0].matchedInternalModule : null,
            classification: file.corpusFamily, evidenceCeiling,
            admissionStatus, refusalReason, crossCheckType,
            nextVerificationStep, limitations,
            classifiedBy: 'v13.5_curriculum_reobservation_pipeline',
            classificationTimestamp: timestamp,
        });
    }

    const tally: Record<string, number> = {};
    for (const a of admissions) tally[a.admissionStatus] = (tally[a.admissionStatus] || 0) + 1;

    console.log(`  Total learning admissions: ${admissions.length}`);
    for (const [status, count] of Object.entries(tally).sort()) {
        console.log(`    ${status}: ${count}`);
    }
    console.log('');

    return admissions;
}

// ─── Phase 4: Report ──────────────────────────────────────────────

function renderMarkdownReport(r: ReobservationReceipt): string {
    const lines: string[] = [];

    lines.push('# CohBit-Copilot v13.5 — Curriculum Reobservation + Drift Check');
    lines.push('');
    lines.push(`**Receipt ID:** \`${r.receiptId}\``);
    lines.push(`**Generated:** ${r.generatedAt}`);
    lines.push(`**Version:** ${r.version}`);
    lines.push(`**Prior Report:** \`${r.priorReportId}\` (${r.priorReportGeneratedAt})`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Safe Claim');
    lines.push('');
    lines.push('> CohBit-Copilot v13.5 re-ingests the external curriculum corpus, compares');
    lines.push('> results against the v13.4 first-observation baseline, promotes hash-stable');
    lines.push('> files to `reobserved` status, and separately reports content drift (changed');
    lines.push('> hashes), missing files, new files, and cross-check finding deltas.');
    lines.push('> Reobserved status confirms cross-run stability of the observation — it');
    lines.push('> does not verify correctness, upgrade evidence, modify canon, or update');
    lines.push('> the Teaching KB. All evidence remains capped at `corpus_extracted`.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('### Ingestion');
    lines.push('');
    lines.push(`| Metric | Current | Prior (v13.4) |`);
    lines.push(`|--------|---------|---------------|`);
    lines.push(`| Total files ingested | ${r.summary.totalFilesIngested} | ${r.priorReportId} |`);
    lines.push('');
    lines.push('### File Stability Delta');
    lines.push('');
    lines.push(`| Status | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Stable (hash-identical) | ${r.summary.delta.stable} |`);
    lines.push(`| Changed (hash differs)  | ${r.summary.delta.changed} |`);
    lines.push(`| New (not in prior)      | ${r.summary.delta.new} |`);
    lines.push(`| Missing (not in current)| ${r.summary.delta.missing} |`);
    lines.push('');
    lines.push('### Cross-Check Findings');
    lines.push('');
    lines.push(`| Result | Current Count |`);
    lines.push(`|--------|---------------|`);
    lines.push(`| match | ${r.summary.crossCheckFindings.match} |`);
    lines.push(`| close_analogue | ${r.summary.crossCheckFindings.close_analogue} |`);
    lines.push(`| stale_mapping | ${r.summary.crossCheckFindings.stale_mapping} |`);
    lines.push(`| gap | ${r.summary.crossCheckFindings.gap} |`);
    lines.push(`| conflict | ${r.summary.crossCheckFindings.conflict} |`);
    lines.push('');
    lines.push('### Cross-Check Finding Deltas');
    lines.push('');
    lines.push(`| Delta | Count |`);
    lines.push(`|-------|-------|`);
    lines.push(`| unchanged | ${r.summary.findingDeltas.unchanged} |`);
    lines.push(`| appeared | ${r.summary.findingDeltas.appeared} |`);
    lines.push(`| disappeared | ${r.summary.findingDeltas.disappeared} |`);
    lines.push(`| changed_type | ${r.summary.findingDeltas.changed_type} |`);
    lines.push('');
    lines.push('### Learning Admissions');
    lines.push('');
    lines.push(`| Status | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| first_observation | ${r.summary.admissions.first_observation} |`);
    lines.push(`| reobserved | ${r.summary.admissions.reobserved} |`);
    lines.push(`| stable_candidate | ${r.summary.admissions.stable_candidate} |`);
    lines.push(`| admitted_learning_record | ${r.summary.admissions.admitted_learning_record} |`);
    lines.push(`| refused | ${r.summary.admissions.refused} |`);
    lines.push('');

    // Drift detail
    if (r.delta.changedHashes.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Changed Hashes (Drift)');
        lines.push('');
        lines.push(`**Count:** ${r.delta.changedHashes.length}`);
        lines.push('');
        for (const c of r.delta.changedHashes.slice(0, 30)) {
            lines.push(`- **${c.relativePath}**`);
            lines.push(`  - Prior:   \`${c.priorHash}\``);
            lines.push(`  - Current: \`${c.currentHash}\``);
        }
        if (r.delta.changedHashes.length > 30) {
            lines.push(`  *... and ${r.delta.changedHashes.length - 30} more*`);
        }
        lines.push('');
    }

    if (r.delta.missingFiles.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Missing Files');
        lines.push('');
        lines.push(`**Count:** ${r.delta.missingFiles.length}`);
        lines.push('');
        for (const m of r.delta.missingFiles.slice(0, 30)) lines.push(`- ${m}`);
        if (r.delta.missingFiles.length > 30) lines.push(`*... and ${r.delta.missingFiles.length - 30} more*`);
        lines.push('');
    }

    if (r.delta.newFiles.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## New Files');
        lines.push('');
        lines.push(`**Count:** ${r.delta.newFiles.length}`);
        lines.push('');
        for (const n of r.delta.newFiles.slice(0, 30)) lines.push(`- ${n}`);
        if (r.delta.newFiles.length > 30) lines.push(`*... and ${r.delta.newFiles.length - 30} more*`);
        lines.push('');
    }

    if (r.delta.findingDeltas.filter(d => d.delta !== 'unchanged').length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Finding Deltas (Non-Unchanged)');
        lines.push('');
        for (const d of r.delta.findingDeltas.filter(fd => fd.delta !== 'unchanged')) {
            lines.push(`- **${d.sourceFile}**: ${d.priorType || 'none'} → ${d.currentType || 'none'} (${d.delta})`);
        }
        lines.push('');
    }

    // Admission detail
    const reobserved = r.learningAdmissions.filter(a => a.admissionStatus === 'reobserved');
    const firstObs = r.learningAdmissions.filter(a => a.admissionStatus === 'first_observation');
    const refused = r.learningAdmissions.filter(a => a.admissionStatus === 'refused');

    if (reobserved.length > 0 || firstObs.length > 0 || refused.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Admission Detail');
        lines.push('');

        if (reobserved.length > 0) {
            lines.push(`### Reobserved (${reobserved.length})`);
            lines.push('');
            lines.push('These files were hash-identical across v13.4 and v13.5 runs. Status promoted from `first_observation` to `reobserved`.');
            lines.push('');
            lines.push('**Reobserved does NOT mean verified.** It only confirms cross-run stability of the observation. Evidence remains capped at `corpus_extracted`.');
            lines.push('');
            for (const a of reobserved.slice(0, 10)) lines.push(`- \`${a.eventId}\` — ${a.sourceFile}`);
            if (reobserved.length > 10) lines.push(`  *... and ${reobserved.length - 10} more*`);
            lines.push('');
        }

        if (firstObs.length > 0) {
            lines.push(`### First Observation (${firstObs.length})`);
            lines.push('');
            lines.push('These files could not be confirmed as stable (drifted, new, or hash mismatch).');
            lines.push('');
            for (const a of firstObs.slice(0, 10)) lines.push(`- \`${a.eventId}\` — ${a.sourceFile}`);
            if (firstObs.length > 10) lines.push(`  *... and ${firstObs.length - 10} more*`);
            lines.push('');
        }

        if (refused.length > 0) {
            lines.push(`### Refused (${refused.length})`);
            lines.push('');
            for (const a of refused) {
                lines.push(`- \`${a.eventId}\` — ${a.refusalReason?.slice(0, 150)}`);
            }
            lines.push('');
        }
    }

    lines.push('---');
    lines.push('');
    lines.push('## Attestation');
    lines.push('');
    lines.push(r.summary.attestation);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`*Generated by CohBit-Copilot v13.5 Curriculum Reobservation + Drift Check Pipeline*`);
    lines.push(`*Receipt ID: ${r.receiptId}*`);
    lines.push(`*Prior Report: ${r.priorReportId}*`);

    return lines.join('\n');
}

function phase4_report(
    ingested: IngestedFile[], crossCheckFindings: CrossCheckFinding[],
    admissions: LearningAdmission[], delta: ReobservationDelta,
    prior: PriorReviewReceipt,
): { reportPath: string; jsonPath: string } {
    console.log('═══ Phase 4: Report Generation ═══\n');

    const ccTally = { match: 0, close_analogue: 0, stale_mapping: 0, gap: 0, conflict: 0 };
    for (const f of crossCheckFindings) ccTally[f.crossCheckType]++;

    const admTally: Record<string, number> = { first_observation: 0, reobserved: 0, stable_candidate: 0, admitted_learning_record: 0, refused: 0 };
    for (const a of admissions) admTally[a.admissionStatus]++;

    const byFamily: Record<string, number> = {};
    for (const f of ingested) byFamily[f.corpusFamily] = (byFamily[f.corpusFamily] || 0) + 1;

    const fdTally = { appeared: 0, disappeared: 0, unchanged: 0, changed_type: 0 };
    for (const d of delta.findingDeltas) fdTally[d.delta]++;

    const receiptId = `RR_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const receipt: ReobservationReceipt = {
        receiptId, version: VERSION,
        pipeline: 'v13.5 — Curriculum Reobservation + Drift Check',
        generatedAt: new Date().toISOString(),
        priorReportId: prior.receiptId,
        priorReportGeneratedAt: prior.generatedAt,
        summary: {
            totalFilesIngested: ingested.length,
            filesByFamily: byFamily,
            delta: { stable: delta.stableCount, changed: delta.changedCount, new: delta.newCount, missing: delta.missingCount },
            crossCheckFindings: ccTally,
            findingDeltas: fdTally,
            admissions: admTally,
            attestation:
                'CohBit-Copilot v13.5 re-ingests the external curriculum corpus, compares results against the v13.4 first-observation baseline, promotes hash-stable files to reobserved status, and separately reports content drift (changed hashes), missing files, new files, and cross-check finding deltas. Reobserved status confirms cross-run stability of the observation — it does not verify correctness, upgrade evidence, modify canon, or update the Teaching KB. All evidence remains capped at corpus_extracted.',
        },
        delta, ingestedFiles: ingested, crossCheckFindings, learningAdmissions: admissions,
    };

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonPath = path.join(OUTPUT_DIR, 'v13_5_curriculum_reobservation.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  JSON report:  ${jsonPath}`);

    const mdPath = path.join(OUTPUT_DIR, 'v13_5_curriculum_reobservation.md');
    const md = renderMarkdownReport(receipt);
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  MD report:    ${mdPath}`);
    console.log('');

    return { reportPath: mdPath, jsonPath };
}

// ─── Main ─────────────────────────────────────────────────────────

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v13.5 — Curriculum Reobservation + Drift Check');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Phase 1: Re-ingest
    const { ingested } = phase1_ingest();

    // Phase 1.5: Load prior
    const prior = phase1_5_loadPrior();

    // Phase 2: Cross-check
    const internal = buildInternalState();
    console.log(`  Internal state snapshot:`);
    console.log(`    code-atlas layers:  ${internal.codeAtlasLayers.length}`);
    console.log(`    math-atlas layers:  ${internal.mathAtlasLayers.length}`);
    console.log(`    resource layers:    ${internal.resourceLayers.length}`);
    console.log(`    tooling layers:     ${internal.toolingLayers.length}`);
    console.log(`    tlt-atlas layers:   ${internal.tltAtlasLayers.length}`);
    console.log(`    TOPIC_KB modules:   ${internal.topicKBModules.size}`);
    console.log('');
    const crossCheckFindings = phase2_crossCheck(ingested, internal);

    // Phase 2.5: Delta
    const delta = phase2_5_delta(ingested, prior, crossCheckFindings);

    // Phase 3: Admission with promotion
    const admissions = phase3_admission(ingested, prior, crossCheckFindings, delta);

    // Phase 4: Report
    const paths = phase4_report(ingested, crossCheckFindings, admissions, delta, prior);

    console.log('═══════════════════════════════════════════════════');
    console.log('  Pipeline Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('  CONCLUSION: reviewed / reobserved / first observation');
    console.log('');
    console.log(`  Stable → reobserved:  ${delta.stableCount}`);
    console.log(`  Changed:              ${delta.changedCount}`);
    console.log(`  New:                  ${delta.newCount}`);
    console.log(`  Missing:              ${delta.missingCount}`);
    console.log('');
    if (delta.stableCount > 0 && delta.changedCount === 0 && delta.newCount === 0 && delta.missingCount === 0) {
        console.log('  ✅ All files hash-stable. Corpus is identical across runs.');
        console.log('  → Ready for v13.6: stable_candidate admission.');
    } else {
        console.log('  ⚠ Some drift detected. Review changed/missing/new files above.');
    }
    console.log('');
    console.log('  Reobserved does NOT mean verified.');
    console.log('  Evidence remains capped at corpus_extracted.');
    console.log('');
    console.log(`  Reports: ${paths.reportPath}`);
    console.log(`           ${paths.jsonPath}`);
}

main();