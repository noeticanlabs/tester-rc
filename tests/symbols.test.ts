// CohBit-Copilot v1.2 — Symbol Extraction Tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { extractSymbols, findSymbolsInProject } from '../src/symbols.js';

let tempDir: string;

beforeAll(async () => {
    tempDir = path.join(os.tmpdir(), `symbols-v12-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ═══ 1. Extracts TS imports, functions, exports ═══════════════
it('1. extracts TS imports, functions, exports', async () => {
    await fs.writeFile(path.join(tempDir, 'package.json'), '{}', 'utf-8'); // manifest for language detection
    const filePath = path.join(tempDir, 'test.ts');
    await fs.writeFile(filePath,
        'import { foo } from "./bar";\n' +
        'export function add(a: number, b: number) { return a + b; }\n' +
        'export interface User { name: string; }\n' +
        'export const VERSION = "1.0";\n',
        'utf-8');

    const syms = await extractSymbols(filePath, tempDir);
    expect(syms.some(s => s.name === 'foo' && s.kind === 'Import')).toBe(true);
    expect(syms.some(s => s.name === 'add' && s.kind === 'Function')).toBe(true);
    expect(syms.some(s => s.name === 'User' && s.kind === 'Interface')).toBe(true);
    expect(syms.some(s => s.name === 'VERSION' && s.kind === 'Const')).toBe(true);
});

// ═══ 2. Extracts Rust fn, struct, mod, use ════════════════════
it('2. extracts Rust fn, struct, mod, use', async () => {
    const dir = path.join(tempDir, 'rs-proj');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'Cargo.toml'), '[package]\nname="t"\n', 'utf-8');
    const filePath = path.join(dir, 'lib.rs');
    await fs.writeFile(filePath,
        'pub fn calculate() {}\n' +
        'pub struct Point { x: i32, y: i32 }\n' +
        'mod utils;\n' +
        'use crate::utils::helper;\n',
        'utf-8');

    const syms = await extractSymbols(filePath, dir);
    expect(syms.some(s => s.name === 'calculate' && s.kind === 'Function')).toBe(true);
    expect(syms.some(s => s.name === 'Point' && s.kind === 'Struct')).toBe(true);
    expect(syms.some(s => s.name === 'utils' && s.kind === 'Module')).toBe(true);
    expect(syms.some(s => s.kind === 'Import')).toBe(true);
});

// ═══ 3. Extracts Python def, class, import ════════════════════
it('3. extracts Python def, class, import', async () => {
    const dir = path.join(tempDir, 'py-proj');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'setup.py'), '', 'utf-8');
    const filePath = path.join(dir, 'app.py');
    await fs.writeFile(filePath,
        'import os\n' +
        'def main():\n  pass\n' +
        'class Calculator:\n  pass\n',
        'utf-8');

    const syms = await extractSymbols(filePath, dir);
    expect(syms.some(s => s.name === 'os' && s.kind === 'Import')).toBe(true);
    expect(syms.some(s => s.name === 'main' && s.kind === 'Function')).toBe(true);
    expect(syms.some(s => s.name === 'Calculator' && s.kind === 'Class')).toBe(true);
});

// ═══ 4. Extracts Go func, type, import ════════════════════════
it('4. extracts Go func, type, import', async () => {
    const dir = path.join(tempDir, 'go-proj');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'go.mod'), 'module test\n', 'utf-8');
    const filePath = path.join(dir, 'main.go');
    await fs.writeFile(filePath,
        'package main\n' +
        'import "fmt"\n' +
        'func Greet() {}\n' +
        'type Person struct {}\n',
        'utf-8');

    const syms = await extractSymbols(filePath, dir);
    expect(syms.some(s => s.name === 'fmt' && s.kind === 'Import')).toBe(true);
    expect(syms.some(s => s.name === 'Greet' && s.kind === 'Function')).toBe(true);
});

// ═══ 5. Returns empty array for unknown language ═══════════════
it('5. returns low-confidence symbol for unknown language', async () => {
    const dir = path.join(tempDir, 'unknown-proj');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, 'data.txt');
    await fs.writeFile(filePath, 'hello', 'utf-8');

    const syms = await extractSymbols(filePath, dir);
    expect(syms.length).toBe(1);
    expect(syms[0]!.confidence).toBe('low');
});

// ═══ 6. Parse failure produces low-confidence results ═════════
it('6. handles unreadable files gracefully', async () => {
    const dir = path.join(tempDir, 'nope');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'package.json'), '{}', 'utf-8');

    const syms = await extractSymbols(path.join(dir, 'nonexistent.ts'), dir);
    expect(syms.length).toBe(1);
    expect(syms[0]!.confidence).toBe('low');
});

// ═══ 7. findSymbolsInProject indexes all files ════════════════
it('7. findSymbolsInProject scans and indexes all source files', async () => {
    const dir = path.join(tempDir, 'project');
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(dir, 'src', 'lib.ts'), 'export function hello() {}\n', 'utf-8');

    const result = await findSymbolsInProject(dir);
    expect(result.language).toBe('node');
    expect(result.symbols.length).toBeGreaterThan(0);
    expect(Object.keys(result.fileIndex).length).toBeGreaterThan(0);
});

// ═══ 8. Symbol filter by kind ═════════════════════════════════
it('8. symbol filter by kind works', async () => {
    const dir = path.join(tempDir, 'filter-proj');
    await fs.mkdir(path.join(dir, 'src'), { recursive: true });
    await fs.writeFile(path.join(dir, 'package.json'), '{}', 'utf-8');
    await fs.writeFile(path.join(dir, 'src', 'app.ts'),
        'import { x } from "./lib";\n' +
        'export function run() {}\n',
        'utf-8');

    const result = await findSymbolsInProject(dir, { kinds: ['Function'] });
    expect(result.symbols.every(s => s.kind === 'Function')).toBe(true);
    expect(result.symbols.some(s => s.name === 'run')).toBe(true);
    expect(result.symbols.some(s => s.name === 'x')).toBe(false);
});