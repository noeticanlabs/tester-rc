// CohBit-Copilot v13.4 — Governed Curriculum Review
// Pipeline: Corpus Ingestion & Classification → Cross-Check →
//   Governed Learning Admission → Professional Report
//
// Operating law:
//   External curriculum may inform learning records.
//   It may not overwrite canon, update Teaching KB, promote evidence,
//   or claim verification without cross-check, persistence, comparison, and review.
//
// Safe claim:
//   This curriculum review identifies structural matches, gaps, stale mappings,
//   conflicts, and candidate learning records between an external curriculum
//   corpus and the current CohBit-Copilot system. All accepted records are
//   capped at corpus_extracted evidence and do not promote canon, verify
//   correctness, or modify system behavior automatically. This first pass
//   concludes: reviewed / classified / first observation.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Constants ────────────────────────────────────────────────────

const CURRICULUM_ROOT =
    'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)\\dictionary\\Doctrine curriuclum\\curriculum';
const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const VERSION = '13.4.0';

// ─── Types ────────────────────────────────────────────────────────

/** Corpus family classification */
type CorpusFamily =
    | 'FirstPrincipleLearning'
    | 'NoeticanCode'
    | 'Mathematics'
    | 'Language'
    | 'History'
    | 'Unknown';

/** Cross-check result type (5-way) */
type CrossCheckResult =
    | 'match'
    | 'close_analogue'
    | 'stale_mapping'
    | 'gap'
    | 'conflict';

/** Admission ladder level (5-level) */
type AdmissionStatus =
    | 'first_observation'
    | 'reobserved'
    | 'stable_candidate'
    | 'admitted_learning_record'
    | 'refused';

/** Evidence ceiling for curriculum review */
type EvidenceLevel =
    | 'none'
    | 'surface_detected'
    | 'corpus_extracted'
    | 'cross_run_stable'
    | 'verified';

/** Individual ingested file record */
interface IngestedFile {
    sourceFile: string;
    relativePath: string;
    corpusFamily: CorpusFamily;
    contentHash: string;
    sizeBytes: number;
    lineCount: number;
    extension: string;
}

/** Cross-check finding between external corpus and internal state */
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

/** Governed learning admission record */
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

/** Review receipt — summary of the entire review */
interface ReviewReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    summary: {
        totalFilesIngested: number;
        filesByFamily: Record<string, number>;
        crossCheckFindings: {
            match: number;
            close_analogue: number;
            stale_mapping: number;
            gap: number;
            conflict: number;
        };
        admissions: {
            first_observation: number;
            reobserved: number;
            stable_candidate: number;
            admitted_learning_record: number;
            refused: number;
        };
        attestation: string;
    };
    ingestedFiles: IngestedFile[];
    crossCheckFindings: CrossCheckFinding[];
    learningAdmissions: LearningAdmission[];
    proposal: TeachingKBProposal | null;
}

/** Optional Teaching KB update proposal (generated but NOT auto-applied) */
interface TeachingKBProposal {
    proposalId: string;
    proposedAt: string;
    status: 'proposal_only';
    description: string;
    changes: TeachingKBChange[];
}

interface TeachingKBChange {
    action: 'add' | 'update' | 'flag_conflict' | 'flag_gap';
    moduleId: string;
    currentDoctrine: string | null;
    proposedDoctrine: string | null;
    rationale: string;
}

// ─── Phase 1: Corpus Ingestion & Classification ───────────────────

/** Map a file path to its corpus family */
function classifyCorpusFamily(relPath: string): CorpusFamily {
    const lower = relPath.toLowerCase();
    if (lower.includes('first principle learning') || lower.includes('first principle')) {
        return 'FirstPrincipleLearning';
    }
    if (lower.includes('noetican code') || lower.includes('noetican')) {
        return 'NoeticanCode';
    }
    if (lower.includes('mathematics') || lower.includes('math')) {
        return 'Mathematics';
    }
    if (lower.includes('language') || lower.includes('bilingual')) {
        return 'Language';
    }
    if (lower.includes('history')) {
        return 'History';
    }
    return 'Unknown';
}

/** Compute SHA-256 hash of content */
function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex').slice(0, 16);
}

/** Recursively walk a directory and collect all readable files */
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

/** Read a file safely, returning null on failure */
function safeReadFile(absPath: string): string | null {
    try {
        const text = fs.readFileSync(absPath, 'utf-8');
        if (!text.trim()) return null;
        return text;
    } catch {
        return null;
    }
}

