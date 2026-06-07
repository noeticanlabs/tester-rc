// CohBit-Copilot v1.1A — Workspace Indexer Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { scanWorkspace, classifyFile, shouldIgnorePath } from '../src/workspace.js';
import type { Language } from '../src/types.js';

let tempDir: string;

beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `workspace-v11-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ═══ 1. Scans temp Node project ═══════════════════════════════
it('1. scans temp Node project', async () => {
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8');
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'tests'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), 'export const x = 1;', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'tests', 'index.test.ts'), 'test("x", () => {});', 'utf-8');

    const ws = await scanWorkspace(tempDir);
    expect(ws.language).toBe('node');
    expect(ws.totalFiles).toBeGreaterThanOrEqual(3);
    expect(ws.sourceFiles.length).toBeGreaterThanOrEqual(1);
    expect(ws.testFiles.length).toBeGreaterThanOrEqual(1);
    expect(ws.manifests).toContain('package.json');
});

// ═══ 2. Scans temp Rust project ═══════════════════════════════
it('2. scans temp Rust project', async () => {
    const dir = path.join(tempDir, 'rust-proj');
    await fs.mkdir(dir, { recursive: true });
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'Cargo.toml'), '[package]\nname="test"\nversion="0.1.0"\n', 'utf-8');
    await fs.writeFile(path.join(dir, 'src', 'lib.rs'), 'pub fn add() {}', 'utf-8');

    const ws = await scanWorkspace(dir);
    expect(ws.language).toBe('rust');
    expect(ws.sourceFiles.length).toBeGreaterThanOrEqual(1);
    expect(ws.manifests).toContain('Cargo.toml');
});

// ═══ 3. Ignores node_modules and target ═══════════════════════
it('3. ignores node_modules and target directories', async () => {
    const dir = path.join(tempDir, 'ignore-test');
    await fs.mkdir(path.join(dir, 'node_modules', 'dep'), { recursive: true });
    await fs.mkdir(path.join(dir, 'target', 'debug'), { recursive: true });
    await fs.writeFile(path.join(dir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(dir, 'node_modules', 'dep', 'index.js'), '', 'utf-8');
    await fs.writeFile(path.join(dir, 'target', 'debug', 'binary'), '', 'utf-8');

    const ws = await scanWorkspace(dir);
    expect(ws.totalFiles).toBe(1); // only package.json
    expect(ws.ignoredDirs).toContain('node_modules');
    expect(ws.ignoredDirs).toContain('target');
});

// ═══ 4. Classifies source/test/config/docs ════════════════════
it('4. classifies source/test/config/docs per language', () => {
    expect(classifyFile('src/index.ts', 'node')).toBe('source');
    expect(classifyFile('tests/index.test.ts', 'node')).toBe('test');
    expect(classifyFile('package.json', 'node')).toBe('config');
    expect(classifyFile('README.md', 'node')).toBe('docs');
    expect(classifyFile('src/lib.rs', 'rust')).toBe('source');
    expect(classifyFile('tests/test.rs', 'rust')).toBe('test');
    expect(classifyFile('Cargo.toml', 'rust')).toBe('config');
    expect(classifyFile('main.go', 'go')).toBe('source');
    expect(classifyFile('main_test.go', 'go')).toBe('test');
    expect(classifyFile('go.mod', 'go')).toBe('config');
    expect(classifyFile('app.py', 'python')).toBe('source');
    expect(classifyFile('tests/test_app.py', 'python')).toBe('test');
    expect(classifyFile('pyproject.toml', 'python')).toBe('config');
});

// ═══ 5. shouldIgnorePath rules ════════════════════════════════
it('5. shouldIgnorePath rejects known patterns', () => {
    expect(shouldIgnorePath('.git')).toBe(true);
    expect(shouldIgnorePath('node_modules')).toBe(true);
    expect(shouldIgnorePath('dist')).toBe(true);
    expect(shouldIgnorePath('build')).toBe(true);
    expect(shouldIgnorePath('coverage')).toBe(true);
    expect(shouldIgnorePath('.venv')).toBe(true);
    expect(shouldIgnorePath('__pycache__')).toBe(true);
    expect(shouldIgnorePath('.cohbit')).toBe(true);
    expect(shouldIgnorePath('src/index.ts')).toBe(false);
    expect(shouldIgnorePath('Cargo.toml')).toBe(false);
    expect(shouldIgnorePath('go.mod')).toBe(false);
});

// ═══ 6. Detects manifests ═════════════════════════════════════
it('6. detects multiple manifests', async () => {
    const dir = path.join(tempDir, 'multi-manifest');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(dir, 'tsconfig.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(dir, 'vitest.config.ts'), 'export default {}', 'utf-8');

    const ws = await scanWorkspace(dir);
    expect(ws.manifests).toContain('package.json');
    expect(ws.configFiles.length).toBeGreaterThanOrEqual(2);
});

// ═══ 7. Unknown language returns correct summary ═══════════════
it('7. unknown language returns empty but valid summary', async () => {
    const dir = path.join(tempDir, 'unknown-proj');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'hello.txt'), 'hello', 'utf-8');

    const ws = await scanWorkspace(dir);
    expect(ws.language).toBe('unknown');
    expect(ws.totalFiles).toBe(1);
    expect(ws.docsFiles.length).toBe(1);
});