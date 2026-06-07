// CohBit-Copilot v13.6B — Content-Aware Confirmation + Curriculum Annotation (Tier B)
// Pipeline: Load prior reports → Annotate curriculum → Content compare → Report
//
// Operating law:
//   Tier B content-aware comparison may identify identical files, near matches,
//   role-equivalent files, stale snapshots, and conflicts across sibling codebases.
//   It may annotate curriculum observations with structural confirmation status.
//   It may not certify correctness, promote canon, rewrite memory, apply patches,
//   claim proof, or upgrade evidence beyond corpus_extracted without the full
//   learning admission lifecycle.
//
// Safe claim:
//   CohBit-Copilot v13.6B retroactively annotates v13.4 curriculum observations
//   using v13.6A cross-repo structural confirmation, upgrading eligible observations
//   from first_observation to cross_observed or strongly_structurally_confirmed.
//   It then performs content-aware comparison of role-equivalent files across
//   CohBit-CTRL, AIR-prime, and Cohbit-Copilot. All evidence remains capped at
//   corpus_extracted. Content confirmation does not certify correctness, promote
//   canon, or constitute admitted learning.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Constants ────────────────────────────────────────────────────

const BASE = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)';
const REPO_ROOTS = {
    ctrl: path.join(BASE, 'CohBit-CTRL'),
    air: path.join(BASE, 'AIR-prime'),
    copilot: path.join(BASE, 'Cohbit-Copilot'),
} as const;
type RepoKey = keyof typeof REPO_ROOTS;
const REPO_LABELS: Record<RepoKey, string> = { ctrl: 'CohBit-CTRL', air: 'AIR-prime', copilot: 'Cohbit-Copilot' };

const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const V13_4_PATH = path.join(OUTPUT_DIR, 'v13_4_curriculum_review.json');
const V13_6A_PATH = path.join(OUTPUT_DIR, 'v13_6A_cross_repo_structural.json');
const VERSION = '13.6B.0';

// ─── Types ────────────────────────────────────────────────────────

type AdmissionStatus =
    | 'first_observation' | 'cross_observed' | 'strongly_structurally_confirmed'
    | 'content_confirmed' | 'structurally_supported_stale_mapping'
    | 'reobserved' | 'stable_candidate' | 'admitted_learning_record' | 'refused';

type ContentMatchType =
    | 'identical_hash'
    | 'near_match'
    | 'same_role_different_form'
    | 'stale_snapshot'
    | 'conflict'
    | 'missing_counterpart';

interface PriorAdmission {
    eventId: string;
    sourceFile: string;
    corpusFamily: string;
    contentHash: string;
    matchedInternalModule: string | null;
    admissionStatus: string;
    crossCheckType: string | null;
}

interface PriorCrossCheck {
    id: string;
    sourceFile: string;
    corpusFamily: string;
    crossCheckType: string;
    matchedInternalModule: string | null;
    description: string;
}

interface PriorReviewReceipt {
    receiptId: string;
    summary: { totalFilesIngested: number; attestation: string; };
    ingestedFiles: { relativePath: string; corpusFamily: string; contentHash: string; }[];
    crossCheckFindings: PriorCrossCheck[];
    learningAdmissions: PriorAdmission[];
}

interface AnnotatedFinding {
    originalId: string;
    originalType: string;
    sourceFile: string;
    originalStatus: string;
    newStatus: AdmissionStatus | null;
    upgradeReason: string | null;
    upgraded: boolean;
}

interface ContentMatch {
    id: string;
    role: string;
    files: { repo: RepoKey; relativePath: string; contentHash: string; exists: boolean }[];
    matchType: ContentMatchType;
    description: string;
}

interface ContentReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    priorV13_4Id: string;
    priorV13_6AId: string;
    annotations: {
        totalFindings: number;
        upgraded: number;
        notUpgraded: number;
        byNewStatus: Record<string, number>;
    };
    contentMatches: {
        total: number;
        byType: Record<string, number>;
    };
    curriculumSummary: {
        originalFirstObservation: number;
        upgradedToCrossObserved: number;
        upgradedToStronglyConfirmed: number;
        staleMappingsAnnotated: number;
        gapsUnchanged: number;
    };
    matches: ContentMatch[];
    attestation: string;
}

// ─── Phase 1: Load Prior Reports ──────────────────────────────────

