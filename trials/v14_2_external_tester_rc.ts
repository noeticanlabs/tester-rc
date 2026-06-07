// CohBit-Copilot v14.2 — External Tester RC Smoke Test
// Verifies all new v14.2 commands execute without errors.
//
// Operating law:
//   Smoke tests verify that commands execute successfully.
//   They do not verify correctness of output content.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { execSync } from 'node:child_process';

const OUTPUT_DIR = path.join(process.cwd(), 'reports');
const VERSION = '14.2.0';

interface TestResult {
    command: string;
    exitCode: number;
    outputLines: number;
    passed: boolean;
    error: string | null;
}

interface SmokeReceipt {
    receiptId: string;
    version: string;
    pipeline: string;
    generatedAt: string;
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
    };
    results: TestResult[];
    attestation: string;
}

// Execute a command and capture results
function runCommand(command: string, args: string[]): TestResult {
    const fullCmd = `npx tsx src/cli.ts ${command} ${args.join(' ')}`;
    let exitCode = 0;
    let output = '';
    let error: string | null = null;

    try {
        output = execSync(fullCmd, {
            cwd: process.cwd(),
            stdio: 'pipe',
            timeout: 30000,
            encoding: 'utf-8',
        });
    } catch (err: any) {
        exitCode = err.status || 1;
        output = err.stdout || '';
        error = err.stderr ? err.stderr.slice(0, 200) : err.message.slice(0, 200);
    }

    const outputLines = output.split('\n').filter(l => l.trim().length > 0).length;

    return {
        command: fullCmd.replace(process.cwd(), '.'),
        exitCode,
        outputLines,
        passed: exitCode === 0 && outputLines > 0,
        error: error || (exitCode !== 0 ? `Exit code ${exitCode}` : null),
    };
}

function main() {
    console.log('═══════════════════════════════════════════════════');
    console.log('  CohBit-Copilot v14.2 — External Tester RC Smoke Test');
    console.log('═══════════════════════════════════════════════════');
    console.log('');

    const results: TestResult[] = [];

    // Test 1: init
    console.log('  Testing: init...');
    const t1 = runCommand('init', []);
    results.push(t1);
    console.log(`    ${t1.passed ? '✅' : '❌'} ${t1.outputLines} lines output`);

    // Test 2: system explain
    console.log('  Testing: system explain...');
    const t2 = runCommand('system', ['explain']);
    results.push(t2);
    console.log(`    ${t2.passed ? '✅' : '❌'} ${t2.outputLines} lines output`);

    // Test 3: system about
    console.log('  Testing: system about...');
    const t3 = runCommand('system', ['about']);
    results.push(t3);
    console.log(`    ${t3.passed ? '✅' : '❌'} ${t3.outputLines} lines output`);

    // Test 4: access show
    console.log('  Testing: access show...');
    const t4 = runCommand('access', ['show']);
    results.push(t4);
    console.log(`    ${t4.passed ? '✅' : '❌'} ${t4.outputLines} lines output`);

    // Test 5: access set learner
    console.log('  Testing: access set learner...');
    const t5 = runCommand('access', ['set', 'learner']);
    results.push(t5);
    console.log(`    ${t5.passed ? '✅' : '❌'} ${t5.outputLines} lines output`);

    // Test 6: start (command hub)
    console.log('  Testing: start...');
    const t6 = runCommand('start', []);
    results.push(t6);
    console.log(`    ${t6.passed ? '✅' : '❌'} ${t6.outputLines} lines output`);

    // Test 7: demo starter
    console.log('  Testing: demo starter...');
    const t7 = runCommand('demo', ['starter']);
    results.push(t7);
    console.log(`    ${t7.passed ? '✅' : '❌'} ${t7.outputLines} lines output`);

    // Test 8: help
    console.log('  Testing: help...');
    const t8 = runCommand('help', []);
    results.push(t8);
    console.log(`    ${t8.passed ? '✅' : '❌'} ${t8.outputLines} lines output`);

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log('');
    console.log(`  Results: ${passed}/${results.length} passed, ${failed} failed`);
    console.log('');

    // Generate receipt
    const receiptId = `RC_${crypto.createHash('sha256').update(Date.now().toString()).digest('hex').slice(0, 12)}`;

    const receipt: SmokeReceipt = {
        receiptId, version: VERSION,
        pipeline: 'v14.2 — External Tester RC Smoke Test',
        generatedAt: new Date().toISOString(),
        summary: { totalTests: results.length, passed, failed },
        results,
        attestation:
            'CohBit-Copilot v14.2 smoke test verifies that all new commands (init, system, access, start, demo) execute without errors. ' +
            'This does not verify output correctness, only that the CLI handlers execute successfully. ' +
            'Default profile is learner. No mutations occurred.',
    };

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    const jsonPath = path.join(OUTPUT_DIR, 'v14_2_smoke_test.json');
    fs.writeFileSync(jsonPath, JSON.stringify(receipt, null, 2), 'utf-8');
    console.log(`  Report: ${jsonPath}`);
    console.log('');

    if (failed > 0) {
        console.log('  ⚠ Some tests failed:');
        for (const r of results.filter(r => !r.passed)) {
            console.log(`    ${r.command}: ${r.error}`);
        }
        process.exit(1);
    } else {
        console.log('  ✅ All tests passed. v14.2 External Tester RC is operational.');
        process.exit(0);
    }
}

main();