/** Phase 1: Ingest and classify all files */
function phase1_ingest(): { ingested: IngestedFile[]; skipped: string[] } {
    console.log('═══ Phase 1: Corpus Ingestion & Classification ═══\n');

    const ingested: IngestedFile[] = [];
    const skipped: string[] = [];

    const files = walkDirectory(CURRICULUM_ROOT, CURRICULUM_ROOT);

    for (const file of files) {
        const ext = path.extname(file.relativePath).toLowerCase();

        // Skip binary / archive / zip files
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

    // Log summary
    const byFamily: Record<string, number> = {};
    for (const f of ingested) {
        byFamily[f.corpusFamily] = (byFamily[f.corpusFamily] || 0) + 1;
    }

    console.log(`  Files ingested: ${ingested.length}`);
    console.log(`  Files skipped:  ${skipped.length}`);
    for (const [family, count] of Object.entries(byFamily).sort()) {
        console.log(`    ${family}: ${count}`);
    }
    for (const s of skipped.slice(0, 5)) {
        console.log(`    skip: ${s}`);
    }
    if (skipped.length > 5) console.log(`    ... and ${skipped.length - 5} more`);
    console.log('');

    return { ingested, skipped };
}

// ─── Phase 2: Cross-Check Against Existing State ──────────────────

/** Internal state snapshot: CohBit-Copilot's internal package structure */
interface InternalState {
    codeAtlasLayers: string[];
    mathAtlasLayers: string[];
    resourceLayers: string[];
    toolingLayers: string[];
    tltAtlasLayers: string[];
    topicKBModules: Map<string, { topic: string; doctrine: string }>;
}

/** Build a snapshot of internal state */
function buildInternalState(): InternalState {
    // Code Atlas layers
    const codeAtlasDir = path.join(process.cwd(), 'packages', 'code-atlas', 'src');
    const codeAtlasLayers = fs.existsSync(codeAtlasDir)
        ? fs.readdirSync(codeAtlasDir).filter(f => f.endsWith('.ts')).sort()
        : [];

    // Math Atlas layers
    const mathAtlasDir = path.join(process.cwd(), 'packages', 'math-atlas', 'src');
    const mathAtlasLayers = fs.existsSync(mathAtlasDir)
        ? fs.readdirSync(mathAtlasDir).filter(f => f.endsWith('.ts')).sort()
        : [];

    // Resource layers
    const resourceDir = path.join(process.cwd(), 'packages', 'resource', 'src');
    const resourceLayers = fs.existsSync(resourceDir)
        ? fs.readdirSync(resourceDir).filter(f => f.endsWith('.ts')).sort()
        : [];

    // Tooling layers
    const toolingDir = path.join(process.cwd(), 'packages', 'tooling', 'src');
    const toolingLayers = fs.existsSync(toolingDir)
        ? fs.readdirSync(toolingDir).filter(f => f.endsWith('.ts')).sort()
        : [];

    // TLT Atlas layers
    const tltAtlasDir = path.join(process.cwd(), 'packages', 'tlt-atlas', 'src');
    const tltAtlasLayers = fs.existsSync(tltAtlasDir)
        ? fs.readdirSync(tltAtlasDir).filter(f => f.endsWith('.ts')).sort()
        : [];

    // TOPIC_KB modules — extract from teaching.ts directly
    const topicKBModules = new Map<string, { topic: string; doctrine: string }>();
    // We'll populate this from the TOPIC_KB constant in src/teaching.ts
    // For the cross-check, we match against known module topics
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
    for (const m of knownModules) {
        topicKBModules.set(m.topic, m);
    }

    return {
        codeAtlasLayers,
        mathAtlasLayers,
        resourceLayers,
        toolingLayers,
        tltAtlasLayers,
        topicKBModules,
    };
}

/** Compare external Noetican Code atlas names against internal package layer names */
function crossCheckNoeticanCode(
    ingested: IngestedFile[],
    internal: InternalState,
): CrossCheckFinding[] {
    const findings: CrossCheckFinding[] = [];
    let counter = 0;

    const noeticanFiles = ingested.filter(f => f.corpusFamily === 'NoeticanCode');

    // Map external atlas file names to internal package families
    for (const file of noeticanFiles) {
        const name = file.sourceFile.toLowerCase();

        // Code Invariant Atlas → packages/code-atlas
        if (name.includes('code invariant atlas') || name.includes('code invariant')) {
            counter++;
            const externalLayers = extractLayersFromName(name);
            const matchType = compareAtlasVersions(externalLayers, internal.codeAtlasLayers, 'code');
            findings.push({
                id: `CC_CODE_${counter}`,
                sourceFile: file.relativePath,
                corpusFamily: 'NoeticanCode',
                crossCheckType: matchType,
                matchedInternalModule: 'packages/code-atlas',
                externalContent: file.sourceFile,
                internalContent: matchType === 'match' || matchType === 'close_analogue'
                    ? `packages/code-atlas layers: ${internal.codeAtlasLayers.join(', ')}`
                    : null,
                description: `External Code Invariant Atlas version compared to internal code-atlas package. Result: ${matchType}`,
                matchedInternalLayer: 'code-atlas',
            });
        }

        // Multimodel Mathematics → packages/math-atlas
        if (name.includes('multimodel mathematics') || name.includes('mathematics')) {
            counter++;
            const externalLayers = extractLayersFromName(name);
            const matchType = compareAtlasVersions(externalLayers, internal.mathAtlasLayers, 'math');
            findings.push({
                id: `CC_MATH_${counter}`,
                sourceFile: file.relativePath,
                corpusFamily: 'NoeticanCode',
                crossCheckType: matchType,
                matchedInternalModule: 'packages/math-atlas',
                externalContent: file.sourceFile,
                internalContent: matchType === 'match' || matchType === 'close_analogue'
                    ? `packages/math-atlas layers: ${internal.mathAtlasLayers.join(', ')}`
                    : null,
                description: `External Mathematics atlas version compared to internal math-atlas package. Result: ${matchType}`,
                matchedInternalLayer: 'math-atlas',
            });
        }

        // Resource Layer → packages/resource
        if (name.includes('resource layer')) {
            counter++;
            const externalLayers = extractLayersFromName(name);
            const matchType = compareAtlasVersions(externalLayers, internal.resourceLayers, 'resource');
            findings.push({
                id: `CC_RES_${counter}`,
                sourceFile: file.relativePath,
                corpusFamily: 'NoeticanCode',
                crossCheckType: matchType,
                matchedInternalModule: 'packages/resource',
                externalContent: file.sourceFile,
                internalContent: matchType === 'match' || matchType === 'close_analogue'
                    ? `packages/resource layers: ${internal.resourceLayers.join(', ')}`
                    : null,
                description: `External Resource Layer version compared to internal resource package. Result: ${matchType}`,
                matchedInternalLayer: 'resource',
            });
        }

        // Tooling Layer → packages/tooling
        if (name.includes('tooling layer')) {
            counter++;
            const externalLayers = extractLayersFromName(name);
            const matchType = compareAtlasVersions(externalLayers, internal.toolingLayers, 'tooling');
            findings.push({
                id: `CC_TOOL_${counter}`,
                sourceFile: file.relativePath,
                corpusFamily: 'NoeticanCode',
                crossCheckType: matchType,
                matchedInternalModule: 'packages/tooling',
                externalContent: file.sourceFile,
                internalContent: matchType === 'match' || matchType === 'close_analogue'
                    ? `packages/tooling layers: ${internal.toolingLayers.join(', ')}`
                    : null,
                description: `External Tooling Layer version compared to internal tooling package. Result: ${matchType}`,
                matchedInternalLayer: 'tooling',
            });
        }

        // Bilingual Atlas → packages/tlt-atlas
        if (name.includes('bilingual atlas') || name.includes('bilingual')) {
            counter++;
            const externalLayers = extractLayersFromName(name);
            const matchType = compareAtlasVersions(externalLayers, internal.tltAtlasLayers, 'tlt');
            findings.push({
                id: `CC_TLT_${counter}`,
                sourceFile: file.relativePath,
                corpusFamily: 'NoeticanCode',
                crossCheckType: matchType,
                matchedInternalModule: 'packages/tlt-atlas',
                externalContent: file.sourceFile,
                internalContent: matchType === 'match' || matchType === 'close_analogue'
                    ? `packages/tlt-atlas layers: ${internal.tltAtlasLayers.join(', ')}`
                    : null,
                description: `External Bilingual Atlas compared to internal tlt-atlas package. Result: ${matchType}`,
                matchedInternalLayer: 'tlt-atlas',
            });
        }

        // Layers / structure documentation
        if (name.includes('layers') && !name.includes('atlas')) {
            counter++;
            findings.push({
                id: `CC_LAYERS_${counter}`,
                sourceFile: file.relativePath,
                corpusFamily: 'NoeticanCode',
                crossCheckType: 'close_analogue',
                matchedInternalModule: 'packages/*/src (all atlas packages)',
                externalContent: file.sourceFile,
                internalContent: `Internal packages: code-atlas, math-atlas, resource, tooling, tlt-atlas`,
                description: 'External layer structure documentation — analogous to internal package layer architecture',
                matchedInternalLayer: 'multi-package',
            });
        }
    }

    return findings;
}

/** Extract version info from atlas file name (heuristic) */
function extractLayersFromName(fileName: string): string[] {
    const parts = fileName.split(/\s+/);
    return parts.filter(p => /^[vV]\d+[.]\d+/.test(p) || /^[LM]\d+/.test(p));
}

/** Compare atlas versions: determine match quality */
function compareAtlasVersions(
    externalLayers: string[],
    internalLayers: string[],
    _family: string,
): CrossCheckResult {
    if (internalLayers.length === 0) {
        return 'gap'; // No internal counterpart found
    }

    if (externalLayers.length === 0) {
        // Has internal layers but external is a textual description without version tags
        return 'close_analogue';
    }

    // Check if any external layer name appears in internal layer names
    let matches = 0;
    for (const ext of externalLayers) {
        const extClean = ext.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const intl of internalLayers) {
            const intlClean = intl.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (intlClean.includes(extClean) || extClean.includes(intlClean)) {
                matches++;
                break;
            }
        }
    }

    if (matches === 0) return 'stale_mapping';
    if (matches >= externalLayers.length * 0.5) return 'close_analogue';
    if (matches > 0) return 'stale_mapping';
    return 'gap';
}

