// CohBit-Copilot English Capability Harness (v1.0E)
// Rule-based operator command parser. No LLM. No external dependencies.
//
// Parsing stages (ordered):
//   1. Constraint detection first — governs everything downstream
//   2. Unsafe rejection — force commit, delete everything, bypass review
//   3. Intent matching — keyword + pattern rules, longest match wins
//   4. Target extraction — file paths, session refs, test commands
//   5. Confidence scoring — high (exact match), medium (partial), low (fallback)
//
// Core law:
//   English understanding may classify, constrain, and route.
//   It may not authorize, apply, mutate, or commit.

import type {
    OperatorIntent,
    EnglishCommandParse,
    EnglishConfidence,
    EnglishConstraints,
} from './types.js';

// ─── Stage 1: Constraint Detection ────────────────────────────
function detectConstraints(input: string): EnglishConstraints {
    const lower = input.toLowerCase();
    const constraints: EnglishConstraints = {};

    if (/\bonly inspect\b|\bread.only\b|\bno mutations?\b|\bdo not (touch|change|modify|write)\b/.test(lower)) {
        constraints.readOnly = true;
        constraints.noApply = true;
    }
    if (/\bdo not (apply|commit|write)\b|\bno apply\b|\bproposal only\b/.test(lower)) {
        constraints.noApply = true;
    }
    if (/\bdo not( delete| remove)\b|\bno delet(es?|ions?)\b|\bkeep existing\b/.test(lower)) {
        constraints.noDelete = true;
    }
    if (/\bcreate (it )?if missing\b|\ballow create\b|\bnew file\b/.test(lower)) {
        constraints.allowCreate = true;
    }
    if (/\b(one|single|1) file only\b|\bonly (one|a single) file\b/.test(lower)) {
        constraints.maxFiles = 1;
    } else if (/\b(two|2) files?\b/.test(lower)) {
        constraints.maxFiles = 2;
    }

    // If readOnly is set, noApply is implied
    if (constraints.readOnly) {
        constraints.noApply = true;
    }

    return constraints;
}

// ─── Stage 2: Unsafe Rejection ────────────────────────────────
function checkUnsafe(input: string): { unsafe: boolean; reason?: string } {
    const lower = input.toLowerCase();

    if (/\bforce commit\b|\bcommit without (review|authorization|approval)\b/.test(lower)) {
        return { unsafe: true, reason: 'Commit without review/authorization bypasses the gate pipeline' };
    }
    if (/\bdelete (everything|all|the repo|the project)\b|\bremove (everything|all files)\b/.test(lower)) {
        return { unsafe: true, reason: 'Mass deletion without bounded proposal violates scope constraints' };
    }
    if (/\bapply\b.*\bwithout\b.*\b(review|authoriz|approval)\b/.test(lower) ||
        /\bbypass\b.*\b(review|gate|authorization)\b/.test(lower)) {
        return { unsafe: true, reason: 'Bypassing review or authorization gates is prohibited' };
    }
    if (/\b(ignore|skip) (tests?|checks?|verification)\b|\bno tests?\b/.test(lower)) {
        return { unsafe: true, reason: 'Skipping tests violates the Test Passed ≠ Final Commit boundary' };
    }
    if (/\brewrite\b.*\b(repo|project|codebase)\b/.test(lower)) {
        return { unsafe: true, reason: 'Unbounded rewrite exceeds proposal scope limits' };
    }
    if (/\bforce (apply|push|merge|update)\b/.test(lower)) {
        return { unsafe: true, reason: 'Forced operations bypass governed gate transitions' };
    }
    if (/\bapply\b.*\bwithout\b.*\bauthorization\b/.test(lower) ||
        /\bauthorize\b.*\b(silently|automatically|skip)\b/.test(lower)) {
        return { unsafe: true, reason: 'Applying without authorization bypasses the AuthorizeGate' };
    }
    if (/\bskip\b.*\bverif(y|ication)\b|\bignore\b.*\bverif(y|ication)\b/.test(lower)) {
        return { unsafe: true, reason: 'Skipping verification bypasses the TestGate requirement' };
    }
    if (/\bpush\b.*\b(to|directly)\b.*\b(main|master|prod)\b/.test(lower)) {
        return { unsafe: true, reason: 'Direct push to main/master/prod bypasses the governed gate pipeline' };
    }

    return { unsafe: false };
}