function loadPrior(path: string, label: string): any {
    if (!fs.existsSync(path)) throw new Error(`${label} not found at: ${path}`);
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
}

// ─── Phase 2: Cross-Annotate Curriculum ───────────────────────────

interface StructuralConfirmation {
    strongPatterns: string[];  // pattern names confirmed in all 3 repos
    sharedPatterns: string[];   // pattern names confirmed in 2 repos
}

function extractStructuralConfirmation(v13_6A: any): StructuralConfirmation {
    const strongPatterns: string[] = [];
    const sharedPatterns: string[] = [];
    for (const p of v13_6A.patterns || []) {
        if (p.category === 'strong_shared_pattern') strongPatterns.push(p.patternName);
        if (p.category === 'shared_pattern') sharedPatterns.push(p.patternName);
    }
    return { strongPatterns, sharedPatterns };
}

/** Determine if a curriculum finding should be upgraded based on structural patterns */
function shouldUpgrade(finding: PriorCrossCheck, structural: StructuralConfirmation): { upgrade: boolean; newStatus: AdmissionStatus | null; reason: string | null } {
    const desc = (finding.description || '').toLowerCase();
    const source = (finding.sourceFile || '').toLowerCase();
    const id = (finding.id || '').toLowerCase();

    // Multi-language interop
    if (desc.includes('multi-language') || desc.includes('interoperability') || desc.includes('cross language')) {
        const hasMulti = structural.strongPatterns.some(p => p.toLowerCase().includes('multi-language'));
        if (hasMulti) return { upgrade: true, newStatus: 'strongly_structurally_confirmed', reason: 'Multi-language architecture confirmed in all 3 repos' };
    }

    // Atlas / layer patterns
    if (desc.includes('atlas') || source.includes('atlas') || id.includes('atlas') || id.includes('tlt') || id.includes('code_') || id.includes('math_') || id.includes('res_') || id.includes('tool_')) {
        const hasLayers = structural.strongPatterns.some(p => p.toLowerCase().includes('layer'));
        const hasAtlas = structural.strongPatterns.some(p => p.toLowerCase().includes('atlas'));
        if (finding.crossCheckType === 'close_analogue') {
            if (hasLayers || hasAtlas) return { upgrade: true, newStatus: 'cross_observed', reason: 'Atlas/layer pattern structurally cross-observed across repos' };
        }
        if (finding.crossCheckType === 'stale_mapping') {
            if (hasLayers || hasAtlas) return { upgrade: true, newStatus: 'structurally_supported_stale_mapping', reason: 'Stale mapping structurally supported by layer patterns across repos' };
        }
    }

    // Verifier / lean / rust / proofs
    if (desc.includes('verifier') || desc.includes('lean') || desc.includes('proof') || desc.includes('formal') || desc.includes('rust')) {
        const hasVerifier = structural.strongPatterns.some(p => p.toLowerCase().includes('verifier'));
        const hasLean = structural.strongPatterns.some(p => p.toLowerCase().includes('lean'));
        const hasRust = structural.strongPatterns.some(p => p.toLowerCase().includes('rust'));
        if (hasVerifier || hasLean || hasRust) return { upgrade: true, newStatus: 'strongly_structurally_confirmed', reason: 'Verifier/Lean/Rust infrastructure confirmed across repos' };
    }

    // Receipt infrastructure
    if (desc.includes('receipt') || source.includes('receipt')) {
        const hasReceipt = structural.strongPatterns.some(p => p.toLowerCase().includes('receipt'));
        const hasSchemas = structural.strongPatterns.some(p => p.toLowerCase().includes('schema'));
        if (hasReceipt || hasSchemas) return { upgrade: true, newStatus: 'strongly_structurally_confirmed', reason: 'Receipt/schema infrastructure confirmed across repos' };
    }

    // Test vectors
    if (desc.includes('test_vector') || source.includes('test_vector')) {
        const hasTV = structural.strongPatterns.some(p => p.toLowerCase().includes('test_vector'));
        if (hasTV) return { upgrade: true, newStatus: 'strongly_structurally_confirmed', reason: 'Test vectors directory confirmed in all 3 repos' };
    }

    // CI/CD / release gates
    if (desc.includes('cicd') || desc.includes('ci/cd') || desc.includes('release') || desc.includes('pipeline') || desc.includes('gate')) {
        const hasCICD = structural.strongPatterns.some(p => p.toLowerCase().includes('ci/cd'));
        if (hasCICD) return { upgrade: true, newStatus: 'strongly_structurally_confirmed', reason: 'CI/CD infrastructure confirmed across repos' };
    }

    // Docs
    if (desc.includes('documentation') || (source.includes('docs') && finding.crossCheckType === 'close_analogue')) {
        const hasDocs = structural.strongPatterns.some(p => p.toLowerCase().includes('docs'));
        if (hasDocs) return { upgrade: true, newStatus: 'strongly_structurally_confirmed', reason: 'Documentation directory confirmed in all 3 repos' };
    }

    // Module gaps — explicitly NOT upgraded
    if (finding.crossCheckType === 'gap') {
        return { upgrade: false, newStatus: null, reason: 'Gap findings not upgraded by structural confirmation — requires content match (Tier B)' };
    }

    // Conflicts — explicitly NOT upgraded
    if (finding.crossCheckType === 'conflict') {
        return { upgrade: false, newStatus: null, reason: 'Conflict findings cannot be resolved by structural confirmation alone' };
    }

    return { upgrade: false, newStatus: null, reason: 'No structural pattern directly maps to this finding' };
}