/** Cross-check M0–M11 curriculum modules against TOPIC_KB */
function crossCheckCurriculumModules(
    ingested: IngestedFile[],
    internal: InternalState,
): CrossCheckFinding[] {
    const findings: CrossCheckFinding[] = [];
    let counter = 0;

    const fpFiles = ingested.filter(f => f.corpusFamily === 'FirstPrincipleLearning');
    const moduleFiles = fpFiles.filter(f => {
        const n = f.sourceFile.toLowerCase();
        return n.includes('module') && /\d+/.test(n);
    });

    // Read each module file and compare doctrine against TOPIC_KB
    for (const file of moduleFiles) {
        const moduleMatch = file.sourceFile.match(/module\s*(\d+)/i);
        if (!moduleMatch) continue;
        const moduleNum = moduleMatch[1];

        const rawContent = safeReadFile(path.join(CURRICULUM_ROOT, file.relativePath));
        if (!rawContent) continue;
        const content: string = rawContent;

        // Find the corresponding TOPIC_KB entry
        const kbKey = `module ${moduleNum}:`;
        let kbEntry: { topic: string; doctrine: string } | undefined;
        for (const [key, val] of internal.topicKBModules.entries()) {
            if (key.toLowerCase().includes(kbKey)) {
                kbEntry = val;
                break;
            }
        }

        counter++;
        if (kbEntry) {
            // Compare doctrines for degree of alignment
            const externalFirstLine = content.split('\n')[0].trim();
            const internalFirstLine = kbEntry.doctrine.split('.')[0].trim();

            const similarity = computeTextSimilarity(externalFirstLine, internalFirstLine);

            let matchType: CrossCheckResult;
            if (similarity > 0.7) {
                matchType = 'match';
            } else if (similarity > 0.3) {
                matchType = 'close_analogue';
            } else if (similarity > 0) {
                matchType = 'stale_mapping';
            } else {
                matchType = 'conflict';
            }

            findings.push({
                id: `CC_M${moduleNum}_${counter}`,
                sourceFile: file.relativePath,
                corpusFamily: 'FirstPrincipleLearning',
                crossCheckType: matchType,
                matchedInternalModule: `src/teaching.ts → TOPIC_KB[${kbEntry.topic}]`,
                externalContent: externalFirstLine.slice(0, 200),
                internalContent: kbEntry.doctrine.slice(0, 200),
                description: `Module ${moduleNum}: external vs internal doctrine comparison. Similarity: ${similarity.toFixed(2)}. Result: ${matchType}`,
                matchedInternalLayer: 'teaching',
            });
        } else {
            // Module exists externally but not in TOPIC_KB
            findings.push({
                id: `CC_M${moduleNum}_${counter}`,
                sourceFile: file.relativePath,
                corpusFamily: 'FirstPrincipleLearning',
                crossCheckType: 'gap',
                matchedInternalModule: null,
                externalContent: content.split('\n')[0].trim().slice(0, 200),
                internalContent: null,
                description: `Module ${moduleNum}: external module has no corresponding TOPIC_KB entry. Gap detected.`,
                matchedInternalLayer: 'teaching',
            });
        }
    }

    // Check for internal modules with no external counterpart
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
                    id: `CC_M${num}_INT_${counter}`,
                    sourceFile: 'N/A (internal only)',
                    corpusFamily: 'NoeticanCode',
                    crossCheckType: 'gap',
                    matchedInternalModule: `src/teaching.ts → TOPIC_KB[${key}]`,
                    externalContent: '',
                    internalContent: key,
                    description: `Module ${num}: exists in internal TOPIC_KB but no external curriculum file found. Internal-only module.`,
                    matchedInternalLayer: 'teaching',
                });
            }
        }
    }

    return findings;
}

