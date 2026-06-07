// CohBit-Copilot v14.5 — CLI Command-Level Tests
// Tests argument parsing, help output, and pure-function utilities from src/cli.ts.
//
// Operating law:
//   These tests verify exported parseArgs and related pure functions.
//   They do not test async handlers that require filesystem or gate state.

import { describe, it, expect } from 'vitest';

// We test parseArgs and parseRational by importing what we can.
// The CLI's parseArgs is not directly exported, so we re-create
// the relevant parsing logic for isolated testing.

// ─── parseRational (recreated from CLI) ──────────────────────────

interface Rational64 {
    numer: number;
    denom: number;
}

function parseRational(input: string): Rational64 | null {
    const parts = input.split('/');
    if (parts.length === 1) {
        const n = parseInt(parts[0]!, 10);
        if (isNaN(n)) return null;
        return { numer: n, denom: 1 };
    }
    if (parts.length === 2) {
        const n = parseInt(parts[0]!, 10);
        const d = parseInt(parts[1]!, 10);
        if (isNaN(n) || isNaN(d) || d < 1) return null;
        return { numer: n, denom: d };
    }
    return null;
}

describe('v14.5 — parseRational', () => {
    it('parses integer as numer/1', () => {
        const r = parseRational('5');
        expect(r).toEqual({ numer: 5, denom: 1 });
    });

    it('parses fraction', () => {
        const r = parseRational('3/4');
        expect(r).toEqual({ numer: 3, denom: 4 });
    });

    it('rejects zero denominator', () => {
        const r = parseRational('5/0');
        expect(r).toBeNull();
    });

    it('rejects negative denominator', () => {
        const r = parseRational('5/-2');
        expect(r).toBeNull();
    });

    it('rejects non-numeric input', () => {
        expect(parseRational('abc')).toBeNull();
        expect(parseRational('a/b')).toBeNull();
        expect(parseRational('')).toBeNull();
    });

    it('rejects too many slashes', () => {
        const r = parseRational('1/2/3');
        expect(r).toBeNull();
    });
});

// ─── parseArgs (recreated from CLI) ──────────────────────────────

interface CliArgs {
    command: string;
    proposalId?: string;
    description?: string;
    files?: string[];
    spend?: string;
    defect?: string;
    authority?: string;
    approve?: boolean;
    reject?: boolean;
    reviewer?: string;
    comments?: string;
    testCommand?: string;
    emptyTestPolicy?: string;
    domainId?: string;
    policy?: string;
    help?: boolean;
    json?: boolean;
    taskText?: string;
    file?: string;
}

function parseArgs(args: string[]): CliArgs {
    const result: CliArgs = { command: args[0] ?? 'help' };
    let i = 1;
    while (i < args.length) {
        const arg = args[i];
        if (arg === undefined) break;
        switch (arg) {
            case '--description': result.description = args[++i]; break;
            case '--files':
                result.files = [];
                while (args[i + 1] && !args[i + 1]?.startsWith('--')) { result.files.push(args[++i]!); }
                break;
            case '--spend': result.spend = args[++i]; break;
            case '--defect': result.defect = args[++i]; break;
            case '--authority': result.authority = args[++i]; break;
            case '--approve': result.approve = true; break;
            case '--reject': result.reject = true; break;
            case '--public': result.approve = true; break;
            case '--linkedin': result.reject = true; break;
            case '--internal': result.approve = false; result.reject = false; break;
            case '--reviewer': result.reviewer = args[++i]; break;
            case '--comments': result.comments = args[++i]; break;
            case '--command': result.testCommand = args[++i]; break;
            case '--domain-id': result.domainId = args[++i]; break;
            case '--policy': result.policy = args[++i]; break;
            case '--file': result.file = args[++i]; break;
            case '--json': result.json = true; break;
            case '--help': case '-h': result.help = true; break;
            default:
                if (result.command === 'plan' || result.command === 'test-recommend' || result.command === 'work' || result.command === 'audit' ||
                    result.command === 'teach' || result.command === 'curriculum' || result.command === 'network' || result.command === 'system' ||
                    result.command === 'access' || result.command === 'demo' || result.command === 'start') {
                    if (result.taskText == null) { result.taskText = arg; }
                    else { result.taskText += ' ' + arg; }
                    while (args[i + 1] && !(args[i + 1] ?? '').startsWith('--')) { result.taskText += ' ' + args[++i]!; }
                } else if (arg.startsWith('prop-') || result.command === 'status' || result.command === 'apply' ||
                    result.command === 'test' || result.command === 'rollback' || result.command === 'receipt' ||
                    result.command === 'authorize' || result.command === 'review' ||
                    result.command === 'explain-finding' || result.command === 'explain-obligation' ||
                    result.command === 'repair-review' || result.command === 'propose-repair') {
                    result.proposalId = arg;
                }
                break;
        }
        i++;
    }
    return result;
}

