// CohBit-Copilot Environment Review (v1.1B)
// Read-only assessment of project health, tool availability, and risk.
//
// Operating law:
//   Workspace and environment review are read-only.
//   They may inspect, classify, warn, and recommend.
//   They may not mutate, apply, authorize, rollback, or commit.

import { exec } from 'node:child_process';
import { scanWorkspace } from './workspace.js';
import { detectLanguage, defaultTestCommand, isToolAvailable } from './lang.js';
import type { EnvironmentReport, RiskLevel, Language, WorkspaceSummary } from './types.js';

async function checkTool(lang: Language): Promise<Record<string, boolean>> {
    const tools: Record<string, boolean> = {
        node: await isToolAvailable('node'),
        cargo: await isToolAvailable('rust'),
        go: await isToolAvailable('go'),
        pytest: await isToolAvailable('python'),
        dotnet: await isToolAvailable('dotnet'),
        git: false,
    };

    // Check git separately
    try {
        await new Promise<void>((resolve, reject) => {
            exec('git --version', { timeout: 5000 }, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        tools['git'] = true;
    } catch {
        tools['git'] = false;
    }

    return tools;
}

async function checkGitDirty(cwd: string): Promise<{ available: boolean; dirty: boolean; untracked: number }> {
    try {
        const status = await new Promise<string>((resolve, reject) => {
            exec('git status --porcelain', { cwd, timeout: 5000 }, (err, stdout) => {
                if (err) reject(err);
                else resolve(stdout);
            });
        });

        const lines = status.trim().split('\n').filter(l => l.trim());
        const untracked = lines.filter(l => l.startsWith('??')).length;
        const modified = lines.length - untracked;

        return { available: true, dirty: modified > 0, untracked };
    } catch {
        return { available: false, dirty: false, untracked: 0 };
    }
}

function assessRisk(
    workspace: WorkspaceSummary,
    tools: Record<string, boolean>,
    gitDirty: boolean,
    warnings: string[],
): { riskLevel: RiskLevel; riskReasons: string[] } {
    const reasons: string[] = [];

    // Blocked: no recognized manifest
    if (workspace.language === 'unknown') {
        reasons.push('No recognized project manifest found (package.json, Cargo.toml, go.mod, pyproject.toml, setup.py, or .csproj)');
        return { riskLevel: 'Blocked', riskReasons: reasons };
    }

    // Blocked: missing core tool
    if (workspace.language === 'rust' && !tools['cargo']) {
        reasons.push('Rust project detected but cargo is not available');
        return { riskLevel: 'Blocked', riskReasons: reasons };
    }
    if (workspace.language === 'go' && !tools['go']) {
        reasons.push('Go project detected but go is not available');
        return { riskLevel: 'Blocked', riskReasons: reasons };
    }
    if (workspace.language === 'python' && !tools['pytest']) {
        warnings.push('Python project detected but pytest is not available — test gate will not run');
    }

    // High: dirty git with many untracked files
    if (gitDirty && workspace.totalFiles > 50) {
        reasons.push('Git working directory is dirty with significant project size');
        return { riskLevel: 'High', riskReasons: reasons };
    }

    // Medium: git dirty or missing lockfile
    if (gitDirty) {
        reasons.push('Git working directory is dirty — uncommitted changes may be affected');
    }
    if (workspace.testFiles.length === 0) {
        warnings.push('No test files detected — test gate will report NoTestsFound');
        reasons.push('No test files detected in workspace');
    }
    if (reasons.length > 0) {
        return { riskLevel: 'Medium', riskReasons: reasons };
    }

    // Low: clean workspace
    reasons.push('Clean workspace — all tools available, no uncommitted changes');
    return { riskLevel: 'Low', riskReasons: reasons };
}

export async function reviewEnvironment(cwd: string): Promise<EnvironmentReport> {
    const workspace = await scanWorkspace(cwd);
    const language = workspace.language;
    const testCommand = defaultTestCommand(language);
    const tools = await checkTool(language);
    const git = await checkGitDirty(cwd);
    const warnings: string[] = [];

    const { riskLevel, riskReasons } = assessRisk(workspace, tools, git.dirty, warnings);

    return {
        workspace,
        language,
        defaultTestCommand: testCommand,
        tools,
        gitAvailable: git.available,
        gitDirty: git.dirty,
        riskLevel,
        riskReasons,
        warnings,
    };
}