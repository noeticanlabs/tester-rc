// CohBit-Copilot v14.2 — Onboarding
// Safe initialization flow for new users.
//
// Operating law:
//   Onboarding may create a local config with safe defaults.
//   It may not auto-grant apply/commit authority.
//   Default posture is learner: observe and teach only.

import { defaultConfig, saveConfig, loadConfig } from './access_control.js';

export function initConfig(force: boolean = false): string {
    const existing = loadConfig();

    if (existing && !force) {
        return [
            'Config already exists at .cohbit/config.json',
            `Current profile: ${existing.profile}`,
            '',
            'To see your config: cohbit-copilot access show',
            'To re-initialize:    cohbit-copilot init --force',
        ].join('\n');
    }

    const config = defaultConfig();
    saveConfig(config);

    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════');
    lines.push('  CohBit-Copilot — Initialized');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');
    lines.push('  Config saved to: .cohbit/config.json');
    lines.push('');
    lines.push(`  Profile:        ${config.profile} (observe + teach only)`);
    lines.push('  Apply patches:  disabled');
    lines.push('  Network access: disabled');
    lines.push('  Trust kernels:  enabled');
    lines.push('');
    lines.push('  SAFE DEFAULTS:');
    lines.push('  ✅ You can audit code');
    lines.push('  ✅ You can use teaching mode');
    lines.push('  ✅ You can view reports');
    lines.push('  ❌ You cannot apply patches');
    lines.push('  ❌ You cannot mutate source');
    lines.push('');
    lines.push('  To upgrade permissions: cohbit-copilot access set reviewer');
    lines.push('  To learn about the tool: cohbit-copilot system explain');
    lines.push('');
    lines.push('  Try your first command:  cohbit-copilot demo starter');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
}