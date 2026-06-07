// Cohbit-Copilot Session Ledger (v0.8)
// Append-only JSONL persistence for gate events and receipts.
//
// Storage: .cohbit/session_ledger.jsonl
// Format: one JSON object per line, append-only
// Corruption: skip unparseable lines with warning, no panic

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { hashReceipt } from './receipt.js';
import type {
    GateRecord,
    CohBitReceipt,
} from './types.js';

// ─── Types ─────────────────────────────────────────────────────
export type LedgerEventType =
    | 'ProposalCreated'
    | 'ReviewCompleted'
    | 'AuthorizationCompleted'
    | 'ApplyCompleted'
    | 'TestsCompleted'
    | 'RollbackCompleted'
    | 'ReceiptCreated'
    | 'NoPatch'
    | 'Rejected';

export interface LedgerEvent {
    sessionId: string;
    timestamp: string;
    eventType: LedgerEventType;
    gateStatus: string;
    details: string;
    receiptHash?: string | undefined;
    proposalId?: string | undefined;
    proposalDescription?: string | undefined;
}

export interface SessionSummary {
    sessionId: string;
    lastEvent: LedgerEventType;
    lastStatus: string;
    lastTimestamp: string;
    receiptHash?: string | undefined;
    description?: string | undefined;
    eventCount: number;
}

// ─── Paths ─────────────────────────────────────────────────────
function ledgerPath(): string {
    return path.join(process.cwd(), '.cohbit', 'session_ledger.jsonl');
}

function ledgerDir(): string {
    return path.join(process.cwd(), '.cohbit');
}

async function ensureDir(): Promise<void> {
    await fs.mkdir(ledgerDir(), { recursive: true });
}

// ─── Append Event ──────────────────────────────────────────────
export async function appendSessionEvent(event: LedgerEvent): Promise<void> {
    await ensureDir();
    const line = JSON.stringify(event) + '\n';
    await fs.appendFile(ledgerPath(), line, 'utf-8');
}

// ─── Load Sessions ─────────────────────────────────────────────
async function readAllLines(): Promise<string[]> {
    try {
        const content = await fs.readFile(ledgerPath(), 'utf-8');
        return content.split('\n').filter(line => line.trim().length > 0);
    } catch {
        return [];
    }
}

export async function loadRecentSessions(limit = 10): Promise<SessionSummary[]> {
    const lines = await readAllLines();
    const sessions = new Map<string, { events: LedgerEvent[] }>();

    for (const line of lines) {
        let event: LedgerEvent;
        try {
            event = JSON.parse(line) as LedgerEvent;
        } catch {
            console.warn(`[Ledger] Skipping corrupted line: ${line.substring(0, 80)}...`);
            continue;
        }
        if (!event.sessionId) continue;

        let entry = sessions.get(event.sessionId);
        if (!entry) {
            entry = { events: [] };
            sessions.set(event.sessionId, entry);
        }
        entry.events.push(event);
    }

    // Sort by last event timestamp descending, return summaries
    const summaries: SessionSummary[] = [];
    for (const [sessionId, entry] of sessions) {
        const sorted = entry.events.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const last = sorted[sorted.length - 1]!;
        summaries.push({
            sessionId,
            lastEvent: last.eventType,
            lastStatus: last.gateStatus,
            lastTimestamp: last.timestamp,
            receiptHash: last.receiptHash,
            description: last.proposalDescription,
            eventCount: sorted.length,
        });
    }
    summaries.sort((a, b) =>
        new Date(b.lastTimestamp).getTime() - new Date(a.lastTimestamp).getTime()
    );
    return summaries.slice(0, limit);
}

// ─── Load Session By ID ────────────────────────────────────────
export async function loadSessionEvents(sessionId: string): Promise<LedgerEvent[]> {
    const lines = await readAllLines();
    const events: LedgerEvent[] = [];

    for (const line of lines) {
        let event: LedgerEvent;
        try {
            event = JSON.parse(line) as LedgerEvent;
        } catch {
            continue;
        }
        if (event.sessionId === sessionId) {
            events.push(event);
        }
    }

    return events.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
}

// ─── Summarize Session ─────────────────────────────────────────
export async function summarizeSession(sessionId: string): Promise<SessionSummary | null> {
    const events = await loadSessionEvents(sessionId);
    if (events.length === 0) return null;

    const last = events[events.length - 1]!;
    return {
        sessionId,
        lastEvent: last.eventType,
        lastStatus: last.gateStatus,
        lastTimestamp: last.timestamp,
        receiptHash: last.receiptHash,
        description: last.proposalDescription,
        eventCount: events.length,
    };
}

// ─── Gate Integration Helpers ──────────────────────────────────
export function buildLedgerEvent(
    record: GateRecord,
    eventType: LedgerEventType,
): LedgerEvent {
    return {
        sessionId: record.proposal.proposalId,
        timestamp: new Date().toISOString(),
        eventType,
        gateStatus: record.status,
        details: record.timeline[record.timeline.length - 1]?.details ?? '',
        receiptHash: record.receipt?.bitId,
        proposalId: record.proposal.proposalId,
        proposalDescription: record.proposal.description,
    };
}

// Record gate transitions from existing gate functions
export async function recordGateEvent(
    record: GateRecord,
    eventType: LedgerEventType,
): Promise<void> {
    const event = buildLedgerEvent(record, eventType);
    await appendSessionEvent(event);
}