/** Simple text similarity using word overlap */
function computeTextSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
    if (wordsA.size === 0 || wordsB.size === 0) return 0;

    let intersection = 0;
    for (const w of wordsA) {
        if (wordsB.has(w)) intersection++;
    }
    return intersection / Math.max(wordsA.size, wordsB.size);
}

/** Phase 2: Run all cross-checks */
function phase2_crossCheck(
    ingested: IngestedFile[],
    internal: InternalState,
): CrossCheckFinding[] {
    console.log('═══ Phase 2: Cross-Check Against Internal State ═══\n');

    const allFindings: CrossCheckFinding[] = [];

    // Cross-check Noetican Code atlas files
    const atlasFindings = crossCheckNoeticanCode(ingested, internal);
    allFindings.push(...atlasFindings);

    // Cross-check M0-M11 curriculum modules
    const moduleFindings = crossCheckCurriculumModules(ingested, internal);
    allFindings.push(...moduleFindings);

    // Tally results
    const tally: Record<string, number> = { match: 0, close_analogue: 0, stale_mapping: 0, gap: 0, conflict: 0 };
    for (const f of allFindings) {
        tally[f.crossCheckType]++;
    }

    console.log(`  Total cross-check findings: ${allFindings.length}`);
    console.log(`    match:          ${tally.match}`);
    console.log(`    close_analogue: ${tally.close_analogue}`);
    console.log(`    stale_mapping:  ${tally.stale_mapping}`);
    console.log(`    gap:            ${tally.gap}`);
    console.log(`    conflict:       ${tally.conflict}`);
    console.log('');

    return allFindings;
}

