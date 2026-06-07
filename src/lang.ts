// Cohbit-Copilot Language Detection & Test Parsing (v0.4)
// Deterministic manifest-based language detection + per-language test output parsers.
//
// Priority: explicit command > detected default > npm test fallback
// Parser confidence: high (structured output) / medium (regex) / low (fragile)

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
    Language,
    TestResult,
    ParsedTestResult,
    ParserConfidence,
    TestRunConfig,
} from './types.js';

// ─── Manifest Files ───────────────────────────────────────────
const MANIFESTS: Array<{ file: string; language: Language }> = [
    { file: 'package.json', language: 'node' },
    { file: 'Cargo.toml', language: 'rust' },
    { file: 'go.mod', language: 'go' },
    { file: 'pyproject.toml', language: 'python' },
    { file: 'setup.py', language: 'python' },
];

// ─── Default Test Commands ────────────────────────────────────
const DEFAULT_COMMANDS: Record<Language, string> = {
    node: 'npm test',
    rust: 'cargo test',
    go: 'go test ./...',
    python: 'pytest',
    dotnet: 'dotnet test',
    unknown: 'npm test',
};

// ─── 1. Language Detection ────────────────────────────────────
export async function detectLanguage(cwd: string): Promise<Language> {
    // Check manifests in order (only root directory — no recursive scan)
    for (const { file, language } of MANIFESTS) {
        try {
            await fs.access(path.join(cwd, file));
            return language;
        } catch {
            // Not found, try next
        }
    }

    // Shallow scan for .csproj files (dotnet)
    try {
        const entries = await fs.readdir(cwd);
        if (entries.some(e => e.endsWith('.csproj'))) {
            return 'dotnet';
        }
    } catch {
        // Cannot read directory
    }

    return 'unknown';
}

export function defaultTestCommand(language: Language): string {
    return DEFAULT_COMMANDS[language];
}

// ─── 2. Test Output Parsers ───────────────────────────────────

function makeResult(
    name: string,
    passed: boolean,
    confidence: ParserConfidence,
    raw: string,
    error?: string | undefined,
): ParsedTestResult {
    const base: ParsedTestResult = { name, passed, duration: 0, parserConfidence: confidence, rawLine: raw };
    if (error !== undefined) {
        base.error = error;
    }
    return base;
}

// ─── npm / vitest output ─────────────────────────────────────
function parseNodeOutput(stdout: string, stderr: string): ParsedTestResult[] {
    const results: ParsedTestResult[] = [];

    // vitest output
    const vitestPattern = /\s+[✓✔]\s+(.+?)\s+\d+ms/g;
    const vitestFailPattern = /\s+[✗✘✕×❯]\s+(.+?)\s+\d+ms/g;

    let match: RegExpExecArray | null;
    while ((match = vitestPattern.exec(stdout)) !== null) {
        results.push(makeResult(match[1]?.trim() ?? 'unknown', true, 'high', match[0]));
    }
    while ((match = vitestFailPattern.exec(stdout)) !== null) {
        results.push(makeResult(match[1]?.trim() ?? 'unknown', false, 'high', match[0], stderr));
    }

    // node:test output
    if (results.length === 0) {
        const passPattern = /ok \d+ - (.+)/g;
        const failPattern = /not ok \d+ - (.+)/g;
        while ((match = passPattern.exec(stdout)) !== null) {
            results.push(makeResult(match[1]?.trim() ?? 'unknown', true, 'high', match[0]));
        }
        while ((match = failPattern.exec(stdout)) !== null) {
            results.push(makeResult(match[1]?.trim() ?? 'unknown', false, 'medium', match[0], stderr));
        }
    }

    // Summary fallback
    if (results.length === 0) {
        const passCount = parseInt(stdout.match(/(\d+)\s+passing/i)?.[1] ?? '0', 10);
        const failCount = parseInt(stdout.match(/(\d+)\s+failing/i)?.[1] ?? '0', 10);
        for (let i = 0; i < passCount; i++) results.push(makeResult(`test_${i + 1}`, true, 'medium', '(summary)'));
        for (let i = 0; i < failCount; i++) results.push(makeResult(`test_${i + passCount + 1}`, false, 'medium', '(summary)', stderr || stdout));
    }

    return results;
}

// ─── cargo test output ───────────────────────────────────────
function parseRustOutput(stdout: string, stderr: string): ParsedTestResult[] {
    const results: ParsedTestResult[] = [];

    // Pattern: "test module::test_name ... ok" or "test module::test_name ... FAILED"
    const testPattern = /test\s+(.+?)\s+\.\.\.\s+(ok|FAILED)/gm;
    let match: RegExpExecArray | null;
    while ((match = testPattern.exec(stdout)) !== null) {
        const name = match[1]?.trim() ?? 'unknown';
        const passed = match[2] === 'ok';
        results.push(makeResult(name, passed, 'high', match[0], passed ? undefined : stderr));
    }

    // Summary: "test result: ok. 5 passed; 0 failed"
    if (results.length === 0) {
        const passMatch = stdout.match(/(\d+)\s+passed/i);
        const failMatch = stdout.match(/(\d+)\s+failed/i);
        const passCount = parseInt(passMatch?.[1] ?? '0', 10);
        const failCount = parseInt(failMatch?.[1] ?? '0', 10);
        for (let i = 0; i < passCount; i++) results.push(makeResult(`test_${i + 1}`, true, 'medium', '(summary)'));
        for (let i = 0; i < failCount; i++) results.push(makeResult(`test_${i + passCount + 1}`, false, 'medium', '(summary)', stderr || stdout));
    }

    // Cargo build errors (tests couldn't compile)
    if (results.length === 0 && stderr) {
        results.push(makeResult('cargo_build_error', false, 'medium', stderr.substring(0, 200), stderr));
    }

    return results;
}