function annotateCurriculum(v13_4: PriorReviewReceipt, v13_6A: any): AnnotatedFinding[] {
    const structural = extractStructuralConfirmation(v13_6A);
    const annotations: AnnotatedFinding[] = [];

    console.log(`  Strong structural patterns: ${structural.strongPatterns.length}`);
    console.log(`  Shared structural patterns: ${structural.sharedPatterns.length}`);
    console.log('');

    for (const finding of v13_4.crossCheckFindings) {
        const { upgrade, newStatus, reason } = shouldUpgrade(finding, structural);
        annotations.push({
            originalId: finding.id,
            originalType: finding.crossCheckType,
            sourceFile: finding.sourceFile,
            originalStatus: 'first_observation',
            newStatus: upgrade ? newStatus : null,
            upgradeReason: reason,
            upgraded: upgrade,
        });
    }

    const upgraded = annotations.filter(a => a.upgraded).length;
    const notUpgraded = annotations.filter(a => !a.upgraded).length;
    const byStatus: Record<string, number> = {};
    for (const a of annotations) {
        if (a.upgraded && a.newStatus) byStatus[a.newStatus] = (byStatus[a.newStatus] || 0) + 1;
    }

    console.log(`  Curriculum findings annotated: ${annotations.length}`);
    console.log(`    Upgraded:     ${upgraded}`);
    console.log(`    Not upgraded: ${notUpgraded}`);
    for (const [s, c] of Object.entries(byStatus).sort()) {
        console.log(`      ${s}: ${c}`);
    }
    console.log('');

    return annotations;
}

// ─── Phase 3: Tier B Content-Aware Comparison ────────────────────

function hashFile(absPath: string): string | null {
    try {
        const content = fs.readFileSync(absPath, 'utf-8');
        return crypto.createHash('sha256').update(content, 'utf-8').digest('hex').slice(0, 16);
    } catch { return null; }
}

interface RoleMapping {
    role: string;
    ctrl: string | null;
    air: string | null;
    copilot: string | null;
}

