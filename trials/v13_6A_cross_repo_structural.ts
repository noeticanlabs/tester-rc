// CohBit-Copilot v13.6A — Cross-Repo Structural Confirmation (Tier A)
// Pipeline: Scan 3 repos → Cross-compare structure → Classify patterns → Report
//
// Operating law:
//   Cross-repo structural confirmation may identify recurring architecture
//   patterns, shared conventions, and candidate structural learning records.
//   It may not certify correctness, promote canon, rewrite memory, apply
//   patches, or claim proof.
//
// Safe claim:
//   CohBit-Copilot v13.6A performs a structural scan of three sibling codebases
//   (CohBit-CTRL, AIR-prime, Cohbit-Copilot) and identifies shared architectural
//   patterns across them. "Confirmed" means the same structural pattern appears
//   across multiple codebases and is eligible for stronger review in Tier B.
//   It does not certify correctness, promote canon, verify content, or modify
//   any source. This is a structural observation only.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Constants ────────────────────────────────────────────────────

const BASE = 'C:\\Users\\truea\\OneDrive\\Documents\\New folder (2)';

const REPOS = {
    ctrl: path.join(BASE, 'CohBit-CTRL'),
    air: path.join(BASE, 'AIR-prime'),
    copilot: path.join(BASE, 'Cohbit-Copilot'),
} as const;

const REPO_LABELS = {
    ctrl: 'CohBit-CTRL',
    air: 'AIR-prime',
    copilot: 'Cohbit-Copilot',
} as const;

type RepoKey = keyof typeof REPOS;

const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const VERSION = '13.6A.0';

// ─── Types ────────────────────────────────────────────────────────

type PatternConfidence =
    | 'observed'           // 1 repo
    | 'cross_observed'     // 2 repos
    | 'strongly_confirmed'; // 3 repos

type PatternCategory =
    | 'strong_shared_pattern'
    | 'shared_pattern'
    | 'repo_specific_pattern'
    | 'missing_expected_pattern'
    | 'unknown';

interface RepoScan {
    repoKey: RepoKey;
    repoLabel: string;
    rootPath: string;
    totalFiles: number;
    totalDirs: number;
    topLevelDirs: string[];
    topLevelFiles: string[];
    extensionDistribution: Record<string, number>;
    languagePresence: {
        rust: boolean;
        lean: boolean;
        typescript: boolean;
        python: boolean;
        javascript: boolean;
        markdown: boolean;
        toml: boolean;
        json: boolean;
    };
    directoryPresence: Record<string, boolean>;
    layerPatterns: { prefix: string; matches: string[] }[];
    atlasStructures: string[];
    verifierPresence: boolean;
    receiptInfrastructure: boolean;
    specPresence: boolean;
    cicdPresence: boolean;
    sdkPresence: boolean;
}

interface StructuralPattern {
    id: string;
    patternName: string;
    category: PatternCategory;
    confidence: PatternConfidence;
    repos: RepoKey[];
    description: string;
    curriculumReference: string | null;
}

interface TierBRecommendation {
    recommended: boolean;
    reason: string;
    strongSharedCount: number;
    sharedCount: number;
    threshold: { strongShared: number; shared: number };
}

interface StructuralReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    repoScans: Record<RepoKey, RepoScan>;
    patterns: StructuralPattern[];
    tierBRecommendation: TierBRecommendation;
    summary: {
        totalPatterns: number;
        strongSharedPatterns: number;
        sharedPatterns: number;
        repoSpecificPatterns: number;
        missingExpectedPatterns: number;
        attestation: string;
    };
}

// ─── Phase 1: Scan Repos ──────────────────────────────────────────

/** Walk a directory non-recursively to get top-level entries */
function topLevelEntries(dirPath: string): { dirs: string[]; files: string[] } {
    const dirs: string[] = [];
    const files: string[] = [];
    if (!fs.existsSync(dirPath)) return { dirs, files };
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const e of entries) {
        if (e.name.startsWith('.') && e.name !== '.github') continue; // skip hidden except .github
        if (e.isDirectory()) dirs.push(e.name);
        else files.push(e.name);
    }
    return { dirs, files };
}