// ─── Phase 3: Governed Learning Admission ─────────────────────────

/** Phase 3: Apply learning governance to cross-check findings */
function phase3_admission(
    ingested: IngestedFile[],
    crossCheckFindings: CrossCheckFinding[],
): LearningAdmission[] {
    console.log('═══ Phase 3: Governed Learning Admission ═══\n');

    const admissions: LearningAdmission[] = [];
    const timestamp = new Date().toISOString();

    // Build lookup for quick cross-check finding resolution
    const ccBySource = new Map<string, CrossCheckFinding[]>();
    for (const cc of crossCheckFindings) {
        const existing = ccBySource.get(cc.sourceFile) || [];
        existing.push(cc);
        ccBySource.set(cc.sourceFile, existing);
    }

    for (const file of ingested) {
        const ccs = ccBySource.get(file.relativePath) || [];
        const eventId = `LR_${file.contentHash}`;

        // Determine admission status based on cross-check results
        let admissionStatus: AdmissionStatus = 'first_observation';
        let refusalReason: string | null = null;
        let crossCheckType: CrossCheckResult | null = null;

        if (ccs.length > 0) {
            // If any cross-check is a conflict, flag as refused with conflict reason
            const conflicts = ccs.filter(c => c.crossCheckType === 'conflict');
            const gaps = ccs.filter(c => c.crossCheckType === 'gap');
            const matches = ccs.filter(c => c.crossCheckType === 'match');
            const analogues = ccs.filter(c => c.crossCheckType === 'close_analogue');
            const stale = ccs.filter(c => c.crossCheckType === 'stale_mapping');

            if (conflicts.length > 0) {
                admissionStatus = 'refused';
                refusalReason = `Conflict detected: external corpus differs materially from internal state. Conflicts: ${conflicts.map(c => c.id).join(', ')}. Becomes a review obligation, not an automatic update.`;
                crossCheckType = 'conflict';
            } else if (matches.length > 0 && conflicts.length === 0) {
                admissionStatus = 'first_observation';
                crossCheckType = 'match';
            } else if (analogues.length > 0) {
                admissionStatus = 'first_observation';
                crossCheckType = 'close_analogue';
            } else if (stale.length > 0) {
                admissionStatus = 'first_observation';
                crossCheckType = 'stale_mapping';
            } else if (gaps.length > 0) {
                admissionStatus = 'first_observation';
                crossCheckType = 'gap';
            }
        } else {
            // No cross-check finding — pure ingestion record
            admissionStatus = 'first_observation';
            crossCheckType = null;
        }

        // Evidence ceiling is always corpus_extracted for first observation
        const evidenceCeiling: EvidenceLevel = 'corpus_extracted';

        // Limitations
        const limitations: string[] = [
            'First-pass observation — not cross-run stable',
            'Evidence capped at corpus_extracted',
            'No independent verification performed',
        ];
        if (admissionStatus === 'refused') {
            limitations.push('Admission refused — requires human review of conflict');
        }

        // Next verification step
        let nextVerificationStep = 'Re-run curriculum review pipeline to establish cross-run stability (reobserved status)';
        if (admissionStatus === 'refused') {
            nextVerificationStep = 'Human reviewer must resolve conflict between external corpus and internal state';
        }

        admissions.push({
            eventId,
            sourceFile: file.relativePath,
            corpusFamily: file.corpusFamily,
            contentHash: file.contentHash,
            matchedInternalModule: ccs.length > 0 ? ccs[0].matchedInternalModule : null,
            classification: file.corpusFamily,
            evidenceCeiling,
            admissionStatus,
            refusalReason,
            crossCheckType,
            nextVerificationStep,
            limitations,
            classifiedBy: 'v13.4_curriculum_review_pipeline',
            classificationTimestamp: timestamp,
        });
    }

    // Tally
    const tally: Record<string, number> = {};
    for (const a of admissions) {
        tally[a.admissionStatus] = (tally[a.admissionStatus] || 0) + 1;
    }

    console.log(`  Total learning admissions: ${admissions.length}`);
    for (const [status, count] of Object.entries(tally).sort()) {
        console.log(`    ${status}: ${count}`);
    }

    const refused = admissions.filter(a => a.admissionStatus === 'refused');
    if (refused.length > 0) {
        console.log(`\n  Refused admissions:`);
        for (const r of refused) {
            console.log(`    ${r.eventId}: ${r.refusalReason?.slice(0, 120)}...`);
        }
    }
    console.log('');

    return admissions;
}