/** Define role-equivalent files across repos */
const ROLE_MAPPINGS: RoleMapping[] = [
    { role: 'SPEC / Architecture', ctrl: 'SPEC.md', air: 'SPEC.md', copilot: 'spec/SPEC.md' },
    { role: 'README', ctrl: 'README.md', air: 'README.md', copilot: 'README.md' },
    { role: 'LICENSE', ctrl: 'LICENSE', air: 'LICENSE', copilot: null },
    { role: 'Receipt Schema (JSON)', ctrl: 'schemas/cohbit_receipt.schema.json', air: null, copilot: 'schemas/cohbit_receipt.schema.json' },
    { role: 'Receipt Schema (Rust types)', ctrl: null, air: null, copilot: 'sdks/rust/src/types.rs' },
    { role: 'Canonical Serialization', ctrl: null, air: null, copilot: 'docs/canonical_serialization.md' },
    { role: 'Test Vectors — Identity', ctrl: 'test_vectors/id_conformance.json', air: null, copilot: 'test_vectors/id_conformance.json' },
    { role: 'Test Vectors — Canonical Hardening', ctrl: null, air: null, copilot: 'test_vectors/canonical_hardening.json' },
    { role: 'Test Vectors — Adversarial', ctrl: null, air: null, copilot: 'test_vectors/adversarial_cases.json' },
    { role: 'Architecture Docs', ctrl: null, air: null, copilot: 'docs/architecture.md' },
    { role: 'Learning Doctrine', ctrl: null, air: null, copilot: 'docs/learning_doctrine.md' },
    { role: 'Claim Table', ctrl: null, air: null, copilot: 'docs/claim_table.md' },
    { role: 'Language Split Doctrine', ctrl: null, air: null, copilot: 'docs/language_split_doctrine.md' },
    { role: 'CITATION', ctrl: null, air: 'CITATION.cff', copilot: null },
    { role: 'CONTRIBUTING', ctrl: null, air: 'CONTRIBUTING.md', copilot: null },
    { role: 'Makefile', ctrl: null, air: 'Makefile', copilot: null },
    { role: 'Lean — Reference Verifier', ctrl: 'lean/', air: 'lean/', copilot: 'reference-verifier/lean/' },
    { role: 'Rust — Reference Verifier', ctrl: 'src/', air: 'rust/', copilot: 'reference-verifier/rust/' },
    { role: 'Rust — SDK / Lib', ctrl: 'crates/', air: null, copilot: 'sdks/rust/' },
    { role: 'Python — SDK / Lib', ctrl: 'python_lib/', air: null, copilot: 'sdks/python/' },
];

/** Check if a file or directory exists at a repo root */
function resolveFile(repo: RepoKey, relPath: string | null): { exists: boolean; absPath: string | null } {
    if (!relPath) return { exists: false, absPath: null };
    const absPath = path.join(REPO_ROOTS[repo], relPath);
    const exists = fs.existsSync(absPath);
    // For directories, check it's a directory; for files, check it's a file
    if (exists) {
        try {
            const stat = fs.statSync(absPath);
            if (relPath.endsWith('/') && !stat.isDirectory()) return { exists: false, absPath: null };
            if (!relPath.endsWith('/') && !stat.isFile()) return { exists: false, absPath: null };
        } catch { return { exists: false, absPath: null }; }
    }
    return { exists, absPath: exists ? absPath : null };
}

function classifyContentMatch(
    hashes: (string | null)[],
    exists: boolean[],
): ContentMatchType {
    const presentHashes = hashes.filter(h => h !== null);
    const presentCount = presentHashes.length;

    if (presentCount === 0) return 'missing_counterpart';

    // All identical?
    const uniqueHashes = new Set(presentHashes);
    if (uniqueHashes.size === 1 && presentCount >= 2) return 'identical_hash';

    // All present and different — same role, different form
    if (presentCount >= 2 && uniqueHashes.size === presentCount) return 'same_role_different_form';

    // Only one present — missing counterparts
    if (presentCount === 1 && exists.filter(Boolean).length > 1) return 'missing_counterpart';

    return 'same_role_different_form';
}

function phase3_contentCompare(): ContentMatch[] {
    const matches: ContentMatch[] = [];
    let mid = 0;

    for (const mapping of ROLE_MAPPINGS) {
        mid++;
        const repos: RepoKey[] = ['ctrl', 'air', 'copilot'];
        const files: ContentMatch['files'] = [];
        const hashes: (string | null)[] = [];
        const exists: boolean[] = [];

        for (const repo of repos) {
            const relPath = mapping[repo as keyof typeof mapping] as string | null;
            const resolved = resolveFile(repo, relPath);
            exists.push(resolved.exists);
            let contentHash: string | null = null;
            if (resolved.exists && resolved.absPath && !relPath?.endsWith('/')) {
                contentHash = hashFile(resolved.absPath);
            }
            hashes.push(contentHash);
            files.push({
                repo,
                relativePath: relPath || '(none)',
                contentHash: contentHash || '(dir or absent)',
                exists: resolved.exists,
            });
        }

        const matchType = classifyContentMatch(hashes, exists);

        let description = '';
        if (matchType === 'identical_hash') {
            description = `SHA-256 content identical across repos (hash: ${hashes.find(h => h !== null)})`;
        } else if (matchType === 'same_role_different_form') {
            const present = files.filter(f => f.exists).map(f => REPO_LABELS[f.repo]).join(', ');
            description = `Same-role files present in [${present}] but with different content hashes`;
        } else if (matchType === 'missing_counterpart') {
            const present = files.filter(f => f.exists).map(f => REPO_LABELS[f.repo]).join(', ');
            const missing = files.filter(f => !f.exists).map(f => REPO_LABELS[f.repo]).join(', ');
            description = `Present in [${present}], missing in [${missing}]`;
        } else if (matchType === 'stale_snapshot') {
            description = 'One or more repos carry an older version';
        } else {
            description = 'Content match classification';
        }

        matches.push({ id: `CM_${mid}`, role: mapping.role, files, matchType, description });
    }

    return matches;
}