/** Recursively walk a directory and return all file paths */
function walkAllFiles(dirPath: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(dirPath)) return results;
    const stack = [dirPath];
    while (stack.length > 0) {
        const current = stack.pop()!;
        let entries: fs.Dirent[];
        try { entries = fs.readdirSync(current, { withFileTypes: true }); }
        catch { continue; }
        for (const e of entries) {
            const full = path.join(current, e.name);
            if (e.name === 'node_modules' || e.name === 'target' || e.name === '.git' || e.name === '.cohbit' || e.name === '.kilo') continue;
            if (e.isDirectory()) { stack.push(full); }
            else if (e.isFile()) { results.push(full); }
        }
    }
    return results;
}

/** Detect language presence from extensions */
function detectLanguagePresence(exts: Record<string, number>) {
    return {
        rust: !!(exts['.rs']),
        lean: !!(exts['.lean']),
        typescript: !!(exts['.ts'] || exts['.tsx']),
        python: !!(exts['.py']),
        javascript: !!(exts['.js'] || exts['.jsx']),
        markdown: !!(exts['.md']),
        toml: !!(exts['.toml']),
        json: !!(exts['.json'] || exts['.jsonl']),
    };
}

/** Detect layer naming patterns in file/directory names */
function detectLayerPatterns(allFiles: string[]): { prefix: string; matches: string[] }[] {
    const prefixes = ['L', 'M', 'R', 'T'];
    const results: { prefix: string; matches: string[] }[] = [];
    for (const pfx of prefixes) {
        const regex = new RegExp(`[\\\\/]${pfx}\\d+`, 'i');
        const matches = allFiles.filter(f => regex.test(f));
        if (matches.length > 0) {
            results.push({ prefix: pfx, matches: matches.slice(0, 20) });
        }
    }
    return results;
}

/** Detect atlas-like structures */
function detectAtlasStructures(topDirs: string[], allFiles: string[]): string[] {
    const atlas: string[] = [];
    const atlasKeywords = ['atlas', 'layer', 'invariant', 'artifact'];
    for (const d of topDirs) {
        if (atlasKeywords.some(k => d.toLowerCase().includes(k))) atlas.push(d);
    }
    // Also check for atlas in subdirectory paths
    for (const f of allFiles) {
        const lower = f.toLowerCase();
        if (lower.includes('atlas') && !atlas.some(a => lower.includes(a.toLowerCase()))) {
            const parts = f.split(path.sep);
            if (parts.length > 1) {
                const dir = parts.slice(0, 2).join('/');
                if (!atlas.includes(dir)) atlas.push(dir);
            }
        }
    }
    return atlas.slice(0, 10);
}