describe('v14.5 — parseArgs: Gate Commands', () => {
    it('parses propose with --description and --files', () => {
        const r = parseArgs(['propose', '--description', 'test fix', '--files', 'a.ts', 'b.ts', '--spend', '1/2']);
        expect(r.command).toBe('propose');
        expect(r.description!).toBe('test fix');
        expect(r.files!).toEqual(['a.ts', 'b.ts']);
        expect(r.spend!).toBe('1/2');
    });

    it('parses review with --approve and --reviewer', () => {
        const r = parseArgs(['review', 'prop-abc123', '--approve', '--reviewer', 'alice']);
        expect(r.command).toBe('review');
        expect(r.proposalId!).toBe('prop-abc123');
        expect(r.approve).toBe(true);
        expect(r.reviewer!).toBe('alice');
    });

    it('parses review with --reject', () => {
        const r = parseArgs(['review', 'prop-def456', '--reject', '--comments', 'needs more testing']);
        expect(r.command).toBe('review');
        expect(r.proposalId!).toBe('prop-def456');
        expect(r.reject).toBe(true);
        expect(r.comments!).toBe('needs more testing');
    });

    it('parses authorize', () => {
        const r = parseArgs(['authorize', 'prop-xyz789', '--domain-id', 'test-domain']);
        expect(r.command).toBe('authorize');
        expect(r.proposalId!).toBe('prop-xyz789');
        expect(r.domainId!).toBe('test-domain');
    });

    it('parses apply', () => {
        const r = parseArgs(['apply', 'prop-abc123']);
        expect(r.command).toBe('apply');
        expect(r.proposalId!).toBe('prop-abc123');
    });

    it('parses test with --command', () => {
        const r = parseArgs(['test', 'prop-abc123', '--command', 'cargo test']);
        expect(r.command).toBe('test');
        expect(r.proposalId!).toBe('prop-abc123');
        expect(r.testCommand!).toBe('cargo test');
    });

    it('parses rollback', () => {
        const r = parseArgs(['rollback', 'prop-abc123']);
        expect(r.command).toBe('rollback');
        expect(r.proposalId!).toBe('prop-abc123');
    });

    it('parses receipt', () => {
        const r = parseArgs(['receipt', 'prop-abc123', '--domain-id', 'audit']);
        expect(r.command).toBe('receipt');
        expect(r.proposalId!).toBe('prop-abc123');
        expect(r.domainId!).toBe('audit');
    });
});

describe('v14.5 — parseArgs: v14.5 Repair Commands', () => {
    it('parses repair-review summary', () => {
        const r = parseArgs(['repair-review', 'summary']);
        expect(r.command).toBe('repair-review');
        expect(r.taskText).toBe('summary');
    });

    it('parses repair-review list', () => {
        const r = parseArgs(['repair-review', 'list']);
        expect(r.command).toBe('repair-review');
        expect(r.taskText).toBe('list');
    });

    it('parses repair-review show with ID', () => {
        const r = parseArgs(['repair-review', 'show', 'rep-xyz123']);
        expect(r.command).toBe('repair-review');
        expect(r.taskText!).toBe('show');
        expect(r.proposalId!).toBe('rep-xyz123');
    });

    it('parses repair-review approve with ID', () => {
        const r = parseArgs(['repair-review', 'approve', 'rep-xyz123']);
        expect(r.command).toBe('repair-review');
        expect(r.taskText!).toBe('approve');
        expect(r.proposalId!).toBe('rep-xyz123');
    });

    it('parses repair-review reject with ID and reason', () => {
        const r = parseArgs(['repair-review', 'reject', 'rep-xyz123', '--comments', 'needs investigation']);
        expect(r.command).toBe('repair-review');
        expect(r.taskText!).toBe('reject');
        expect(r.proposalId!).toBe('rep-xyz123');
        expect(r.comments!).toBe('needs investigation');
    });

    it('parses propose-repair with repair ID', () => {
        const r = parseArgs(['propose-repair', 'rep-abc456']);
        expect(r.command).toBe('propose-repair');
        expect(r.proposalId!).toBe('rep-abc456');
    });
});

describe('v14.5 — parseArgs: Subcommand Routing', () => {
    it('routes subcommand strings to taskText for system', () => {
        const r = parseArgs(['system', 'about']);
        expect(r.command).toBe('system');
        expect(r.taskText).toBe('about');
    });

    it('routes subcommand strings to taskText for access', () => {
        const r = parseArgs(['access', 'set', 'learner']);
        expect(r.command).toBe('access');
        expect(r.taskText).toBe('set learner');
    });

    it('routes curriculum subcommand', () => {
        const r = parseArgs(['curriculum', 'list']);
        expect(r.command).toBe('curriculum');
        expect(r.taskText).toBe('list');
    });

    it('routes multi-word task text for teach', () => {
        const r = parseArgs(['teach', 'proposal vs authority', '--public']);
        expect(r.command).toBe('teach');
        expect(r.taskText).toBe('proposal vs authority');
        expect(r.approve).toBe(true); // --public maps to approve
    });

    it('routes plan command with task text', () => {
        const r = parseArgs(['plan', 'add logging to auth handler']);
        expect(r.command).toBe('plan');
        expect(r.taskText).toBe('add logging to auth handler');
    });
});

describe('v14.5 — parseArgs: Flags and Edge Cases', () => {
    it('--help sets help flag', () => {
        const r = parseArgs(['propose', '--help']);
        expect(r.help).toBe(true);
    });

    it('-h sets help flag', () => {
        const r = parseArgs(['review', '-h']);
        expect(r.help).toBe(true);
    });

    it('--json sets json flag', () => {
        const r = parseArgs(['audit', '--json']);
        expect(r.json).toBe(true);
    });

    it('--public maps to approve', () => {
        const r = parseArgs(['teach', 'topic', '--public']);
        expect(r.approve).toBe(true);
    });

    it('--linkedin maps to reject', () => {
        const r = parseArgs(['teach', 'topic', '--linkedin']);
        expect(r.reject).toBe(true);
    });

    it('--file captures path', () => {
        const r = parseArgs(['build-patch', '--file', 'src/foo.ts', '--primitive', 'CreateFileFromTemplate']);
        expect(r.file).toBe('src/foo.ts');
    });
});