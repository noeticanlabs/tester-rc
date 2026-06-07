// CohBit-Copilot Workspace Indexer (v1.1A)
// Read-only local workspace awareness. Scans, classifies, and summarizes.
//
// Operating law:
//   Workspace and environment review are read-only.
//   They may inspect, classify, warn, and recommend.
//   They may not mutate, apply, authorize, rollback, or commit.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { detectLanguage } from './lang.js';
import type { FileRole, WorkspaceSummary, Language } from './types.js';

const IGNORED_DIRS = new Set([
    '.git', 'node_modules', 'target', 'dist', 'build',
    'coverage', '.venv', 'venv', '__pycache__', '.cohbit',
    '.next', '.nuxt', 'out', '.cache',
]);

const IGNORED_PATTERNS = [
    /\.lock$/,
    /package-lock\.json$/,
    /yarn\.lock$/,
    /Cargo\.lock$/,
    /go\.sum$/,
    /\.pyc$/,
    /\.pyo$/,
    /\.o$/,
    /\.obj$/,
    /\.exe$/,
    /\.dll$/,
    /\.so$/,
    /\.dylib$/,
    /\.wasm$/,
    /\.map$/,
];

export function shouldIgnorePath(filePath: string): boolean {
    const name = path.basename(filePath);
    if (IGNORED_DIRS.has(name)) return true;
    for (const pattern of IGNORED_PATTERNS) {
        if (pattern.test(name)) return true;
    }
    return false;
}

export function classifyFile(filePath: string, language: Language): FileRole {
    const name = path.basename(filePath);
    const lower = name.toLowerCase();
    const ext = path.extname(filePath).toLowerCase();

    // Schema files
    if (ext === '.json' && (name.includes('schema') || name.includes('manifest'))) return 'schema';
    if (ext === '.json' && lower.includes('schema')) return 'schema';

    // Lockfiles
    if (name === 'package-lock.json' || name === 'yarn.lock' || name === 'Cargo.lock' || name === 'go.sum') return 'lockfile';
    if (name.endsWith('.lock')) return 'lockfile';

    // Generated
    if (filePath.includes('/generated/') || filePath.includes('/dist/') || filePath.includes('/build/')) return 'generated';
    if (ext === '.map' || ext === '.min.js' || ext === '.min.css') return 'generated';

    // Docs
    if (ext === '.md' || ext === '.txt' || ext === '.rst') return 'docs';
    if (filePath.includes('/docs/') || filePath.includes('/doc/')) return 'docs';
    if (name === 'README' || name === 'LICENSE' || name === 'CHANGELOG') return 'docs';

    // Config files per language
    if (language === 'node' && (name === 'package.json' || name === 'tsconfig.json' || name === 'vitest.config.ts' || name === '.eslintrc.js' || name === '.prettierrc')) return 'config';
    if (language === 'rust' && (name === 'Cargo.toml' || name === 'rust-toolchain.toml' || name === 'rustfmt.toml')) return 'config';
    if (language === 'go' && name === 'go.mod') return 'config';
    if (language === 'python' && (name === 'pyproject.toml' || name === 'setup.py' || name === 'requirements.txt')) return 'config';
    if (language === 'dotnet' && (name.endsWith('.csproj') || name.endsWith('.sln'))) return 'config';
    if (ext === '.json' && !name.includes('test') && !name.includes('spec')) return 'config';
    if (ext === '.yml' || ext === '.yaml' || ext === '.toml' || ext === '.cfg' || ext === '.ini' || ext === '.env') return 'config';

    // Test files per language
    if (language === 'node' && (lower.includes('.test.') || lower.includes('.spec.') || filePath.includes('/tests/') || filePath.includes('/__tests__/'))) return 'test';
    if (language === 'rust' && (filePath.includes('tests/') || filePath.includes('/tests/') || name.startsWith('test_'))) return 'test';
    if (language === 'go' && (lower.endsWith('_test.go'))) return 'test';
    if (language === 'python' && (lower.startsWith('test_') || lower.endsWith('_test.py') || filePath.includes('/tests/'))) return 'test';
    if (language === 'dotnet' && (lower.includes('test') && ext === '.cs')) return 'test';

    // Source files per language
    if (language === 'node' && (ext === '.ts' || ext === '.js' || ext === '.tsx' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs')) return 'source';
    if (language === 'rust' && ext === '.rs') return 'source';
    if (language === 'go' && ext === '.go') return 'source';
    if (language === 'python' && ext === '.py') return 'source';
    if (language === 'dotnet' && ext === '.cs') return 'source';

    return 'unknown';
}

async function walkDir(dir: string, ignoreDirs: string[], maxDepth = 10): Promise<string[]> {
    if (maxDepth <= 0) return [];
    const results: string[] = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                // ── v2.2: Skip symlink directories ────────────
                if (entry.isSymbolicLink()) {
                    console.warn(`[Workspace] Skipping symlink directory: ${fullPath}`);
                    ignoreDirs.push(entry.name + ' (symlink)');
                    continue;
                }
                if (shouldIgnorePath(entry.name)) {
                    ignoreDirs.push(entry.name);
                    continue;
                }
                const children = await walkDir(fullPath, ignoreDirs, maxDepth - 1);
                results.push(...children);
            } else if (entry.isFile()) {
                // ── v2.2: Skip symlink files ────────────────
                if (entry.isSymbolicLink()) {
                    console.warn(`[Workspace] Skipping symlink file: ${fullPath}`);
                    continue;
                }
                if (!shouldIgnorePath(entry.name)) {
                    results.push(fullPath);
                }
            }
        }
    } catch {
        // Skip unreadable directories
    }
    return results;
}

