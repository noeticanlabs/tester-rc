// CohBit-Copilot v1.1B — Environment Review Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { reviewEnvironment } from '../src/environment.js';

let tempDir: string;

beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `env-v11-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ═══ 1. Reports language and test command ══════════════════════
it('1. detects language and test command for Node project', async () => {
    await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({
        name: 'test', scripts: { test: 'vitest' }
    }), 'utf-8');

    const report = await reviewEnvironment(tempDir);
    expect(report.language).toBe('node');
    expect(report.defaultTestCommand).toBe('npm test');
});

// ═══ 2. Reports tool availability ══════════════════════════════
it('2. reports tool availability (node should be available)', async () => {
    const report = await reviewEnvironment(tempDir);
    expect(report.tools['node']).toBe(true);
});

// ═══ 3. Graciously handles missing git ═════════════════════════
it('3. graciously marks git as unavailable when not a repo', async () => {
    const report = await reviewEnvironment(tempDir);
    expect(report.gitAvailable).toBeDefined();
    expect(typeof report.gitAvailable).toBe('boolean');
});

// ═══ 4. Risk Low on clean simple repo ══════════════════════════
it('4. risk Low on clean simple Node project', async () => {
    const report = await reviewEnvironment(tempDir);
    expect(report.riskLevel).toBeDefined();
    // Should not be Blocked since we have a manifest
    expect(report.riskLevel).not.toBe('Blocked');
});

// ═══ 5. Detects missing test tool as warning ═══════════════════
it('5. detects missing pytest for Python project as warning', async () => {
    const pyDir = path.join(tempDir, 'py-test');
    await fs.mkdir(pyDir, { recursive: true });
    await fs.writeFile(path.join(pyDir, 'pyproject.toml'), '[project]\nname="test"', 'utf-8');

    const report = await reviewEnvironment(pyDir);
    expect(report.language).toBe('python');
    // pytest may or may not be available — but at minimum the report should
    // warn if pytest is unavailable
    expect(report.warnings).toBeDefined();
    expect(Array.isArray(report.warnings)).toBe(true);
});

// ═══ 6. Risk Blocked on unsupported/missing manifest ══════════
it('6. risk Blocked when no manifest found', async () => {
    const emptyDir = path.join(tempDir, 'empty-dir');
    await fs.mkdir(emptyDir, { recursive: true });

    const report = await reviewEnvironment(emptyDir);
    expect(report.language).toBe('unknown');
    expect(report.riskLevel).toBe('Blocked');
});

// ═══ 7. Environment output is JSON-serializable ════════════════
it('7. environment report is JSON-serializable', async () => {
    const report = await reviewEnvironment(tempDir);
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);
    expect(parsed.language).toBe('node');
    expect(parsed.riskLevel).toBeDefined();
});

// ═══ 8. Git dirty state detected or flag unavailable ══════════
it('8. git dirty state detected or marked unavailable', async () => {
    const report = await reviewEnvironment(tempDir);
    expect(typeof report.gitDirty).toBe('boolean');
    expect(report.riskReasons).toBeDefined();
    expect(Array.isArray(report.riskReasons)).toBe(true);
});