// ─── Phase 4: Report ──────────────────────────────────────────────

function renderMarkdown(
    annotations: AnnotatedFinding[],
    matches: ContentMatch[],
    receipt: ContentReceipt,
): string {
    const lines: string[] = [];
    lines.push('# CohBit-Copilot v13.6B — Content-Aware Confirmation + Curriculum Annotation (Tier B)');
    lines.push('');
    lines.push(`**Receipt ID:** \`${receipt.receiptId}\``);
    lines.push(`**Generated:** ${receipt.generatedAt}`);
    lines.push(`**Version:** ${receipt.version}`);
    lines.push(`**Prior v13.4:** \`${receipt.priorV13_4Id}\``);
    lines.push(`**Prior v13.6A:** \`${receipt.priorV13_6AId}\``);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Safe Claim');
    lines.push('');
    lines.push('> CohBit-Copilot v13.6B retroactively annotates v13.4 curriculum observations');
    lines.push('> using v13.6A cross-repo structural confirmation, upgrading eligible observations');
    lines.push('> from `first_observation` to `cross_observed` or `strongly_structurally_confirmed`.');
    lines.push('> It then performs content-aware comparison of role-equivalent files across');
    lines.push('> CohBit-CTRL, AIR-prime, and Cohbit-Copilot. All evidence remains capped at');
    lines.push('> `corpus_extracted`. Content confirmation does not certify correctness, promote');
    lines.push('> canon, or constitute admitted learning.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('### Curriculum Annotation');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Original v13.4 findings | ${receipt.curriculumSummary.originalFirstObservation + receipt.curriculumSummary.staleMappingsAnnotated + receipt.curriculumSummary.gapsUnchanged} |`);
    lines.push(`| Upgraded to cross_observed | ${receipt.curriculumSummary.upgradedToCrossObserved} |`);
    lines.push(`| Upgraded to strongly_structurally_confirmed | ${receipt.curriculumSummary.upgradedToStronglyConfirmed} |`);
    lines.push(`| Stale mappings annotated | ${receipt.curriculumSummary.staleMappingsAnnotated} |`);
    lines.push(`| Gaps unchanged | ${receipt.curriculumSummary.gapsUnchanged} |`);
    lines.push('');
    lines.push('### Content Matches');
    lines.push('');
    lines.push(`| Match Type | Count |`);
    lines.push(`|------------|-------|`);
    for (const [type, count] of Object.entries(receipt.contentMatches.byType).sort()) {
        lines.push(`| ${type} | ${count} |`);
    }
    lines.push('');

    // ── Upgraded annotations ──
    const upgraded = annotations.filter(a => a.upgraded);
    if (upgraded.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Upgraded Curriculum Annotations');
        lines.push('');
        lines.push('| Finding ID | Original Type | New Status | Reason |');
        lines.push('|------------|---------------|------------|--------|');
        for (const a of upgraded) {
            lines.push(`| ${a.originalId} | ${a.originalType} | \`${a.newStatus}\` | ${a.upgradeReason?.slice(0, 100) || ''} |`);
        }
        lines.push('');
    }

    // ── Not upgraded ──
    const notUpgraded = annotations.filter(a => !a.upgraded);
    if (notUpgraded.length > 0) {
        lines.push('---');
        lines.push('');
        lines.push('## Not Upgraded (Remain at Original Status)');
        lines.push('');
        lines.push('| Finding ID | Original Type | Reason |');
        lines.push('|------------|---------------|--------|');
        for (const a of notUpgraded) {
            lines.push(`| ${a.originalId} | ${a.originalType} | ${a.upgradeReason?.slice(0, 120) || 'N/A'} |`);
        }
        lines.push('');
    }

    // ── Content matches ──
    lines.push('---');
    lines.push('');
    lines.push('## Content-Aware Comparison Results');
    lines.push('');

    const matchGroups = {
        'identical_hash': matches.filter(m => m.matchType === 'identical_hash'),
        'same_role_different_form': matches.filter(m => m.matchType === 'same_role_different_form'),
        'missing_counterpart': matches.filter(m => m.matchType === 'missing_counterpart'),
    };

    for (const [groupName, groupMatches] of Object.entries(matchGroups)) {
        if (groupMatches.length === 0) continue;
        lines.push(`### ${groupName.replace(/_/g, ' ')} (${groupMatches.length})`);
        lines.push('');
        for (const m of groupMatches) {
            lines.push(`#### ${m.role}`);
            lines.push('');
            lines.push(`- **Match type:** \`${m.matchType}\``);
            lines.push(`- **Description:** ${m.description}`);
            lines.push('');
            lines.push('| Repo | File | Exists | Content Hash |');
            lines.push('|------|------|--------|-------------|');
            for (const f of m.files) {
                lines.push(`| ${REPO_LABELS[f.repo]} | \`${f.relativePath}\` | ${f.exists ? '✅' : '❌'} | \`${f.contentHash}\` |`);
            }
            lines.push('');
        }
    }

    // ── Evidence ladder ──
    lines.push('---');
    lines.push('');
    lines.push('## Updated Evidence Ladder (After v13.6B)');
    lines.push('');
    lines.push('```');
    lines.push('first_observation                      — curriculum only (v13.4)');
    lines.push('cross_observed                         — curriculum + ≥1 repo structurally (v13.6B)');
    lines.push('strong_structural_confirmation         — curriculum + all 3 repos structurally (v13.6B)');
    lines.push('structurally_supported_stale_mapping   — stale mapping backed by repo structure (v13.6B)');
    lines.push('content_confirmed                      — identical_hash or near_match (v13.6B Tier B)');
    lines.push('same_role_match                        — same_role_different_form (v13.6B Tier B)');
    lines.push('stable_candidate                       — ≥2 runs with same result (v13.5+)');
    lines.push('admitted_learning_record               — persisted, cross-checked, review-admitted');
    lines.push('```');
    lines.push('');
    lines.push('Current evidence ceiling for all: **corpus_extracted**');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Attestation');
    lines.push('');
    lines.push(receipt.attestation);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`*Generated by CohBit-Copilot v13.6B Content-Aware Confirmation + Curriculum Annotation Pipeline*`);
    lines.push(`*Receipt ID: ${receipt.receiptId}*`);
    lines.push(`*Prior v13.4: ${receipt.priorV13_4Id}*`);
    lines.push(`*Prior v13.6A: ${receipt.priorV13_6AId}*`);

    return lines.join('\n');
}

