// @cohbit/resource — R0 Resource Registry (18 resource types)
// Spec: Noetican Resource Layer v0.1 §4

export type ResourceType = {
    resourceId: string; resourceName: string; resourceFamily: string;
    unit: string; tracked: boolean; hardLimitSupported: boolean;
    softLimitSupported: boolean; receiptRequired: boolean; status: 'active';
};

export const RESOURCE_TEMPLATES: Omit<ResourceType, 'resourceId'>[] = [
    { resourceName: 'cpu_time', resourceFamily: 'compute_budget', unit: 'seconds', tracked: true, hardLimitSupported: true, softLimitSupported: true, receiptRequired: true, status: 'active' },
    { resourceName: 'gpu_time', resourceFamily: 'compute_budget', unit: 'seconds', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: true, status: 'active' },
    { resourceName: 'ram', resourceFamily: 'memory_budget', unit: 'MB', tracked: true, hardLimitSupported: true, softLimitSupported: true, receiptRequired: true, status: 'active' },
    { resourceName: 'disk_storage', resourceFamily: 'storage_budget', unit: 'bytes', tracked: true, hardLimitSupported: true, softLimitSupported: true, receiptRequired: true, status: 'active' },
    { resourceName: 'database_storage', resourceFamily: 'storage_budget', unit: 'bytes', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: true, status: 'active' },
    { resourceName: 'context_tokens', resourceFamily: 'token_budget', unit: 'tokens', tracked: true, hardLimitSupported: true, softLimitSupported: true, receiptRequired: true, status: 'active' },
    { resourceName: 'embedding_tokens', resourceFamily: 'token_budget', unit: 'tokens', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: true, status: 'active' },
    { resourceName: 'tool_calls', resourceFamily: 'tool_call_budget', unit: 'calls', tracked: true, hardLimitSupported: true, softLimitSupported: true, receiptRequired: true, status: 'active' },
    { resourceName: 'web_calls', resourceFamily: 'network_budget', unit: 'calls', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: false, status: 'active' },
    { resourceName: 'file_reads', resourceFamily: 'io_budget', unit: 'reads', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: false, status: 'active' },
    { resourceName: 'repo_scans', resourceFamily: 'io_budget', unit: 'scans', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: true, status: 'active' },
    { resourceName: 'proof_attempts', resourceFamily: 'compute_budget', unit: 'attempts', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: true, status: 'active' },
    { resourceName: 'benchmark_runs', resourceFamily: 'benchmark_budget', unit: 'runs', tracked: true, hardLimitSupported: true, softLimitSupported: true, receiptRequired: true, status: 'active' },
    { resourceName: 'human_review_minutes', resourceFamily: 'human_attention_budget', unit: 'minutes', tracked: true, hardLimitSupported: false, softLimitSupported: true, receiptRequired: false, status: 'active' },
    { resourceName: 'network_requests', resourceFamily: 'network_budget', unit: 'requests', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: false, status: 'active' },
    { resourceName: 'receipt_writes', resourceFamily: 'storage_budget', unit: 'writes', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: true, status: 'active' },
    { resourceName: 'repair_queue_capacity', resourceFamily: 'repair_budget', unit: 'tasks', tracked: true, hardLimitSupported: true, softLimitSupported: true, receiptRequired: false, status: 'active' },
    { resourceName: 'authority_scope', resourceFamily: 'authority_budget', unit: 'units', tracked: true, hardLimitSupported: true, softLimitSupported: false, receiptRequired: true, status: 'active' },
];

export const RESOURCE_REGISTRY: Map<string, ResourceType> = new Map();
let rCounter = 0;
RESOURCE_TEMPLATES.forEach(t => {
    rCounter++;
    RESOURCE_REGISTRY.set(`RES_${String(rCounter).padStart(6, '0')}`, { resourceId: `RES_${String(rCounter).padStart(6, '0')}`, ...t });
});

export function registerResource(template: Omit<ResourceType, 'resourceId'>): ResourceType {
    rCounter++;
    const r: ResourceType = { resourceId: `RES_${String(rCounter).padStart(6, '0')}`, ...template };
    RESOURCE_REGISTRY.set(r.resourceId, r);
    return r;
}

export function getResource(id: string): ResourceType | undefined { return RESOURCE_REGISTRY.get(id); }
export function isTracked(resourceName: string): boolean { return [...RESOURCE_REGISTRY.values()].some(r => r.resourceName === resourceName && r.tracked); }
export function requiresReceipt(resourceName: string): boolean { return [...RESOURCE_REGISTRY.values()].some(r => r.resourceName === resourceName && r.receiptRequired); }