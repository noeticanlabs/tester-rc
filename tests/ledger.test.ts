// Cohbit-Copilot v0.8 — Session Ledger Tests

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
    appendSessionEvent,
    loadRecentSessions,
    loadSessionEvents,
    summarizeSession,
    buildLedgerEvent,
    recordGateEvent,
} from '../src/ledger.js';
import { propose, review } from '../src/gates.js';
import type { LedgerEvent } from '../src/ledger.js';

const originalCwd = process.cwd();
const tempDir = path.join(os.tmpdir(), `ledger-v08-${Date.now()}`);

beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true });
    process.chdir(tempDir);
});

afterAll(async () => {
    process.chdir(originalCwd);
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ═══ 1. Appends event to ledger ════════════════════════════════
it('1. appends event to ledger', async () => {
    await appendSessionEvent({
        sessionId: 'test-session-1',
        timestamp: new Date().toISOString(),
        eventType: 'ProposalCreated',
        gateStatus: 'PROPOSED',
        details: 'Fix off-by-one',
    });

    const sessions = await loadRecentSessions();
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.find(s => s.sessionId === 'test-session-1')).toBeDefined();
});

// ═══ 2. Loads recent sessions in order ══════════════════════════
it('2. loads recent sessions in order (most recent first)', async () => {
    await appendSessionEvent({ sessionId: 'older', timestamp: '2024-01-01T00:00:00Z', eventType: 'ProposalCreated', gateStatus: 'PROPOSED', details: 'older' });
    await appendSessionEvent({ sessionId: 'newer', timestamp: '2025-01-01T00:00:00Z', eventType: 'ProposalCreated', gateStatus: 'PROPOSED', details: 'newer' });

    const sessions = await loadRecentSessions(100);
    expect(sessions.length).toBeGreaterThanOrEqual(2);
    // newer should come first
    const newerIdx = sessions.findIndex(s => s.sessionId === 'newer');
    const olderIdx = sessions.findIndex(s => s.sessionId === 'older');
    expect(newerIdx).not.toBe(-1);
    expect(olderIdx).not.toBe(-1);
    expect(newerIdx).toBeLessThan(olderIdx);
});

// ═══ 3. Loads session by ID ════════════════════════════════════
it('3. loads session events by ID', async () => {
    await appendSessionEvent({ sessionId: 'load-by-id', timestamp: new Date().toISOString(), eventType: 'ProposalCreated', gateStatus: 'PROPOSED', details: 'test' });
    await appendSessionEvent({ sessionId: 'load-by-id', timestamp: new Date().toISOString(), eventType: 'ReviewCompleted', gateStatus: 'REVIEW_PASSED', details: 'approved' });

    const events = await loadSessionEvents('load-by-id');
    expect(events).toHaveLength(2);
    expect(events[0]!.eventType).toBe('ProposalCreated');
    expect(events[1]!.eventType).toBe('ReviewCompleted');
});

// ═══ 4. Summarizes session ═════════════════════════════════════
it('4. summarizes session correctly', async () => {
    await appendSessionEvent({ sessionId: 'summary-test', timestamp: new Date().toISOString(), eventType: 'ProposalCreated', gateStatus: 'PROPOSED', details: 'summary' });
    await appendSessionEvent({ sessionId: 'summary-test', timestamp: new Date().toISOString(), eventType: 'ReceiptCreated', gateStatus: 'RECEIPTED', details: 'done', receiptHash: '0'.repeat(64) });

    const summary = await summarizeSession('summary-test');
    expect(summary).not.toBeNull();
    expect(summary!.lastEvent).toBe('ReceiptCreated');
    expect(summary!.lastStatus).toBe('RECEIPTED');
    expect(summary!.receiptHash).toBe('0'.repeat(64));
    expect(summary!.eventCount).toBe(2);
});

// ═══ 5. Resumes session from ledger ═════════════════════════════
it('5. resumes session from ledger events', async () => {
    const sessionId = 'resume-test';
    await appendSessionEvent({ sessionId, timestamp: new Date().toISOString(), eventType: 'ProposalCreated', gateStatus: 'PROPOSED', details: 'Resume me', proposalDescription: 'Test resume' });
    await appendSessionEvent({ sessionId, timestamp: new Date().toISOString(), eventType: 'ReviewCompleted', gateStatus: 'REVIEW_PASSED', details: 'Approved' });

    const events = await loadSessionEvents(sessionId);
    expect(events).toHaveLength(2);
    const last = events[events.length - 1]!;
    expect(last.gateStatus).toBe('REVIEW_PASSED');
});

// ═══ 6. Builds ledger event from gate record ═══════════════════
it('6. buildLedgerEvent extracts correct fields from gate record', () => {
    const record = propose({
        description: 'Fix bug',
        files: [{ path: 'x.ts', action: 'modify', beforeContent: 'old', afterContent: 'new', diff: '+new' }],
        estimatedSpend: { numer: 0, denom: 1 },
        estimatedDefect: { numer: 0, denom: 1 },
        requiredAuthority: { numer: 0, denom: 1 },
        policyHash: 'pol',
    });

    const event = buildLedgerEvent(record, 'ProposalCreated');
    expect(event.sessionId).toBe(record.proposal.proposalId);
    expect(event.eventType).toBe('ProposalCreated');
    expect(event.gateStatus).toBe('PROPOSED');
    expect(event.proposalDescription).toBe('Fix bug');
});

// ═══ 7. Skips corrupted JSONL line ═════════════════════════════
it('7. skips corrupted JSONL line without crashing', async () => {
    const dirPath = path.join(process.cwd(), '.cohbit');
    const filePath = path.join(dirPath, 'session_ledger.jsonl');
    await fs.mkdir(dirPath, { recursive: true });

    // Write a valid line, then a garbage line, then another valid line
    await fs.writeFile(filePath,
        JSON.stringify({ sessionId: 'corrupt-ok', timestamp: new Date().toISOString(), eventType: 'ProposalCreated', gateStatus: 'PROPOSED', details: 'ok' }) + '\n' +
        'NOT VALID JSON {{{[' + '\n' +
        JSON.stringify({ sessionId: 'corrupt-ok', timestamp: new Date().toISOString(), eventType: 'ReviewCompleted', gateStatus: 'REVIEW_PASSED', details: 'ok2' }) + '\n',
        'utf-8');

    const events = await loadSessionEvents('corrupt-ok');
    expect(events).toHaveLength(2); // corrupted line skipped
});

// ═══ 8. Empty ledger returns empty ══════════════════════════════
it('8. empty ledger (no file) returns empty array', async () => {
    // Remove any existing ledger
    const filePath = path.join(process.cwd(), '.cohbit', 'session_ledger.jsonl');
    try { await fs.unlink(filePath); } catch { /* doesn't exist */ }

    const sessions = await loadRecentSessions();
    expect(sessions).toEqual([]);
});