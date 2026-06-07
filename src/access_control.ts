// CohBit-Copilot v14.2 — Access Control
// Local profile-based permission system.
//
// Operating law:
//   Access control may permit, deny, or require review for local commands.
//   It may not bypass gates.
//   It may not grant commit authority without receipt boundaries.
//   Default posture is observe and teach, not mutate.

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Types ────────────────────────────────────────────────────────

export type AccessProfile = 'observer' | 'learner' | 'reviewer' | 'operator' | 'maintainer';

export interface CohBitConfig {
    profile: AccessProfile;
    allowApply: boolean;
    allowNetwork: boolean;
    allowRustTrustKernels: boolean;
    reportFormat: 'markdown+json' | 'markdown' | 'json';
    defaultEvidenceCeiling: string;
    initializedAt: string;
    deploymentMode: 'individual_local';
    networkMode: 'offline' | 'local_lan';
    allowLan: boolean;
    allowCloud: boolean;
    telemetry: 'disabled' | 'enabled';
    externalModelCalls: boolean;
}

type Permission = 'audit' | 'teach' | 'view_reports' | 'view_memory' | 'view_trust'
    | 'propose' | 'apply' | 'receipt';

const PERMISSIONS: Record<AccessProfile, Permission[]> = {
    observer: ['audit', 'teach', 'view_reports', 'view_memory', 'view_trust'],
    learner: ['audit', 'teach', 'view_reports', 'view_memory', 'view_trust'],
    reviewer: ['audit', 'teach', 'view_reports', 'view_memory', 'view_trust', 'propose'],
    operator: ['audit', 'teach', 'view_reports', 'view_memory', 'view_trust', 'propose', 'apply', 'receipt'],
    maintainer: ['audit', 'teach', 'view_reports', 'view_memory', 'view_trust', 'propose', 'apply', 'receipt'],
};

// ─── Config Path ──────────────────────────────────────────────────

function configPath(): string {
    return path.join(process.cwd(), '.cohbit', 'config.json');
}

// ─── Default Config ───────────────────────────────────────────────

export function defaultConfig(): CohBitConfig {
    return {
        profile: 'learner',
        allowApply: false,
        allowNetwork: false,
        allowRustTrustKernels: true,
        reportFormat: 'markdown+json',
        defaultEvidenceCeiling: 'surface_detected',
        initializedAt: new Date().toISOString(),
        deploymentMode: 'individual_local',
        networkMode: 'offline',
        allowLan: false,
        allowCloud: false,
        telemetry: 'disabled',
        externalModelCalls: false,
    };
}

// ─── Load / Save ──────────────────────────────────────────────────

export function loadConfig(): CohBitConfig | null {
    const p = configPath();
    if (!fs.existsSync(p)) return null;
    try {
        return JSON.parse(fs.readFileSync(p, 'utf-8')) as CohBitConfig;
    } catch {
        return null;
    }
}

export function saveConfig(config: CohBitConfig): void {
    const p = configPath();
    const dir = path.dirname(p);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf-8');
}

// ─── Permission Check ─────────────────────────────────────────────

export function checkPermission(permission: Permission): { allowed: boolean; reason: string } {
    const config = loadConfig();
    if (!config) {
        return { allowed: false, reason: 'No config found. Run cohbit-copilot init to create your local config.' };
    }

    const allowed = PERMISSIONS[config.profile];
    if (allowed.includes(permission)) {
        return { allowed: true, reason: '' };
    }

    const profileName = config.profile;
    return {
        allowed: false,
        reason: `Permission "${permission}" requires at least reviewer profile. Your profile is "${profileName}". Use "cohbit-copilot access set <profile>" to upgrade.`,
    };
}

// ─── Display ──────────────────────────────────────────────────────

export function formatAccessStatus(): string {
    const config = loadConfig();
    if (!config) {
        return 'No config found. Run "cohbit-copilot init" to create one.';
    }

    const perms = PERMISSIONS[config.profile];
    const allPerms: Permission[] = ['audit', 'teach', 'view_reports', 'view_memory', 'view_trust', 'propose', 'apply', 'receipt'];

    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════');
    lines.push('  CohBit-Copilot — Access Control Status');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');
    lines.push(`  Profile:     ${config.profile}`);
    lines.push(`  Initialized: ${config.initializedAt}`);
    lines.push('');
    lines.push('  Permissions:');
    for (const p of allPerms) {
        const has = perms.includes(p);
        lines.push(`    ${has ? '✅' : '❌'} ${p}`);
    }
    lines.push('');
    lines.push('  Settings:');
    lines.push(`    allowApply:           ${config.allowApply}`);
    lines.push(`    allowNetwork:         ${config.allowNetwork}`);
    lines.push(`    allowRustTrustKernels: ${config.allowRustTrustKernels}`);
    lines.push(`    reportFormat:         ${config.reportFormat}`);
    lines.push(`    evidenceCeiling:      ${config.defaultEvidenceCeiling}`);
    lines.push('');
    lines.push('  To change profile: cohbit-copilot access set <profile>');
    lines.push('  Available: observer | learner | reviewer | operator | maintainer');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
}

// ─── Set Profile ──────────────────────────────────────────────────

export function setProfile(profile: string): string {
    const validProfiles: AccessProfile[] = ['observer', 'learner', 'reviewer', 'operator', 'maintainer'];
    if (!validProfiles.includes(profile as AccessProfile)) {
        return `Invalid profile: "${profile}". Valid profiles: ${validProfiles.join(', ')}.`;
    }

    const config = loadConfig() || defaultConfig();
    config.profile = profile as AccessProfile;
    saveConfig(config);

    return `Profile set to "${profile}". Use "cohbit-copilot access show" to view permissions.`;
}