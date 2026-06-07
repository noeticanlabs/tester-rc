// CohBit-Copilot v1.2 — Dependency Graph Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { buildDependencyGraph, findDependents, findAffectedFiles } from '../src/dep_graph.js';

let tempDir: string;

beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `depgraph-v12-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ═══ 1. Builds graph from sample project ═══════════════════════
it('1. builds graph from sample project', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'lib.ts'), 'export function hello() {}', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'app.ts'),
        'import { hello } from "./lib";\n' +
        'hello();\n',
        'utf-8');

    const graph = await buildDependencyGraph(tempDir);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.adjacency['src/app.ts']).toBeDefined();
    expect(graph.reverseAdjacency['src/lib.ts']).toBeDefined();
});

// ═══ 2. Finds direct dependents ════════════════════════════════
it('2. finds direct dependents of a file', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'util.ts'), 'export const x = 1;', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'consumer.ts'),
        'import { x } from "./util";\n',
        'utf-8');

    const graph = await buildDependencyGraph(tempDir);
    const dependents = findDependents('src/util.ts', graph);
    expect(dependents).toContain('src/consumer.ts');
});

// ═══ 3. Finds transitive affected files ════════════════════════
it('3. finds transitive affected files', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'base.ts'), 'export const a = 1;', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'middle.ts'),
        'import { a } from "./base";\n' +
        'export const b = a + 1;\n',
        'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'top.ts'),
        'import { b } from "./middle";\n' +
        'console.log(b);\n',
        'utf-8');

    const graph = await buildDependencyGraph(tempDir);
    const affected = findAffectedFiles('src/base.ts', graph);
    expect(affected).toContain('src/middle.ts');
    expect(affected).toContain('src/top.ts');
});

// ═══ 4. Handles files with no dependencies ═════════════════════
it('4. handles files with no dependencies', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'standalone.ts'), 'export const z = 99;', 'utf-8');

    const graph = await buildDependencyGraph(tempDir);
    const dependents = findDependents('src/standalone.ts', graph);
    expect(dependents).toEqual([]);

    const affected = findAffectedFiles('src/standalone.ts', graph);
    expect(affected).toEqual([]);
});

// ═══ 5. Produces stable JSON output ════════════════════════════
it('5. produces stable JSON output', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'mod.ts'), 'export const v = 1;', 'utf-8');

    const graph = await buildDependencyGraph(tempDir);
    const json = JSON.stringify(graph);
    const parsed = JSON.parse(json);
    expect(parsed.edges).toBeDefined();
    expect(parsed.adjacency).toBeDefined();
    expect(parsed.reverseAdjacency).toBeDefined();
});

// ═══ 6. Handles files with no imports ══════════════════════════
it('6. handles files with no imports gracefully', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'blank.ts'), '', 'utf-8');

    const graph = await buildDependencyGraph(tempDir);
    // File with no symbols has no imports, so no adjacency entry
    // (only files with edges get entries)
    const deps = graph.adjacency['src/blank.ts'] ?? [];
    expect(deps).toEqual([]);
});

// ═══ 7. Graceful with mixed import styles ══════════════════════
it('7. handles mixed import styles', async () => {
    await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'depA.ts'), 'export const a = 1;', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'depB.ts'), 'export const b = 2;', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'src', 'multi.ts'),
        'import { a } from "./depA";\n' +
        'import * as bMod from "./depB";\n',
        'utf-8');

    const graph = await buildDependencyGraph(tempDir);
    const deps = graph.adjacency['src/multi.ts'];
    expect(deps).toBeDefined();
    expect(deps!.length).toBeGreaterThanOrEqual(1);
});