function relativePath(cwd: string, filePath: string): string {
    const rel = path.relative(cwd, filePath);
    return rel.replace(/\\/g, '/');
}

export async function scanWorkspace(cwd: string): Promise<WorkspaceSummary> {
    const language = await detectLanguage(cwd);
    const ignoredDirs: string[] = [];
    const allFiles = await walkDir(cwd, ignoredDirs, 8);

    const sourceFiles: string[] = [];
    const testFiles: string[] = [];
    const configFiles: string[] = [];
    const docsFiles: string[] = [];
    const manifests: string[] = [];
    const fileCounts: Record<string, number> = {};

    for (const fullPath of allFiles) {
        const rel = relativePath(cwd, fullPath);
        const role = classifyFile(rel, language);
        const ext = path.extname(fullPath) || '(no ext)';

        fileCounts[ext] = (fileCounts[ext] || 0) + 1;

        switch (role) {
            case 'source': sourceFiles.push(rel); break;
            case 'test': testFiles.push(rel); break;
            case 'config': configFiles.push(rel); break;
            case 'docs': docsFiles.push(rel); break;
            case 'lockfile':
                configFiles.push(rel);
                manifests.push(rel);
                break;
            case 'schema':
                configFiles.push(rel);
                manifests.push(rel);
                break;
            default:
                if (rel.endsWith('Cargo.toml') || rel.endsWith('package.json') || rel.endsWith('go.mod') || rel.endsWith('pyproject.toml')) {
                    manifests.push(rel);
                }
                break;
        }

        // Also track manifests explicitly
        const basename = path.basename(rel);
        if (basename === 'package.json' || basename === 'Cargo.toml' || basename === 'go.mod' || basename === 'pyproject.toml' || basename === 'setup.py') {
            if (!manifests.includes(rel)) manifests.push(rel);
        }
        if (basename.endsWith('.csproj') && !manifests.includes(rel)) {
            manifests.push(rel);
        }
    }

    return {
        root: cwd,
        language,
        manifests,
        fileCounts,
        sourceFiles: sourceFiles.sort(),
        testFiles: testFiles.sort(),
        configFiles: configFiles.sort(),
        docsFiles: docsFiles.sort(),
        ignoredDirs: [...new Set(ignoredDirs)].sort(),
        totalFiles: allFiles.length,
    };
}