// ─── Stage 3: Intent Matching ─────────────────────────────────
function detectIntent(input: string): { intent: OperatorIntent; confidence: EnglishConfidence } {
    const lower = input.toLowerCase();

    // InspectFile (specific path mentioned)
    if (/\binspect\s+(src\/|lib\/|tests\/|docs\/|\w+\.\w+)/.test(lower)) {
        return { intent: 'InspectFile', confidence: 'high' };
    }
    // InspectFile (with "look at", "check", "examine" + path)
    if (/(look at|check|examine|open)\s+(src\/|lib\/|tests\/|docs\/|\w+\.\w+)/.test(lower)) {
        return { intent: 'InspectFile', confidence: 'medium' };
    }

    // InspectWorkspace
    if (/\binspect\b.*\b(workspace|project|repo|codebase)\b/.test(lower)) {
        return { intent: 'InspectWorkspace', confidence: 'high' };
    }
    if (/\bshow\b.*\b(workspace|structure|layout|files)\b/.test(lower)) {
        return { intent: 'InspectWorkspace', confidence: 'medium' };
    }

    // PlanChange
    if (/\bplan\b.*\b(add|chang|creat|build|implement|refactor)/.test(lower)) {
        return { intent: 'PlanChange', confidence: 'high' };
    }
    if (/\bhow (would|should|to) (I |we )?(add|change|create|build)\b/.test(lower)) {
        return { intent: 'PlanChange', confidence: 'medium' };
    }

    // ProposePatch
    if (/\bpropose\b.*\b(patch|fix|change|repair)\b/.test(lower)) {
        return { intent: 'ProposePatch', confidence: 'high' };
    }
    if (/\b(create|generate|make)\b.*\b(bounded )?(patch|proposal)\b/.test(lower)) {
        return { intent: 'ProposePatch', confidence: 'medium' };
    }

    // RunTests
    if (/\brun\b.*\b(test|tests|suite)\b/.test(lower)) {
        return { intent: 'RunTests', confidence: 'high' };
    }
    if (/\bexecute\b.*\btests?\b|\btest\b.*\b(the|it|now|this)\b/.test(lower)) {
        return { intent: 'RunTests', confidence: 'medium' };
    }

    // ReviewPatch
    if (/\breview\b.*\b(patch|proposal|change)\b/.test(lower)) {
        return { intent: 'ReviewPatch', confidence: 'high' };
    }
    if (/\bapprove\b.*\b(patch|proposal)\b|\blook (at|over)\b.*\bp(atch|roposal)\b/.test(lower)) {
        return { intent: 'ReviewPatch', confidence: 'medium' };
    }

    // AuthorizePatch
    if (/\bauthorize\b.*\b(patch|proposal|change)\b/.test(lower)) {
        return { intent: 'AuthorizePatch', confidence: 'high' };
    }

    // ApplyPatch
    if (/\bapply\b.*\b(patch|proposal|change)\b/.test(lower)) {
        return { intent: 'ApplyPatch', confidence: 'high' };
    }

    // RollbackPatch
    if (/\brollback\b|\broll back\b|\bundo\b.*\b(patch|change|apply)\b/.test(lower)) {
        return { intent: 'RollbackPatch', confidence: 'high' };
    }
    if (/\brevert\b.*\b(change|patch|apply)\b/.test(lower)) {
        return { intent: 'RollbackPatch', confidence: 'medium' };
    }

    // ShowRecent
    if (/\bshow\b.*\b(recent|history|sessions|logs)\b/.test(lower)) {
        return { intent: 'ShowRecent', confidence: 'high' };
    }
    if (/\b(recent|past|previous)\b.*\b(sessions?|patches|history)\b/.test(lower)) {
        return { intent: 'ShowRecent', confidence: 'medium' };
    }

    // ResumeSession
    if (/\bresume\b.*\b(latest|session|patch)\b|\bcontinue\b.*\blatest\b/.test(lower)) {
        return { intent: 'ResumeSession', confidence: 'high' };
    }
    if (/\b(resume|continue|go back to)\b.*\b(last|previous)\b/.test(lower)) {
        return { intent: 'ResumeSession', confidence: 'medium' };
    }

    // ExplainSession
    if (/\bexplain\b.*\b(session|failure|patch|receipt|what happened|why)\b/.test(lower)) {
        return { intent: 'ExplainSession', confidence: 'high' };
    }
    if (/\bwhat (happened|went wrong|failed)\b|\bwhy did\b/.test(lower)) {
        return { intent: 'ExplainSession', confidence: 'medium' };
    }

    // RecommendTests
    if (/\brecommend\b.*\btests?\b|\bsuggest\b.*\btests?\b/.test(lower)) {
        return { intent: 'RecommendTests', confidence: 'high' };
    }
    if (/\bwhat tests?\b.*\b(should|need|would)\b/.test(lower)) {
        return { intent: 'RecommendTests', confidence: 'medium' };
    }

    // FixTests
    if (/\bfix\b.*\b(test|tests|failure|fail)\b/.test(lower)) {
        return { intent: 'FixTests', confidence: 'high' };
    }
    if (/\b(repair|resolve)\b.*\b(failing|broken|test)\b/.test(lower)) {
        return { intent: 'FixTests', confidence: 'medium' };
    }

    // InspectWorkspace (bare "inspect")
    if (/\binspect\b/.test(lower) || /\bworkspace overview\b/.test(lower)) {
        return { intent: 'InspectWorkspace', confidence: 'low' };
    }

    // ShowRecent (bare "recent" or "history")
    if (/\brecent\b/.test(lower) || /\bhistory\b/.test(lower) || /\bsessions?\b/.test(lower)) {
        return { intent: 'ShowRecent', confidence: 'low' };
    }

    // RunTests (bare "test")
    if (/\btest\b/.test(lower) && !lower.includes('fix') && !lower.includes('recommend')) {
        return { intent: 'RunTests', confidence: 'low' };
    }

    // ProposePatch (bare "patch" or "fix")
    if (/\bpatch\b/.test(lower) || (/\bfix\b/.test(lower) && !lower.includes('test'))) {
        return { intent: 'ProposePatch', confidence: 'low' };
    }

    return { intent: 'Unknown', confidence: 'low' };
}

