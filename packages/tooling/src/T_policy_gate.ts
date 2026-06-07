// @cohbit/tooling — Permission / Policy Gate (T20)
// Governs which actions the tooling layer may take under each policy mode.
//
// Core rule:
//   A tool action must be permitted by policy before it can run,
//   even if the code is capable of running it.
//   Capability ≠ legitimacy.

export type PolicyMode =
    | 'read_only' | 'audit' | 'memory_seed' | 'memory_promotion'
    | 'proposal_only' | 'repair_queue' | 'benchmark' | 'mutation_requested';

export type ToolAction =
    | 'scan_repository' | 'route_artifact' | 'risk_scan'
    | 'guard_retrieval' | 'generate_audit' | 'run_benchmark'
    | 'seed_memory' | 'promote_memory' | 'enqueue_repair'
    | 'emit_receipt' | 'write_file' | 'apply_patch'
    | 'delete_file' | 'authorize_action';

export interface PolicyDecision {
    permitted: boolean;
    reason: string;
    requiredGate?: string;
    requiredMode: PolicyMode | undefined;
}

// ─── Permission Matrix ─────────────────────────────────────────

const READ_ACTIONS: ToolAction[] = [
    'scan_repository', 'route_artifact', 'risk_scan',
    'guard_retrieval', 'generate_audit',
];

const PERMISSIONS: Record<PolicyMode, ToolAction[]> = {
    read_only: [...READ_ACTIONS],
    audit: [...READ_ACTIONS, 'run_benchmark'],
    memory_seed: [...READ_ACTIONS, 'seed_memory'],
    memory_promotion: [...READ_ACTIONS, 'seed_memory', 'promote_memory'],
    proposal_only: ['scan_repository', 'route_artifact', 'risk_scan'],
    repair_queue: [...READ_ACTIONS, 'enqueue_repair'],
    benchmark: ['run_benchmark', 'scan_repository', 'route_artifact', 'risk_scan'],
    mutation_requested: [
        ...READ_ACTIONS, 'run_benchmark', 'seed_memory', 'promote_memory',
        'enqueue_repair', 'emit_receipt', 'write_file', 'apply_patch',
        'delete_file', 'authorize_action',
    ],
};

// ─── Policy Check ──────────────────────────────────────────────

export function checkPolicy(action: ToolAction, mode: PolicyMode): PolicyDecision {
    if (!(mode in PERMISSIONS)) {
        return { permitted: false, reason: `Unknown policy mode: '${mode}'.`, requiredMode: undefined };
    }

    const allowed = PERMISSIONS[mode]!;

    if (allowed.includes(action)) {
        return { permitted: true, reason: `Action '${action}' is permitted under mode '${mode}'.`, requiredMode: undefined };
    }

    // Determine what mode would be required
    let requiredMode: PolicyMode | undefined;
    if (action === 'seed_memory') requiredMode = 'memory_seed';
    else if (action === 'promote_memory') requiredMode = 'memory_promotion';
    else if (action === 'enqueue_repair') requiredMode = 'repair_queue';
    else if (action === 'emit_receipt') requiredMode = 'mutation_requested';
    else if (action === 'write_file' || action === 'apply_patch' || action === 'delete_file') requiredMode = 'mutation_requested';
    else if (action === 'authorize_action') requiredMode = 'mutation_requested';
    else if (action === 'run_benchmark') requiredMode = 'benchmark';

    return {
        permitted: false,
        reason: `Action '${action}' is not permitted under mode '${mode}'.`,
        requiredMode,
    };
}

/**
 * Convenience: check if current mode is at least as permissive as required.
 */
export function requireMode(currentMode: PolicyMode, requiredMode: PolicyMode): boolean {
    const modeLevels: Record<PolicyMode, number> = {
        read_only: 0, proposal_only: 1, audit: 2, repair_queue: 3,
        memory_seed: 4, memory_promotion: 5, benchmark: 5,
        mutation_requested: 10,
    };
    return (modeLevels[currentMode] ?? -1) >= (modeLevels[requiredMode] ?? -1);
}

// ─── Current active mode (mutable, for CLI/trial integration) ──

let activeMode: PolicyMode = 'audit';

export function getActiveMode(): PolicyMode {
    return activeMode;
}

export function setActiveMode(mode: PolicyMode): void {
    activeMode = mode;
}

/**
 * Check an action against the currently active policy mode.
 */
export function checkCurrentPolicy(action: ToolAction): PolicyDecision {
    return checkPolicy(action, activeMode);
}