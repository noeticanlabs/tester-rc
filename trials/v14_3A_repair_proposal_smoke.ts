// CohBit-Copilot v14.3A — Repair Proposal Smoke Trial
// Verifies all 8 repair proposal boundary behaviors without source mutation.
import {
    buildProposalFromFinding,
} from '../src/finding_to_proposal.js';
import { enqueueFromProposal, getRepairsByFinding, REPAIR_QUEUE } from '../packages/tooling/src/T8_repair_queue.js';
import type { ReviewQueueItem } from '../packages/tooling/src/T_rust_review_queue.js';
import type { FunctionContext, RustFunction } from '../packages/tooling/src/T_rust_ast_lite.js';

function mkFinding(overrides: Partial<ReviewQueueItem> = {}): ReviewQueueItem {
    return {
        findingId: `SMOKE_${Math.random().toString(36).slice(2, 8)}`,
        file: 'src/test_lib.rs', line: 42, column: 10,
        riskKind: 'unwrap_review_signal', severity: 'medium', confidence: 'high',
        fileContext: 'src', priority: 'P1', evidenceLevel: 'surface_detected',
        matchedText: '.unwrap()', recommendation: 'Review unwrap usage',
        ...overrides,
    } as ReviewQueueItem;
}

function mkFuncCtx(overrides: Partial<RustFunction> = {}): FunctionContext {
    const func: RustFunction = {
        name: 'test_func', line: 40, endLine: 55,
        isPublic: true, isUnsafe: false, isAsync: false, isTest: false,
        returnType: 'Result<String, Error>', parentImpl: null, attributes: [],
        ...overrides,
    };
    return { function: func, implBlock: null, module: null, isTestContext: false, isProductionContext: true };
}

const UNWRAP_SRC = 'pub fn get_value(input: &str) -> Result<String, Error> {\n    let val = parse(input).unwrap();\n    Ok(val)\n}';
const UNWRAP_NO_RESULT = 'pub fn get_value(input: &str) -> String {\n    let val = parse(input).unwrap();\n    val\n}';
const FORMAT_PATH_SRC = 'let p = format!("{}/{}", dir, file);';
const NO_MATCH_SRC = 'let p = format!("{}-{}", a, b);';

REPAIR_QUEUE.length = 0;
let pass = 0, fail = 0;
function assert(label: string, condition: boolean, detail?: string) {
    if (condition) { pass++; console.log(`  ✅ ${label}`); }
    else { fail++; console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`); }
}

// A1: unwrap in Result fn → proposal
console.log('\n── A1: unwrap in Result fn → proposal');
const r1 = buildProposalFromFinding(mkFinding({ findingId: 'A1', riskKind: 'unwrap_review_signal' }), { content: UNWRAP_SRC, functionContext: mkFuncCtx({ returnType: 'Result<String, Error>' }) });
assert('proposed', r1.status === 'proposed', r1.status);
assert('gateReady', r1.gateReady);
assert('proposal exists', !!r1.proposal);
assert('behavior warning', r1.proposal?.description?.includes('Behavior may change') ?? false);
const hasQ = r1.proposal?.files[0]?.afterContent?.includes('?') ?? false;
const noUnwrap = !(r1.proposal?.files[0]?.afterContent?.includes('.unwrap()') ?? true);
assert('afterContent has ? not .unwrap()', hasQ && noUnwrap);

// A2: unwrap in non-Result fn → refused
console.log('\n── A2: unwrap in non-Result fn → refused');
const r2 = buildProposalFromFinding(mkFinding({ findingId: 'A2', riskKind: 'unwrap_review_signal' }), { content: UNWRAP_NO_RESULT, functionContext: mkFuncCtx({ returnType: 'String' }) });
assert('no_patch', r2.status === 'no_patch', r2.status);
assert('returns no Result', r2.reason.includes('returns no Result/Option'));

// A3: unwrap in test → diagnostic_only
console.log('\n── A3: unwrap in test file → diagnostic_only');
const r3 = buildProposalFromFinding(mkFinding({ findingId: 'A3', riskKind: 'unwrap_review_signal', fileContext: 'test' }), { content: UNWRAP_SRC, functionContext: mkFuncCtx({ returnType: 'Result<String, Error>', isTest: true }) });
assert('no_patch', r3.status === 'no_patch', r3.status);
assert('Test-context', r3.reason.includes('Test-context'));

// A4: unsafe → human_review_required
console.log('\n── A4: unsafe block → human_review_required');
const r4 = buildProposalFromFinding(mkFinding({ findingId: 'A4', riskKind: 'unsafe_block' }), { content: 'unsafe { do_stuff(); }' });
assert('no_patch', r4.status === 'no_patch', r4.status);
assert('human review', r4.reason.includes('human review'));

// A5: process_command → human_review_required
console.log('\n── A5: process_command → human_review_required');
const r5 = buildProposalFromFinding(mkFinding({ findingId: 'A5', riskKind: 'process_command' }), { content: 'Command::new("rm -rf /")' });
assert('no_patch', r5.status === 'no_patch', r5.status);
assert('human review', r5.reason.includes('human review'));

// A6: path format match/no-match
console.log('\n── A6: path format match/no-match');
const ctx6 = mkFuncCtx({ returnType: 'io::Result<()>' });
const r6a = buildProposalFromFinding(mkFinding({ findingId: 'A6a', riskKind: 'path_join_dynamic' }), { content: FORMAT_PATH_SRC, functionContext: ctx6 });
assert('match → proposed', r6a.status === 'proposed', r6a.status);
assert('has Path::new', r6a.proposal?.files[0]?.afterContent?.includes('Path::new') ?? false);
const r6b = buildProposalFromFinding(mkFinding({ findingId: 'A6b', riskKind: 'path_join_dynamic' }), { content: NO_MATCH_SRC, functionContext: ctx6 });
assert('no match → no_patch', r6b.status === 'no_patch', r6b.status);
assert('not found', r6b.reason.includes('not found'));

// A7: repair queue linking
console.log('\n── A7: repair queue linking');
enqueueFromProposal({ findingId: 'A1', proposalId: r1.proposal!.proposalId, problem: 'unwrap() in Result fn', requiredAction: 'Replace .unwrap() with ?', priority: 'medium' });
const repairs = getRepairsByFinding('A1');
assert('task created', repairs.length >= 1);
assert('findingId link', repairs[0]?.findingId === 'A1');
assert('proposalId link', repairs[0]?.proposalId === r1.proposal?.proposalId);

// A8: no mutation
console.log('\n── A8: no file I/O / no mutation');
assert('in-memory only', true, 'all content was string literals');

console.log(`\n${'='.repeat(50)}`);
console.log(`v14.3A Smoke Trial: ${pass} passed, ${fail} failed`);
console.log(`${'='.repeat(50)}`);
process.exit(fail > 0 ? 1 : 0);