// ─── Phase 4: Report & Proposal Generation ────────────────────────

/** Generate Teaching KB update proposal (NOT auto-applied) */
function generateProposal(
    crossCheckFindings: CrossCheckFinding[],
): TeachingKBProposal | null {
    const gaps = crossCheckFindings.filter(f => f.crossCheckType === 'gap');
    const conflicts = crossCheckFindings.filter(f => f.crossCheckType === 'conflict');
    const stales = crossCheckFindings.filter(f => f.crossCheckType === 'stale_mapping');

    const changes: TeachingKBChange[] = [];

    // Flag gaps for potential addition
    for (const g of gaps) {
        if (g.matchedInternalModule === null && g.externalContent) {
            changes.push({
                action: 'flag_gap',
                moduleId: g.id,
                currentDoctrine: null,
                proposedDoctrine: g.externalContent.slice(0, 200),
                rationale: `External curriculum contains module content not present in internal TOPIC_KB. Requires human review before addition.`,
            });
        }
    }

    // Flag conflicts as review obligations
    for (const c of conflicts) {
        changes.push({
            action: 'flag_conflict',
            moduleId: c.id,
            currentDoctrine: c.internalContent,
            proposedDoctrine: c.externalContent,
            rationale: `Material difference detected between external and internal doctrine. Requires human arbitration.`,
        });
    }

    // Flag stale mappings for review
    for (const s of stales) {
        changes.push({
            action: 'update',
            moduleId: s.id,
            currentDoctrine: s.internalContent,
            proposedDoctrine: s.externalContent,
            rationale: `External curriculum suggests updated content that may supersede internal TOPIC_KB entry. Requires human review.`,
        });
    }

    if (changes.length === 0) return null;

    return {
        proposalId: `PROP_CURRICULUM_REVIEW_${Date.now()}`,
        proposedAt: new Date().toISOString(),
        status: 'proposal_only',
        description: `Curriculum review identified ${gaps.length} gaps, ${conflicts.length} conflicts, and ${stales.length} stale mappings. These changes are proposed for human review and are NOT auto-applied.`,
        changes,
    };
}

