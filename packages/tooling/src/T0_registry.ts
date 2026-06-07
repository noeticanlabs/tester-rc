// @cohbit/tooling — T0 Tool Registry
// Records what tools exist, their allowed/blocked actions, and trust levels.
// Spec: Noetican Tooling Layer v0.1 §4

export type ToolType = 'scanner' | 'ingestor' | 'validator' | 'risk_scanner' | 'adapter' | 'emitter' | 'operator';
export type TrustLevel = 'operator_tool' | 'verifier_tool' | 'adapter';

export interface ToolRecord {
    toolId: string; toolName: string; toolType: ToolType;
    allowedActions: string[]; blockedActions: string[];
    requiresReceipt: boolean; trustLevel: TrustLevel;
    status: 'active' | 'inactive';
}

export const TOOL_REGISTRY: Map<string, ToolRecord> = new Map();

export function registerTool(record: ToolRecord): void {
    TOOL_REGISTRY.set(record.toolId, record);
}

export function getTool(toolId: string): ToolRecord | undefined {
    return TOOL_REGISTRY.get(toolId);
}

export function isActionAllowed(toolId: string, action: string): boolean {
    const tool = TOOL_REGISTRY.get(toolId);
    if (!tool) return false;
    if (tool.blockedActions.includes(action)) return false;
    return tool.allowedActions.includes(action);
}

// ─── Pre-register existing runtime tools ───────────────────────

registerTool({
    toolId: 'atlas-bridge', toolName: 'Atlas Bridge', toolType: 'adapter',
    allowedActions: ['classify_patch', 'build_atlas_entry', 'map_command_to_semantics', 'invoke_atlas_registry'],
    blockedActions: ['authorize', 'commit', 'mutate_filesystem', 'emit_receipt'],
    requiresReceipt: false, trustLevel: 'adapter', status: 'active',
});

registerTool({
    toolId: 'atlas-store', toolName: 'Atlas Store', toolType: 'emitter',
    allowedActions: ['store_entry', 'query_by_receipt', 'query_by_invariant', 'list_entries'],
    blockedActions: ['authorize', 'delete_entry', 'mutate_entry'],
    requiresReceipt: true, trustLevel: 'operator_tool', status: 'active',
});

registerTool({
    toolId: 'gate-pipeline', toolName: 'Gate Pipeline', toolType: 'operator',
    allowedActions: ['propose', 'review', 'authorize', 'apply', 'test', 'rollback', 'receipt'],
    blockedActions: [],
    requiresReceipt: true, trustLevel: 'operator_tool', status: 'active',
});

registerTool({
    toolId: 'path-safety', toolName: 'Path Safety', toolType: 'scanner',
    allowedActions: ['validate_path', 'check_symlink', 'detect_collision', 'reject_unsafe'],
    blockedActions: ['mutate_filesystem', 'authorize', 'commit'],
    requiresReceipt: false, trustLevel: 'verifier_tool', status: 'active',
});

registerTool({
    toolId: 'ledger-lock', toolName: 'Ledger Lock', toolType: 'operator',
    allowedActions: ['acquire_lock', 'release_lock', 'append_with_lock'],
    blockedActions: ['authorize', 'mutate_entry'],
    requiresReceipt: false, trustLevel: 'operator_tool', status: 'active',
});