function phase4_report(
    annotations: AnnotatedFinding[],
    matches: ContentMatch[],
    v13_4: PriorReviewReceipt,
    v13_6A: any,
): { reportPath: string; jsonPath: string } {
    console.log('═══ Phase 4: Report Generation ═══\n');

    const receiptId = `CT_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const byNewStatus: Record<string, number> = {};
    for (const a of annotations) {
        if (a.upgraded && a.newStatus) byNewStatus[a.newStatus] = (byNewStatus[a.newStatus] || 0) + 1;
    }
    const byMatchType: Record<string, number> = {};
    for (const m of matches) byMatchType[m.matchType] = (byMatchType[m.matchType] || 0) + 1;

    const upgradedCrossObs = annotations.filter(a => a.newStatus === 'cross_observed').length;
    const upgradedStrong = annotations.filter(a => a.newStatus === 'strongly_structurally_confirmed').length;
    const staleAnnotated = annotations.filter(a => a.newStatus === 'structurally_supported_stale_mapping').length;
    const gapsUnchanged = annotations.filter(a => a.originalType === 'gap' && !a.upgraded).length;

    const receipt: ContentReceipt = {
        receiptId, version: VERSION,
        pipeline: 'v13.6B — Content-Aware Confirmation + Curriculum Annotation (Tier B)',
        generatedAt: new Date().toISOString(),
        priorV13_4Id: v13_4.receiptId,
        priorV13_6AId: v13_6A.receiptId || 'unknown',
        annotations: {
            totalFindings: annotations.length,
            upgraded: annotations.filter(a => a.upgraded).length,
            notUpgraded: annotations.filter(a => !a.upgraded).length,
            byNewStatus,
        },
        contentMatches: {
            total: matches.length,
            byType: byMatchType,
        },
        curriculumSummary: {
            originalFirstObservation: v13_4.crossCheckFindings.length,
            upgradedToCrossObserved: upgradedCrossObs,
            upgradedToStronglyConfirmed: upgradedStrong,
            staleMappingsAnnotated: staleAnnotated,
            gapsUnchanged,
        },
        matches,
        attestation:
            'CohBit-Copilot v13.6B retroactively annotates v13.4 curriculum observations using v13.6A cross-repo structural confirmation. Eligible findings are upgraded to cross_observed or strongly_structurally_confirmed. Stale mappings are annotated as structurally_supported where applicable. Gaps and conflicts are not upgraded. Content-aware comparison identifies hash-identical files, role-equivalent files, and missing counterparts. All evidence remains capped at corpus_extracted. Content confirmation does not certify correctness, promote canon, or constitute admitted learning.',
    };

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonPath = path.join(OUTPUT_DIR, 'v13_6B_content_confirmation.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  JSON report:  ${jsonPath}`);

    const mdPath = path.join(OUTPUT_DIR, 'v13_6B_content_confirmation.md');
    const md = renderMarkdown(annotations, matches, receipt);
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  MD report:    ${mdPath}`);
    console.log('');

    return { reportPath: mdPath, jsonPath };
}

// ─── Main ─────────────────────────────────────────────────────────

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v13.6B — Content-Aware Confirmation + Curriculum Annotation');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Phase 1: Load prior reports
    console.log('═══ Phase 1: Load Prior Reports ═══\n');
    const v13_4 = loadPrior(V13_4_PATH, 'v13.4 report') as PriorReviewReceipt;
    const v13_6A = loadPrior(V13_6A_PATH, 'v13.6A report');
    console.log(`  v13.4: ${v13_4.receiptId} (${v13_4.crossCheckFindings.length} findings)`);
    console.log(`  v13.6A: ${v13_6A.receiptId} (${(v13_6A.patterns || []).length} structural patterns)`);
    console.log('');

    // Phase 2: Annotate curriculum
    console.log('═══ Phase 2: Cross-Annotate Curriculum Observations ═══\n');
    const annotations = annotateCurriculum(v13_4, v13_6A);

    // Phase 3: Content-aware comparison
    console.log('═══ Phase 3: Tier B Content-Aware Comparison ═══\n');
    const matches = phase3_contentCompare();
    const byType: Record<string, number> = {};
    for (const m of matches) byType[m.matchType] = (byType[m.matchType] || 0) + 1;
    console.log(`  Total content comparisons: ${matches.length}`);
    for (const [type, count] of Object.entries(byType).sort()) {
        console.log(`    ${type}: ${count}`);
    }
    console.log('');

    // Phase 4: Report
    const paths = phase4_report(annotations, matches, v13_4, v13_6A);

    console.log('═══════════════════════════════════════════════════');
    console.log('  Pipeline Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log('  Curriculum annotation:');
    console.log(`    Upgraded to cross_observed:            ${annotations.filter(a => a.newStatus === 'cross_observed').length}`);
    console.log(`    Upgraded to strongly_confirmed:        ${annotations.filter(a => a.newStatus === 'strongly_structurally_confirmed').length}`);
    console.log(`    Stale mappings annotated:              ${annotations.filter(a => a.newStatus === 'structurally_supported_stale_mapping').length}`);
    console.log(`    Not upgraded (gaps/conflicts/other):   ${annotations.filter(a => !a.upgraded).length}`);
    console.log('');
    console.log('  Content comparison:');
    console.log(`    identical_hash:          ${byType['identical_hash'] || 0}`);
    console.log(`    same_role_different_form: ${byType['same_role_different_form'] || 0}`);
    console.log(`    missing_counterpart:      ${byType['missing_counterpart'] || 0}`);
    console.log('');
    console.log('  Evidence ceiling: corpus_extracted (unchanged)');
    console.log('');
    console.log(`  Reports: ${paths.reportPath}`);
    console.log(`           ${paths.jsonPath}`);
}

main();