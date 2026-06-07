// CohBit-Copilot v14.2A — Network Boundary
// Offline / local-LAN enforcement declaration layer.
//
// Operating law:
//   Network boundary enforcement declares intended network posture.
//   It may not enable network access that access-control profiles deny.
//   Default posture is fully offline. This is a configuration declaration
//   layer, not a runtime network policy engine.

import { loadConfig, saveConfig, type CohBitConfig } from './access_control.js';

export type NetworkMode = 'offline' | 'local_lan';

/**
 * Display current network boundary status.
 */
export function formatNetworkStatus(): string {
    const config = loadConfig();
    if (!config) {
        return 'No config found. Run "cohbit-copilot init" first.';
    }

    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════════════');
    lines.push('  CohBit-Copilot — Network Boundary Status');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');
    lines.push(`  Deployment mode:     ${config.deploymentMode ?? 'individual_local'}`);
    lines.push(`  Network mode:        ${config.networkMode ?? 'offline'}`);
    lines.push(`  Cloud access:        ${config.allowCloud ? '⚠ ENABLED' : '✅ disabled'}`);
    lines.push(`  Telemetry:           ${config.telemetry === 'enabled' ? '⚠ ENABLED' : '✅ disabled'}`);
    lines.push(`  External model calls: ${config.externalModelCalls ? '⚠ ENABLED' : '✅ disabled'}`);
    lines.push(`  LAN access:          ${config.allowLan ? '⚠ ENABLED' : '✅ disabled'}`);
    lines.push('');
    if (config.networkMode === 'offline' && !config.allowCloud && config.telemetry === 'disabled' && !config.externalModelCalls && !config.allowLan) {
        lines.push('  ✅ Fully offline. No network access permitted.');
    } else {
        lines.push('  ⚠ Some network access is enabled. Review your settings.');
    }
    lines.push('');
    lines.push('  To change: cohbit-copilot network set offline');
    lines.push('             cohbit-copilot network set local-lan');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
}

/**
 * Set the network mode and enforce boundary defaults.
 */
export function setNetworkMode(mode: string): string {
    if (mode !== 'offline' && mode !== 'local_lan' && mode !== 'local-lan') {
        return `Invalid network mode: "${mode}". Valid modes: offline, local-lan.`;
    }

    const config = loadConfig();
    if (!config) {
        return 'No config found. Run "cohbit-copilot init" first.';
    }

    const nm = mode as NetworkMode;
    config.networkMode = nm;

    // Enforce boundary: offline means everything disabled
    if (nm === 'offline') {
        config.allowLan = false;
        config.allowCloud = false;
        config.telemetry = 'disabled';
        config.externalModelCalls = false;
    }

    // local_lan allows LAN but still no cloud/telemetry/model calls
    if (nm === 'local_lan') {
        config.allowLan = true;
        config.allowCloud = false;
        config.telemetry = 'disabled';
        config.externalModelCalls = false;
    }

    saveConfig(config);
    return `Network mode set to "${nm}". Use "cohbit-copilot network status" to verify.`;
}