// ─── go test output ──────────────────────────────────────────
function parseGoOutput(stdout: string, stderr: string): ParsedTestResult[] {
    const results: ParsedTestResult[] = [];

    // Pattern: "--- PASS: TestName (0.00s)" or "--- FAIL: TestName (0.00s)"
    const testPattern = /--- (PASS|FAIL):\s+(.+?)\s+\(/gm;
    let match: RegExpExecArray | null;
    while ((match = testPattern.exec(stdout)) !== null) {
        const passed = match[1] === 'PASS';
        const name = match[2]?.trim() ?? 'unknown';
        results.push(makeResult(name, passed, 'high', match[0], passed ? undefined : stderr));
    }

    // Summary: "ok   module  (cached)" or "FAIL  module"
    if (results.length === 0) {
        if (stdout.includes('ok') && !stdout.includes('FAIL')) {
            results.push(makeResult('go_test_all', true, 'medium', '(ok summary)'));
        } else if (stdout.includes('FAIL') || stderr) {
            results.push(makeResult('go_test_all', false, 'medium', stderr || stdout, stderr));
        }
    }

    // Go build errors
    if (results.length === 0 && stderr) {
        results.push(makeResult('go_build_error', false, 'medium', stderr.substring(0, 200), stderr));
    }

    return results;
}

// ─── pytest output ───────────────────────────────────────────
function parsePythonOutput(stdout: string, stderr: string): ParsedTestResult[] {
    const results: ParsedTestResult[] = [];

    // Pattern: "test_module.py::test_name PASSED" or "test_module.py::test_name FAILED"
    const testPattern = /(.+?\.py::.+?)\s+(PASSED|FAILED)/gm;
    let match: RegExpExecArray | null;
    while ((match = testPattern.exec(stdout)) !== null) {
        const passed = match[2] === 'PASSED';
        const name = match[1]?.trim() ?? 'unknown';
        results.push(makeResult(name, passed, 'high', match[0], passed ? undefined : stderr));
    }

    // Short summary: "X passed, Y failed"
    if (results.length === 0) {
        const passMatch = stdout.match(/(\d+)\s+passed/i);
        const failMatch = stdout.match(/(\d+)\s+failed/i);
        const passCount = parseInt(passMatch?.[1] ?? '0', 10);
        const failCount = parseInt(failMatch?.[1] ?? '0', 10);
        for (let i = 0; i < passCount; i++) results.push(makeResult(`test_${i + 1}`, true, 'medium', '(summary)'));
        for (let i = 0; i < failCount; i++) results.push(makeResult(`test_${i + passCount + 1}`, false, 'medium', '(summary)', stderr || stdout));
    }

    // If nothing parsed but stderr has content, treat as error
    if (results.length === 0 && stderr) {
        results.push(makeResult('pytest_error', false, 'low', stderr.substring(0, 200), stderr));
    }

    return results;
}

// ─── dotnet test output ──────────────────────────────────────
function parseDotnetOutput(stdout: string, stderr: string): ParsedTestResult[] {
    const results: ParsedTestResult[] = [];

    // Pattern: "Passed TestName [< 1ms]" or "Failed TestName [< 1ms]"
    const testPattern = /(Passed|Failed)\s+(.+?)\s+\[/gm;
    let match: RegExpExecArray | null;
    while ((match = testPattern.exec(stdout)) !== null) {
        const passed = match[1] === 'Passed';
        const name = match[2]?.trim() ?? 'unknown';
        results.push(makeResult(name, passed, 'high', match[0], passed ? undefined : stderr));
    }

    // Summary: "Passed! - Failed: 0, Passed: 5, Skipped: 0"
    if (results.length === 0) {
        const passMatch = stdout.match(/Passed:\s*(\d+)/i);
        const failMatch = stdout.match(/Failed:\s*(\d+)/i);
        const passCount = parseInt(passMatch?.[1] ?? '0', 10);
        const failCount = parseInt(failMatch?.[1] ?? '0', 10);
        for (let i = 0; i < passCount; i++) results.push(makeResult(`test_${i + 1}`, true, 'medium', '(summary)'));
        for (let i = 0; i < failCount; i++) results.push(makeResult(`test_${i + passCount + 1}`, false, 'medium', '(summary)', stderr || stdout));
    }

    if (results.length === 0 && stderr) {
        results.push(makeResult('dotnet_build_error', false, 'low', stderr.substring(0, 200), stderr));
    }

    return results;
}

// ─── Dispatch ─────────────────────────────────────────────────
export function parseTestOutput(
    language: Language,
    stdout: string,
    stderr: string,
): ParsedTestResult[] {
    switch (language) {
        case 'node': return parseNodeOutput(stdout, stderr);
        case 'rust': return parseRustOutput(stdout, stderr);
        case 'go': return parseGoOutput(stdout, stderr);
        case 'python': return parsePythonOutput(stdout, stderr);
        case 'dotnet': return parseDotnetOutput(stdout, stderr);
        default: return parseNodeOutput(stdout, stderr);
    }
}

// ─── Tool Availability Check ──────────────────────────────────
export async function isToolAvailable(language: Language): Promise<boolean> {
    const checks: Record<Language, string> = {
        node: 'node --version',
        rust: 'cargo --version',
        go: 'go version',
        python: 'pytest --version',
        dotnet: 'dotnet --version',
        unknown: '',
    };

    const cmd = checks[language];
    if (!cmd) return false;

    try {
        const { exec } = await import('node:child_process');
        return new Promise<boolean>((resolve) => {
            exec(cmd, { timeout: 5000 }, (err) => {
                resolve(err === null);
            });
        });
    } catch {
        return false;
    }
}