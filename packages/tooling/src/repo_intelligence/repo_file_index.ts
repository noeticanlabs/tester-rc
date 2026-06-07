// @cohbit/tooling — Repo File Index (v3.5)
// Classifies all files in a repository: source, test, config, docs, etc.
// Operating law: classification is heuristic, not authoritative.

export interface RepoFileIndex {
    sources: string[];
    tests: string[];
    configs: string[];
    docs: string[];
    generated: string[];
    others: string[];
    all: string[];
}

const SRC_DIRS = ['/src/', '\\src\\', '/lib/', '\\lib\\', '/crates/', '\\crates\\'];
const TEST_DIRS = ['/tests/', '\\tests\\', '/__tests__/', '\\__tests__\\', '/spec/', '\\spec\\'];
const CONFIG_FILES = ['.json', '.toml', '.yaml', '.yml', '.lock', '.config.', 'Cargo.toml', 'package.json'];
const DOC_EXTS = ['.md', '.rst', '.txt', '.adoc'];
const GEN_DIRS = ['/target/', '\\target\\', '/node_modules/', '\\node_modules\\', '/dist/', '\\dist\\', '/build/', '\\build\\'];

export function buildFileIndex(filePaths: string[]): RepoFileIndex {
    const index: RepoFileIndex = { sources: [], tests: [], configs: [], docs: [], generated: [], others: [], all: filePaths };

    for (const f of filePaths) {
        const lower = f.toLowerCase();

        // Generated / build artifacts — skip
        if (GEN_DIRS.some(d => lower.includes(d))) { index.generated.push(f); continue; }

        // Test files
        if (f.endsWith('_test.rs') || f.endsWith('_test.ts') || f.endsWith('.test.ts') ||
            f.endsWith('.test.js') || f.startsWith('test_') ||
            TEST_DIRS.some(d => lower.includes(d))) {
            index.tests.push(f); continue;
        }

        // Config files
        if (CONFIG_FILES.some(e => f.endsWith(e)) && !SRC_DIRS.some(d => lower.includes(d))) {
            index.configs.push(f); continue;
        }

        // Docs
        if (DOC_EXTS.some(e => f.endsWith(e)) && !SRC_DIRS.some(d => lower.includes(d))) {
            index.docs.push(f); continue;
        }

        // Source files (in src/, lib/, crates/ directories or .rs/.ts/.js without test markers)
        if (SRC_DIRS.some(d => lower.includes(d)) ||
            f.endsWith('.rs') || f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.py') || f.endsWith('.go')) {
            index.sources.push(f); continue;
        }

        index.others.push(f);
    }

    return index;
}