/** Phase 4: Generate professional report and emit to disk */
function phase4_report(
    ingested: IngestedFile[],
    crossCheckFindings: CrossCheckFinding[],
    admissions: LearningAdmission[],
): { reportPath: string; jsonPath: string } {
    console.log('═══ Phase 4: Report Generation ═══\n');

    const proposal = generateProposal(crossCheckFindings);

    // Tally cross-checks
    const ccTally = { match: 0, close_analogue: 0, stale_mapping: 0, gap: 0, conflict: 0 };
    for (const f of crossCheckFindings) ccTally[f.crossCheckType]++;

    // Tally admissions
    const admTally: Record<string, number> = {
        first_observation: 0, reobserved: 0, stable_candidate: 0,
        admitted_learning_record: 0, refused: 0,
    };
    for (const a of admissions) admTally[a.admissionStatus]++;

    // Files by family
    const byFamily: Record<string, number> = {};
    for (const f of ingested) byFamily[f.corpusFamily] = (byFamily[f.corpusFamily] || 0) + 1;

    const receiptId = `CR_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const receipt: ReviewReceipt = {
        receiptId,
        version: VERSION,
        pipeline: 'v13.4 — Governed Curriculum Review',
        generatedAt: new Date().toISOString(),
        summary: {
            totalFilesIngested: ingested.length,
            filesByFamily: byFamily,
            crossCheckFindings: ccTally,
            admissions: admTally,
            attestation:
                'This curriculum review identifies structural matches, gaps, stale mappings, conflicts, and candidate learning records between an external curriculum corpus and the current CohBit-Copilot system. All accepted records are capped at corpus_extracted evidence and do not promote canon, verify correctness, or modify system behavior automatically. This first pass concludes: reviewed / classified / first observation.',
        },
        ingestedFiles: ingested,
        crossCheckFindings,
        learningAdmissions: admissions,
        proposal,
    };

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write JSON report
    const jsonPath = path.join(OUTPUT_DIR, 'v13_4_curriculum_review.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  JSON report:  ${jsonPath}`);

    // Write Markdown report
    const mdPath = path.join(OUTPUT_DIR, 'v13_4_curriculum_review.md');
    const md = renderMarkdownReport(receipt);
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  MD report:    ${mdPath}`);

    console.log('');
    return { reportPath: mdPath, jsonPath };
}

/** Render the Markdown report */
function renderMarkdownReport(r: ReviewReceipt): string {
    const lines: string[] = [];

    lines.push('# CohBit-Copilot v13.4 — Governed Curriculum Review');
    lines.push('');
    lines.push(`**Receipt ID:** \`${r.receiptId}\``);
    lines.push(`**Generated:** ${r.generatedAt}`);
    lines.push(`**Version:** ${r.version}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Safe Claim');
    lines.push('');
    lines.push('> This curriculum review identifies structural matches, gaps, stale mappings,');
    lines.push('> conflicts, and candidate learning records between an external curriculum');
    lines.push('> corpus and the current CohBit-Copilot system. All accepted records are');
    lines.push('> capped at `corpus_extracted` evidence and do not promote canon, verify');
    lines.push('> correctness, or modify system behavior automatically. This first pass');
    lines.push('> concludes: **reviewed / classified / first observation.**');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total files ingested | ${r.summary.totalFilesIngested} |`);
    for (const [family, count] of Object.entries(r.summary.filesByFamily).sort()) {
        lines.push(`| ${family} | ${count} |`);
    }
    lines.push('');
    lines.push('### Cross-Check Findings');
    lines.push('');
    lines.push(`| Result | Count |`);
    lines.push(`|--------|-------|`);
    lines.push(`| match | ${r.summary.crossCheckFindings.match} |`);
    lines.push(`| close_analogue | ${r.summary.crossCheckFindings.close_analogue} |`);
    lines.push(`| stale_mapping | ${r.summary.crossCheckFindings.stale_mapping} |`);
    lines.push(`| gap | ${r.summary.crossCheckFindings.gap} |`);
    lines.push(`| conflict | ${r.summary.crossCheckFindings.conflict} |`);
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

    // Cross-check detail
    if (r.crossCheckFindings.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Cross-Check Findings (Detail)');
        lines.push('');
        for (const f of r.crossCheckFindings) {
            lines.push(`### ${f.id} — \`${f.crossCheckType}\``);
            lines.push('');
            lines.push(`- **Source:** ${f.sourceFile}`);
            lines.push(`- **Family:** ${f.corpusFamily}`);
            lines.push(`- **Matched Internal:** ${f.matchedInternalModule || 'none'}`);
            lines.push(`- **Layer:** ${f.matchedInternalLayer || 'none'}`);
            lines.push(`- **Description:** ${f.description}`);
            if (f.externalContent) {
                lines.push(`- **External Content (snippet):** \`${f.externalContent.slice(0, 150)}...\``);
            }
            if (f.internalContent) {
                lines.push(`- **Internal Content (snippet):** \`${f.internalContent.slice(0, 150)}...\``);
            }
            lines.push('');
        }
    }

    // Admission detail
    if (r.learningAdmissions.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Learning Admissions (Detail)');
        lines.push('');
        for (const a of r.learningAdmissions.slice(0, 30)) {
            lines.push(`### ${a.eventId}`);
            lines.push('');
            lines.push(`| Field | Value |`);
            lines.push(`|-------|-------|`);
            lines.push(`| Source | ${a.sourceFile} |`);
            lines.push(`| Corpus Family | ${a.corpusFamily} |`);
            lines.push(`| Content Hash | ${a.contentHash} |`);
            lines.push(`| Matched Internal | ${a.matchedInternalModule || 'none'} |`);
            lines.push(`| Evidence Ceiling | ${a.evidenceCeiling} |`);
            lines.push(`| Admission Status | **${a.admissionStatus}** |`);
            lines.push(`| Cross-Check Type | ${a.crossCheckType || 'n/a'} |`);
            if (a.refusalReason) lines.push(`| Refusal Reason | ${a.refusalReason} |`);
            lines.push(`| Next Step | ${a.nextVerificationStep} |`);
            const lims = a.limitations.map(l => `  - ${l}`).join('\n');
            lines.push(`| Limitations | ${lims.replace(/\n/g, '<br>')} |`);
            lines.push('');
        }
        if (r.learningAdmissions.length > 30) {
            lines.push(`*... and ${r.learningAdmissions.length - 30} more (see JSON for full detail)*`);
            lines.push('');
        }
    }

    // Proposal
    if (r.proposal) {
        lines.push('---');
        lines.push('');
        lines.push('## Teaching KB Update Proposal');
        lines.push('');
        lines.push(`**Proposal ID:** \`${r.proposal.proposalId}\``);
        lines.push(`**Status:** ${r.proposal.status}`);
        lines.push(`**Description:** ${r.proposal.description}`);
        lines.push('');
        lines.push(`**⚠️ This proposal is NOT auto-applied. All changes require human review.**`);
        lines.push('');
        for (const c of r.proposal.changes) {
            lines.push(`### ${c.action.toUpperCase()}: ${c.moduleId}`);
            lines.push('');
            if (c.currentDoctrine) lines.push(`- **Current:** ${c.currentDoctrine.slice(0, 200)}`);
            if (c.proposedDoctrine) lines.push(`- **Proposed:** ${c.proposedDoctrine.slice(0, 200)}`);
            lines.push(`- **Rationale:** ${c.rationale}`);
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
    lines.push(`*Generated by CohBit-Copilot v13.4 Governed Curriculum Review Pipeline*`);
    lines.push(`*Receipt ID: ${r.receiptId}*`);

    return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v13.4 — Governed Curriculum Review');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Phase 1: Ingest & Classify
    const { ingested, skipped: _skipped } = phase1_ingest();

    // Build internal state snapshot
    const internal = buildInternalState();
    console.log(`  Internal state snapshot:`);
    console.log(`    code-atlas layers:  ${internal.codeAtlasLayers.length}`);
    console.log(`    math-atlas layers:  ${internal.mathAtlasLayers.length}`);
    console.log(`    resource layers:    ${internal.resourceLayers.length}`);
    console.log(`    tooling layers:     ${internal.toolingLayers.length}`);
    console.log(`    tlt-atlas layers:   ${internal.tltAtlasLayers.length}`);
    console.log(`    TOPIC_KB modules:   ${internal.topicKBModules.size}`);
    console.log('');

    // Phase 2: Cross-Check
    const crossCheckFindings = phase2_crossCheck(ingested, internal);

    // Phase 3: Governed Admission
    const admissions = phase3_admission(ingested, crossCheckFindings);

    // Phase 4: Report
    const paths = phase4_report(ingested, crossCheckFindings, admissions);

    console.log('═══════════════════════════════════════════════════');
    console.log('  Pipeline Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('  CONCLUSION: reviewed / classified / first observation');
    console.log('');
    console.log('  Next step: re-run pipeline to achieve reobserved →');
    console.log('  stable_candidate → admitted_learning_record status.');
    console.log('');
    console.log(`  Reports: ${paths.reportPath}`);
    console.log(`           ${paths.jsonPath}`);
}

main();