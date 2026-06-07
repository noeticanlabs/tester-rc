import { describe, it, expect } from 'vitest';
import { checkPolicy, requireMode, setActiveMode, getActiveMode, checkCurrentPolicy, type PolicyMode, type ToolAction } from '../src/T_policy_gate.js';

describe('v3.0 — Permission / Policy Gate', () => {
    it('read_only allows scan, blocks write', () => {
        expect(checkPolicy('scan_repository', 'read_only').permitted).toBe(true);
        expect(checkPolicy('write_file', 'read_only').permitted).toBe(false);
    });

    it('audit allows all read actions, blocks seed/promote/mutate', () => {
        expect(checkPolicy('scan_repository', 'audit').permitted).toBe(true);
        expect(checkPolicy('guard_retrieval', 'audit').permitted).toBe(true);
        expect(checkPolicy('generate_audit', 'audit').permitted).toBe(true);
        expect(checkPolicy('seed_memory', 'audit').permitted).toBe(false);
        expect(checkPolicy('promote_memory', 'audit').permitted).toBe(false);
        expect(checkPolicy('write_file', 'audit').permitted).toBe(false);
        expect(checkPolicy('apply_patch', 'audit').permitted).toBe(false);
    });

    it('memory_seed allows seed_memory, blocks promote_memory', () => {
        expect(checkPolicy('seed_memory', 'memory_seed').permitted).toBe(true);
        expect(checkPolicy('promote_memory', 'memory_seed').permitted).toBe(false);
    });

    it('memory_promotion allows promote_memory', () => {
        expect(checkPolicy('promote_memory', 'memory_promotion').permitted).toBe(true);
        expect(checkPolicy('seed_memory', 'memory_promotion').permitted).toBe(true);
    });

    it('mutation_requested allows write/apply/delete', () => {
        expect(checkPolicy('write_file', 'mutation_requested').permitted).toBe(true);
        expect(checkPolicy('apply_patch', 'mutation_requested').permitted).toBe(true);
        expect(checkPolicy('delete_file', 'mutation_requested').permitted).toBe(true);
        expect(checkPolicy('emit_receipt', 'mutation_requested').permitted).toBe(true);
    });

    it('benchmark allows benchmark and scan actions', () => {
        expect(checkPolicy('run_benchmark', 'benchmark').permitted).toBe(true);
        expect(checkPolicy('scan_repository', 'benchmark').permitted).toBe(true);
        expect(checkPolicy('promote_memory', 'benchmark').permitted).toBe(false);
    });

    it('each decision includes reason string', () => {
        const d = checkPolicy('scan_repository', 'read_only');
        expect(typeof d.reason).toBe('string');
        expect(d.reason.length).toBeGreaterThan(0);
    });

    it('denied actions include requiredMode hint', () => {
        const d = checkPolicy('promote_memory', 'audit');
        expect(d.permitted).toBe(false);
        expect(d.requiredMode).toBeDefined();
    });

    it('requireMode correctly compares levels', () => {
        expect(requireMode('mutation_requested', 'audit')).toBe(true);
        expect(requireMode('audit', 'mutation_requested')).toBe(false);
        expect(requireMode('memory_promotion', 'memory_seed')).toBe(true);
        expect(requireMode('read_only', 'audit')).toBe(false);
    });

    it('active mode defaults to audit', () => {
        expect(getActiveMode()).toBe('audit');
    });

    it('setActiveMode changes current mode', () => {
        setActiveMode('read_only');
        expect(getActiveMode()).toBe('read_only');
        setActiveMode('audit'); // restore
    });

    it('checkCurrentPolicy uses active mode', () => {
        setActiveMode('read_only');
        expect(checkCurrentPolicy('scan_repository').permitted).toBe(true);
        expect(checkCurrentPolicy('write_file').permitted).toBe(false);
        setActiveMode('audit'); // restore
    });

    it('14 known actions all resolve in at least one mode', () => {
        const actions: ToolAction[] = [
            'scan_repository', 'route_artifact', 'risk_scan', 'guard_retrieval',
            'generate_audit', 'run_benchmark', 'seed_memory', 'promote_memory',
            'enqueue_repair', 'emit_receipt', 'write_file', 'apply_patch',
            'delete_file', 'authorize_action',
        ];
        const modes: PolicyMode[] = ['read_only', 'audit', 'memory_seed', 'memory_promotion', 'proposal_only', 'repair_queue', 'benchmark', 'mutation_requested'];
        for (const action of actions) {
            const permittedModes = modes.filter(m => checkPolicy(action, m).permitted);
            expect(permittedModes.length).toBeGreaterThan(0);
        }
    });
});