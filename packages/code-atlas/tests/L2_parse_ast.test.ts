// @cohbit/code-atlas v0.3.0 — L2 Parse/AST Tests
// Verifies parse record creation, node type validation, and invariant candidate extraction.

import { describe, it, expect } from 'vitest';
import {
    createParseRecord, generateParseId, isValidNodeType, getInvariantCandidates,
    createGuardedDivisionParse,
    NODE_INVARIANT_MAP, VALID_NODE_TYPES,
    type ParseRecord, type ASTNode, type ParserConfidence,
} from '../src/L2_parse_ast.js';

describe('v0.3 — Node Type Registry', () => {
    it('has 19 node types registered', () => {
        expect(VALID_NODE_TYPES.size).toBe(19);
    });

    it('NODE_INVARIANT_MAP covers 17 node types with invariant mappings', () => {
        expect(Object.keys(NODE_INVARIANT_MAP).length).toBe(17);
    });

    it('isValidNodeType returns true for valid types', () => {
        expect(isValidNodeType('FunctionDefinition')).toBe(true);
        expect(isValidNodeType('ConditionalBranch')).toBe(true);
        expect(isValidNodeType('Return')).toBe(true);
        expect(isValidNodeType('Unknown')).toBe(true);
    });

    it('isValidNodeType returns false for invalid types', () => {
        expect(isValidNodeType('InvalidNode')).toBe(false);
        expect(isValidNodeType('')).toBe(false);
    });
});

describe('v0.3 — Parse Record Creation', () => {
    it('creates a parse record with all required fields', () => {
        const record = createParseRecord({
            artifactId: 'ART-000001',
            language: 'python',
            parser: 'manual_v0.3',
            parserConfidence: 'high',
            rootNode: 'FunctionDefinition',
            nodes: [
                { nodeType: 'FunctionDefinition', text: 'def safe_div(a, b):' },
                { nodeType: 'ConditionalBranch', text: 'if b == 0:' },
                { nodeType: 'Return', text: 'return None' },
                { nodeType: 'Return', text: 'return a / b' },
            ],
        });

        expect(record.parseId).toMatch(/^PARSE-\d{6}$/);
        expect(record.artifactId).toBe('ART-000001');
        expect(record.language).toBe('python');
        expect(record.parser).toBe('manual_v0.3');
        expect(record.parserConfidence).toBe('high');
        expect(record.rootNode).toBe('FunctionDefinition');
        expect(record.nodes).toHaveLength(4);
        expect(record.createdAt).toBeDefined();

        // Each node should have an ID and candidate invariant
        for (const node of record.nodes) {
            expect(node.nodeId).toBeDefined();
            expect(node.mapsToCandidateInvariant).toBeDefined();
        }
    });

    it('nodes auto-assign invariant candidates from the map', () => {
        const record = createParseRecord({
            artifactId: 'ART-000002',
            language: 'rust',
            parser: 'test',
            parserConfidence: 'medium',
            rootNode: 'FunctionDefinition',
            nodes: [
                { nodeType: 'FunctionDefinition', text: 'fn div(a: f64, b: f64) -> Option<f64>' },
                { nodeType: 'ConditionalBranch', text: 'if b == 0.0' },
                { nodeType: 'Return', text: 'None' },
            ],
        });

        expect(record.nodes[0]!.mapsToCandidateInvariant).toBe('INV_001');
        expect(record.nodes[1]!.mapsToCandidateInvariant).toBe('INV_006');
        expect(record.nodes[2]!.mapsToCandidateInvariant).toBe('INV_008');
    });

    it('parserConfidence must be high, medium, or low', () => {
        const levels: ParserConfidence[] = ['high', 'medium', 'low'];
        for (const level of levels) {
            const record = createParseRecord({
                artifactId: 'ART-000003',
                language: 'c',
                parser: 'test',
                parserConfidence: level,
                rootNode: 'FunctionDefinition',
                nodes: [],
            });
            expect(record.parserConfidence).toBe(level);
        }
    });

    it('generates unique parse IDs', () => {
        const r1 = createParseRecord({ artifactId: 'A1', language: 'python', parser: 't', parserConfidence: 'low', rootNode: 'Return', nodes: [] });
        const r2 = createParseRecord({ artifactId: 'A2', language: 'python', parser: 't', parserConfidence: 'low', rootNode: 'Return', nodes: [] });
        expect(r1.parseId).not.toBe(r2.parseId);
    });
});

describe('v0.3 — Invariant Candidate Extraction', () => {
    it('extracts all unique invariant candidates from a parse record', () => {
        const record = createParseRecord({
            artifactId: 'ART-000004',
            language: 'python',
            parser: 'test',
            parserConfidence: 'high',
            rootNode: 'FunctionDefinition',
            nodes: [
                { nodeType: 'FunctionDefinition', text: 'def foo():' },
                { nodeType: 'ConditionalBranch', text: 'if x:' },
                { nodeType: 'Return', text: 'return 1' },
                { nodeType: 'Return', text: 'return 2' },
            ],
        });

        const invariants = getInvariantCandidates(record);
        expect(invariants).toContain('INV_001'); // FunctionDefinition
        expect(invariants).toContain('INV_006'); // ConditionalBranch
        expect(invariants).toContain('INV_008'); // Return
        // Duplicate Return should be deduplicated
        expect(invariants.filter(i => i === 'INV_008')).toHaveLength(1);
    });

    it('empty nodes produce empty invariant list', () => {
        const record = createParseRecord({
            artifactId: 'ART-000005', language: 'python', parser: 'test',
            parserConfidence: 'medium', rootNode: 'FunctionDefinition', nodes: [],
        });
        expect(getInvariantCandidates(record)).toEqual([]);
    });
});

describe('v0.3 — GuardedDivision Example', () => {
    it('produces correct parse for GuardedDivision in Python', () => {
        const record = createGuardedDivisionParse('ART-000006', 'python');
        expect(record.nodes).toHaveLength(4);
        expect(record.nodes[0]!.nodeType).toBe('FunctionDefinition');
        expect(record.nodes[1]!.nodeType).toBe('ConditionalBranch');
        expect(getInvariantCandidates(record)).toContain('INV_001');
        expect(getInvariantCandidates(record)).toContain('INV_006');
        expect(getInvariantCandidates(record)).toContain('INV_008');
    });
});