/** Scan one repo */
function scanRepo(repoKey: RepoKey): RepoScan {
    const rootPath = REPOS[repoKey];
    const label = REPO_LABELS[repoKey];

    const { dirs, files } = topLevelEntries(rootPath);
    const allFiles = walkAllFiles(rootPath);

    const extDist: Record<string, number> = {};
    for (const f of allFiles) {
        const ext = path.extname(f).toLowerCase() || '(no ext)';
        extDist[ext] = (extDist[ext] || 0) + 1;
    }

    const langPresence = detectLanguagePresence(extDist);

    // Build directory presence map for common structural dirs
    const commonDirs = ['docs', 'src', 'tests', 'reports', 'receipts', 'schemas', 'spec',
        'test_vectors', 'scripts', 'benches', 'lean', 'rust', 'python_lib', 'sdks',
        'packages', 'reference-verifier', 'crates', 'audit', 'visualizer', 'assets',
        'sandbox', 'trials', 'examples'];
    const dirPresence: Record<string, boolean> = {};
    const allDirNames = new Set<string>();
    // Collect all directory names at depth 0-2
    function collectDirs(p: string, depth: number) {
        if (depth > 2 || !fs.existsSync(p)) return;
        try {
            for (const e of fs.readdirSync(p, { withFileTypes: true })) {
                if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'target') continue;
                if (e.isDirectory()) {
                    allDirNames.add(e.name);
                    if (depth < 2) collectDirs(path.join(p, e.name), depth + 1);
                }
            }
        } catch { /* skip */ }
    }
    collectDirs(rootPath, 0);
    for (const d of commonDirs) dirPresence[d] = allDirNames.has(d);
    // Also record all top-level directories
    const allTopDirs = new Set(dirs);
    for (const d of commonDirs) {
        if (allTopDirs.has(d)) dirPresence[d] = true;
    }

    // Detect verifier/reference directories
    const verifierPresence = allDirNames.has('reference-verifier') || allDirNames.has('verifier') ||
        dirs.some(d => d.toLowerCase().includes('verif'));

    // Detect receipt infrastructure
    const receiptInfrastructure = allDirNames.has('receipts') ||
        dirs.some(d => d.toLowerCase().includes('receipt'));

    // SPEC.md or equivalent
    const specPresence = files.some(f => f.toLowerCase().includes('spec.md') || f.toLowerCase() === 'spec.md');

    // CI/CD
    const cicdPresence = dirs.some(d => d === '.github') ||
        files.some(f => f === '.github' || f.toLowerCase().includes('ci') || f === 'Makefile');

    // SDK presence
    const sdkPresence = allDirNames.has('sdks') || allDirNames.has('python_lib') ||
        dirs.some(d => d.toLowerCase().includes('sdk'));

    const layerPatterns = detectLayerPatterns(allFiles);
    const atlasStructures = detectAtlasStructures(dirs, allFiles);

    return {
        repoKey, repoLabel: label, rootPath,
        totalFiles: allFiles.length,
        totalDirs: 0, // computed from walk, approximate
        topLevelDirs: dirs,
        topLevelFiles: files,
        extensionDistribution: extDist,
        languagePresence: langPresence,
        directoryPresence: dirPresence,
        layerPatterns,
        atlasStructures,
        verifierPresence,
        receiptInfrastructure,
        specPresence,
        cicdPresence,
        sdkPresence,
    };
}

// ─── Phase 2: Cross-Repo Comparison ───────────────────────────────