// ─── Stage 4: Target Extraction ───────────────────────────────
function extractTargets(input: string): {
    targetFile?: string | undefined;
    targetModule?: string | undefined;
    sessionRef?: string | undefined;
    testCommand?: string | undefined;
} {
    const lower = input.toLowerCase();

    // File path extraction
    const fileMatch = input.match(/(?:inspect|check|look at|open|examine)\s+(src\/\S+|lib\/\S+|tests?\/\S+|docs\/\S+|\w+\.\w+)/i);
    const fileMatch2 = input.match(/\bmodule\s+(\w+)\b/i);
    const fileMatch3 = input.match(/\b(file|path|module)\s+["']?(\S+)["']?/i);

    const targetFile = fileMatch?.[1] ?? fileMatch3?.[2];

    // Module name extraction
    const moduleMatch = input.match(/\b(module|package|crate|component)\s+["']?(\w+)["']?/i);
    const targetModule = moduleMatch?.[2] ?? fileMatch2?.[1];

    // Session ref extraction — handle "show session X" and "resume session X" patterns
    const sessionTwoWordMatch = input.match(/\b(?:show|resume|explain)\s+session\s+([a-zA-Z0-9_-]+)/i);
    const sessionMatch = sessionTwoWordMatch
        ?? input.match(/(?:session|resume|show|explain)\s+([a-zA-Z0-9_-]+)/i);
    const latestMatch = /\blatest\b/.test(lower);
    const sessionRef = latestMatch ? 'latest' : (sessionMatch?.[1] ?? undefined);

    // Test command extraction
    const cargoMatch = input.match(/\b(cargo test(?:\s+-[^\s]+(?:\s+\S+)*)?)/i);
    const npmMatch = input.match(/\b(npm\s+(?:test|run\s+\S+)(?:\s+-[^\s]+(?:\s+\S+)*)?)/i);
    const goMatch = input.match(/\b(go test(?:\s+\S+)*)/i);
    const pytestMatch = input.match(/\b(pytest(?:\s+\S+)*)/i);
    const dotnetMatch = input.match(/\b(dotnet test(?:\s+\S+)*)/i);
    const testCommand = cargoMatch?.[1] ?? npmMatch?.[1] ?? goMatch?.[1] ?? pytestMatch?.[1] ?? dotnetMatch?.[1];

    const result: {
        targetFile?: string | undefined;
        targetModule?: string | undefined;
        sessionRef?: string | undefined;
        testCommand?: string | undefined;
    } = {};
    if (targetFile) result.targetFile = targetFile;
    if (targetModule) result.targetModule = targetModule;
    if (sessionRef) result.sessionRef = sessionRef;
    if (testCommand) result.testCommand = testCommand;
    return result;
}

// ─── Main Function ─────────────────────────────────────────────
export function parseOperatorEnglish(input: string): EnglishCommandParse {
    const trimmed = input.trim();

    // Empty input
    if (!trimmed) {
        return {
            intent: 'Unknown',
            confidence: 'low',
            targetFile: undefined,
            targetModule: undefined,
            sessionRef: undefined,
            testCommand: undefined,
            constraints: {},
            unsafeReason: undefined,
            raw: trimmed,
        };
    }

    // Stage 1: Constraints
    const constraints = detectConstraints(trimmed);

    // Stage 2: Unsafe check
    const unsafe = checkUnsafe(trimmed);
    if (unsafe.unsafe) {
        return {
            intent: 'Unknown',
            confidence: 'unsafe',
            targetFile: undefined,
            targetModule: undefined,
            sessionRef: undefined,
            testCommand: undefined,
            constraints,
            unsafeReason: unsafe.reason,
            raw: trimmed,
        };
    }

    // Stage 3: Intent
    const { intent, confidence } = detectIntent(trimmed);

    // Stage 4: Targets
    const { targetFile, targetModule, sessionRef, testCommand } = extractTargets(trimmed);

    return {
        intent,
        confidence,
        targetFile,
        targetModule,
        sessionRef,
        testCommand,
        constraints,
        unsafeReason: undefined,
        raw: trimmed,
    };
}