function compareRepos(scans: Record<RepoKey, RepoScan>): StructuralPattern[] {
    const patterns: StructuralPattern[] = [];
    let pid = 0;

    const keys: RepoKey[] = ['ctrl', 'air', 'copilot'];

    // Helper: count repos where a condition holds
    function repoCount(cond: (k: RepoKey) => boolean): RepoKey[] {
        return keys.filter(cond);
    }

    function classify(count: number): { category: PatternCategory; confidence: PatternConfidence } {
        if (count === 3) return { category: 'strong_shared_pattern', confidence: 'strongly_confirmed' };
        if (count === 2) return { category: 'shared_pattern', confidence: 'cross_observed' };
        return { category: 'repo_specific_pattern', confidence: 'observed' };
    }

    // ── Language presence patterns ──
    const languages = ['rust', 'lean', 'typescript', 'python', 'javascript', 'markdown', 'toml', 'json'] as const;
    for (const lang of languages) {
        pid++;
        const repos = repoCount(k => scans[k].languagePresence[lang]);
        const cls = classify(repos.length);
        patterns.push({
            id: `P_LANG_${lang.toUpperCase()}_${pid}`,
            patternName: `Language: ${lang}`,
            category: cls.category,
            confidence: cls.confidence,
            repos,
            description: `${lang} source files detected in ${repos.length}/3 repos`,
            curriculumReference: null,
        });
    }

    // ── Directory presence patterns ──
    const structuralDirs = [
        'docs', 'src', 'tests', 'reports', 'receipts', 'schemas', 'spec',
        'test_vectors', 'scripts', 'benches', 'lean', 'rust',
        'packages', 'crates', 'sandbox', 'trials', 'examples',
    ];
    for (const d of structuralDirs) {
        pid++;
        const repos = repoCount(k => scans[k].directoryPresence[d] === true);
        const cls = classify(repos.length);
        const missing = keys.filter(k => !scans[k].directoryPresence[d]);
        let desc = `Directory \`${d}/\` found in ${repos.length}/3 repos`;
        if (missing.length > 0) desc += `. Missing: ${missing.map(m => REPO_LABELS[m]).join(', ')}`;
        patterns.push({
            id: `P_DIR_${d.toUpperCase()}_${pid}`,
            patternName: `Directory: ${d}/`,
            category: cls.category,
            confidence: cls.confidence,
            repos,
            description: desc,
            curriculumReference: null,
        });
    }

    // ── Feature flags ──
    const features = [
        { key: 'verifierPresence', label: 'Verifier/reference infrastructure' },
        { key: 'receiptInfrastructure', label: 'Receipt infrastructure' },
        { key: 'specPresence', label: 'SPEC.md or equivalent' },
        { key: 'cicdPresence', label: 'CI/CD configuration' },
        { key: 'sdkPresence', label: 'SDK / language bindings' },
    ] as const;

    for (const feat of features) {
        pid++;
        const repos = repoCount(k => !!scans[k][feat.key]);
        const cls = classify(repos.length);
        patterns.push({
            id: `P_FEAT_${feat.key.toUpperCase()}_${pid}`,
            patternName: feat.label,
            category: cls.category,
            confidence: cls.confidence,
            repos,
            description: `${feat.label} detected in ${repos.length}/3 repos`,
            curriculumReference: null,
        });
    }

    // ── Layer patterns ──
    const allPrefixes = new Set<string>();
    for (const k of keys) {
        for (const lp of scans[k].layerPatterns) allPrefixes.add(lp.prefix);
    }
    for (const pfx of allPrefixes) {
        pid++;
        const repos = repoCount(k => scans[k].layerPatterns.some(lp => lp.prefix === pfx));
        const cls = classify(repos.length);
        patterns.push({
            id: `P_LAYER_${pfx}_${pid}`,
            patternName: `Layer naming: ${pfx}*`,
            category: cls.category,
            confidence: cls.confidence,
            repos,
            description: `Layer prefix "${pfx}" detected in ${repos.length}/3 repos`,
            curriculumReference: 'Curriculum: Code Invariant Atlas, Mathematics Atlas',
        });
    }

    // ── Atlas structures ──
    pid++;
    const atlasRepos = repoCount(k => scans[k].atlasStructures.length > 0);
    const atlasCls = classify(atlasRepos.length);
    patterns.push({
        id: `P_ATLAS_${pid}`,
        patternName: 'Atlas-like structures',
        category: atlasCls.category,
        confidence: atlasCls.confidence,
        repos: atlasRepos,
        description: `Atlas-like directory structures found in ${atlasRepos.length}/3 repos`,
        curriculumReference: 'Curriculum: Code Invariant Atlas, Bilingual Atlas',
    });

    // ── Multi-language repos ──
    pid++;
    const multiLangRepos = repoCount(k => {
        const lp = scans[k].languagePresence;
        return [lp.rust, lp.lean, lp.typescript, lp.python].filter(Boolean).length >= 2;
    });
    const mlCls = classify(multiLangRepos.length);
    patterns.push({
        id: `P_MULTILANG_${pid}`,
        patternName: 'Multi-language codebase (≥2 of Rust/Lean/TS/Python)',
        category: mlCls.category,
        confidence: mlCls.confidence,
        repos: multiLangRepos,
        description: `Multi-language codebase pattern found in ${multiLangRepos.length}/3 repos`,
        curriculumReference: 'Curriculum: Module 7 — Multi-Language Transition Interoperability',
    });

    // ── File count distribution ──
    pid++;
    const fileCounts = keys.map(k => ({ repo: k, count: scans[k].totalFiles }));
    patterns.push({
        id: `P_FILECOUNT_${pid}`,
        patternName: 'File count distribution',
        category: 'unknown',
        confidence: 'observed',
        repos: keys,
        description: `File counts: ${fileCounts.map(f => `${REPO_LABELS[f.repo]}: ${f.count}`).join(', ')}`,
        curriculumReference: null,
    });

    // ── Top-level file count ──
    pid++;
    const tlCounts = keys.map(k => ({ repo: k, count: scans[k].topLevelFiles.length }));
    patterns.push({
        id: `P_TOPLEVEL_${pid}`,
        patternName: 'Top-level file count',
        category: 'unknown',
        confidence: 'observed',
        repos: keys,
        description: `Top-level files: ${tlCounts.map(t => `${REPO_LABELS[t.repo]}: ${t.count}`).join(', ')}`,
        curriculumReference: null,
    });

    return patterns;
}

// ─── Phase 3: Tier B Recommendation ───────────────────────────────

function recommendTierB(patterns: StructuralPattern[]): TierBRecommendation {
    const strongShared = patterns.filter(p => p.category === 'strong_shared_pattern').length;
    const shared = patterns.filter(p => p.category === 'shared_pattern').length;
    const threshold = { strongShared: 5, shared: 10 };
    const recommended = strongShared >= threshold.strongShared || shared >= threshold.shared;
    const reason = recommended
        ? `Sufficient shared structure: ${strongShared} strongly shared + ${shared} shared patterns. Tier B content-aware comparison recommended.`
        : `Insufficient shared structure: ${strongShared}/${threshold.strongShared} strongly shared, ${shared}/${threshold.shared} shared patterns. Tier B not recommended at this time.`;
    return { recommended, reason, strongSharedCount: strongShared, sharedCount: shared, threshold };
}

// ─── Phase 4: Report ──────────────────────────────────────────────

function renderMarkdown(r: StructuralReceipt): string {
    const lines: string[] = [];
    lines.push('# CohBit-Copilot v13.6A — Cross-Repo Structural Confirmation (Tier A)');
    lines.push('');
    lines.push(`**Receipt ID:** \`${r.receiptId}\``);
    lines.push(`**Generated:** ${r.generatedAt}`);
    lines.push(`**Version:** ${r.version}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Safe Claim');
    lines.push('');
    lines.push('> CohBit-Copilot v13.6A performs a structural scan of three sibling codebases');
    lines.push('> (CohBit-CTRL, AIR-prime, Cohbit-Copilot) and identifies shared architectural');
    lines.push('> patterns across them. "Confirmed" means the same structural pattern appears');
    lines.push('> across multiple codebases and is eligible for stronger review in Tier B.');
    lines.push('> It does not certify correctness, promote canon, verify content, or modify');
    lines.push('> any source. This is a structural observation only.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Total patterns identified | ${r.summary.totalPatterns} |`);
    lines.push(`| Strong shared (3 repos) | ${r.summary.strongSharedPatterns} |`);
    lines.push(`| Shared (2 repos) | ${r.summary.sharedPatterns} |`);
    lines.push(`| Repo-specific (1 repo) | ${r.summary.repoSpecificPatterns} |`);
    lines.push(`| Missing expected | ${r.summary.missingExpectedPatterns} |`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Repo Scan Overview');
    lines.push('');
    for (const key of ['ctrl', 'air', 'copilot'] as RepoKey[]) {
        const s = r.repoScans[key];
        lines.push(`### ${s.repoLabel}`);
        lines.push('');
        lines.push(`- **Path:** \`${s.rootPath}\``);
        lines.push(`- **Total files:** ${s.totalFiles}`);
        lines.push(`- **Top-level dirs:** ${s.topLevelDirs.length}`);
        lines.push(`- **Top-level files:** ${s.topLevelFiles.length}`);
        lines.push('');
        lines.push('**Top-level directories:**');
        for (const d of s.topLevelDirs.slice(0, 20)) lines.push(`  - \`${d}/\``);
        if (s.topLevelDirs.length > 20) lines.push(`  - *... and ${s.topLevelDirs.length - 20} more*`);
        lines.push('');
        lines.push('**Language presence:**');
        const lp = s.languagePresence;
        lines.push(`  - Rust: ${lp.rust ? '✅' : '❌'}`);
        lines.push(`  - Lean: ${lp.lean ? '✅' : '❌'}`);
        lines.push(`  - TypeScript: ${lp.typescript ? '✅' : '❌'}`);
        lines.push(`  - Python: ${lp.python ? '✅' : '❌'}`);
        lines.push(`  - JavaScript: ${lp.javascript ? '✅' : '❌'}`);
        lines.push('');
        lines.push('**File extensions (top 10):**');
        const sortedExts = Object.entries(s.extensionDistribution).sort((a, b) => b[1] - a[1]).slice(0, 10);
        for (const [ext, count] of sortedExts) lines.push(`  - \`${ext}\`: ${count}`);
        lines.push('');
        if (s.layerPatterns.length > 0) {
            lines.push('**Layer naming patterns:**');
            for (const lp2 of s.layerPatterns) {
                lines.push(`  - ${lp2.prefix}*: ${lp2.matches.length} matches`);
            }
            lines.push('');
        }
    }

    lines.push('---');
    lines.push('');
    lines.push('## Identified Patterns');
    lines.push('');

    const catGroups = {
        'Strong Shared (3 repos)': r.patterns.filter(p => p.category === 'strong_shared_pattern'),
        'Shared (2 repos)': r.patterns.filter(p => p.category === 'shared_pattern'),
        'Repo-Specific (1 repo)': r.patterns.filter(p => p.category === 'repo_specific_pattern'),
        'Missing Expected': r.patterns.filter(p => p.category === 'missing_expected_pattern'),
        'Unknown / Info': r.patterns.filter(p => p.category === 'unknown'),
    };

    for (const [groupName, groupPatterns] of Object.entries(catGroups)) {
        if (groupPatterns.length === 0) continue;
        lines.push(`### ${groupName} (${groupPatterns.length})`);
        lines.push('');
        lines.push('| Pattern | Repos | Confidence |');
        lines.push('|---------|-------|------------|');
        for (const p of groupPatterns) {
            const repoLabels = p.repos.map(r => REPO_LABELS[r]).join(', ');
            lines.push(`| ${p.patternName} | ${repoLabels} | \`${p.confidence}\` |`);
        }
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Pattern Detail');
    lines.push('');
    for (const p of r.patterns) {
        lines.push(`### ${p.id} — \`${p.confidence}\``);
        lines.push('');
        lines.push(`- **Pattern:** ${p.patternName}`);
        lines.push(`- **Category:** ${p.category}`);
        lines.push(`- **Repos:** ${p.repos.map(r => REPO_LABELS[r]).join(', ')}`);
        lines.push(`- **Description:** ${p.description}`);
        if (p.curriculumReference) lines.push(`- **Curriculum reference:** ${p.curriculumReference}`);
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## Tier B Recommendation');
    lines.push('');
    lines.push(`**Recommended:** ${r.tierBRecommendation.recommended ? '✅ YES' : '❌ NO'}`);
    lines.push('');
    lines.push(`**Reason:** ${r.tierBRecommendation.reason}`);
    lines.push('');
    lines.push(`| Threshold | Required | Actual |`);
    lines.push(`|-----------|----------|--------|`);
    lines.push(`| Strong shared patterns | ≥ ${r.tierBRecommendation.threshold.strongShared} | ${r.tierBRecommendation.strongSharedCount} |`);
    lines.push(`| Shared patterns | ≥ ${r.tierBRecommendation.threshold.shared} | ${r.tierBRecommendation.sharedCount} |`);
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('## Attestation');
    lines.push('');
    lines.push(r.summary.attestation);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`*Generated by CohBit-Copilot v13.6A Cross-Repo Structural Confirmation Pipeline*`);
    lines.push(`*Receipt ID: ${r.receiptId}*`);

    return lines.join('\n');
}

function phase4_report(
    scans: Record<RepoKey, RepoScan>,
    patterns: StructuralPattern[],
    tierB: TierBRecommendation,
): { reportPath: string; jsonPath: string } {
    console.log('═══ Phase 4: Report Generation ═══\n');

    const receiptId = `XR_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const receipt: StructuralReceipt = {
        receiptId, version: VERSION,
        pipeline: 'v13.6A — Cross-Repo Structural Confirmation (Tier A)',
        generatedAt: new Date().toISOString(),
        repoScans: scans,
        patterns,
        tierBRecommendation: tierB,
        summary: {
            totalPatterns: patterns.length,
            strongSharedPatterns: patterns.filter(p => p.category === 'strong_shared_pattern').length,
            sharedPatterns: patterns.filter(p => p.category === 'shared_pattern').length,
            repoSpecificPatterns: patterns.filter(p => p.category === 'repo_specific_pattern').length,
            missingExpectedPatterns: patterns.filter(p => p.category === 'missing_expected_pattern').length,
            attestation:
                'CohBit-Copilot v13.6A performs a structural scan of three sibling codebases (CohBit-CTRL, AIR-prime, Cohbit-Copilot) and identifies shared architectural patterns across them. "Confirmed" means the same structural pattern appears across multiple codebases and is eligible for stronger review in Tier B. It does not certify correctness, promote canon, verify content, or modify any source. This is a structural observation only.',
        },
    };

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonPath = path.join(OUTPUT_DIR, 'v13_6A_cross_repo_structural.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  JSON report:  ${jsonPath}`);

    const mdPath = path.join(OUTPUT_DIR, 'v13_6A_cross_repo_structural.md');
    const md = renderMarkdown(receipt);
    fs.writeFileSync(mdPath, md, 'utf-8');
    console.log(`  MD report:    ${mdPath}`);
    console.log('');

    return { reportPath: mdPath, jsonPath };
}

// ─── Main ─────────────────────────────────────────────────────────

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v13.6A — Cross-Repo Structural Confirmation (Tier A)');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    // Phase 1: Scan all three repos
    console.log('═══ Phase 1: Structural Scan ═══\n');
    const scans = {} as Record<RepoKey, RepoScan>;
    for (const key of ['ctrl', 'air', 'copilot'] as RepoKey[]) {
        console.log(`  Scanning ${REPO_LABELS[key]}...`);
        scans[key] = scanRepo(key);
        const s = scans[key];
        console.log(`    Files: ${s.totalFiles} | Top-level dirs: ${s.topLevelDirs.length} | Extensions: ${Object.keys(s.extensionDistribution).length}`);
        console.log(`    Languages: Rust=${s.languagePresence.rust} Lean=${s.languagePresence.lean} TS=${s.languagePresence.typescript} Python=${s.languagePresence.python}`);
        if (s.layerPatterns.length > 0) {
            console.log(`    Layers: ${s.layerPatterns.map(l => `${l.prefix}*(${l.matches.length})`).join(', ')}`);
        }
        console.log('');
    }

    // Phase 2: Cross-repo comparison
    console.log('═══ Phase 2: Cross-Repo Comparison ═══\n');
    const patterns = compareRepos(scans);
    const byCat: Record<string, number> = {};
    for (const p of patterns) byCat[p.category] = (byCat[p.category] || 0) + 1;
    console.log(`  Total patterns: ${patterns.length}`);
    for (const [cat, count] of Object.entries(byCat).sort()) {
        console.log(`    ${cat}: ${count}`);
    }
    console.log('');

    // Phase 3: Tier B recommendation
    console.log('═══ Phase 3: Tier B Recommendation ═══\n');
    const tierB = recommendTierB(patterns);
    console.log(`  Recommended: ${tierB.recommended ? 'YES' : 'NO'}`);
    console.log(`  ${tierB.reason}`);
    console.log('');

    // Phase 4: Report
    const paths = phase4_report(scans, patterns, tierB);

    console.log('═══════════════════════════════════════════════════');
    console.log('  Pipeline Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log(`  Strong shared (3 repos): ${tierB.strongSharedCount}`);
    console.log(`  Shared (2 repos):        ${tierB.sharedCount}`);
    console.log('');
    if (tierB.recommended) {
        console.log('  ✅ Tier B RECOMMENDED — sufficient shared structure detected.');
    } else {
        console.log('  ❌ Tier B NOT recommended — insufficient shared structure.');
    }
    console.log('');
    console.log(`  Reports: ${paths.reportPath}`);
    console.log(`           ${paths.jsonPath}`);
}

main();