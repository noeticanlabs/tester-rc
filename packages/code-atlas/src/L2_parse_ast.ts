// @cohbit/code-atlas — L2 Parse / AST Layer
// Converts language-specific surface code into structured records.
//
// Spec source: Noetican Code Invariant Atlas v0.2 §C
// Governing law:
//   The AST layer does not decide if code is good.
//   It only identifies structure.

// ─── Types ─────────────────────────────────────────────────────

/** Confidence level of the parser. */
export type ParserConfidence = 'high' | 'medium' | 'low';

/** A single AST node within a parse record. */
export interface ASTNode {
    nodeId: string;
    nodeType: string;
    text: string;
    mapsToCandidateInvariant?: string | undefined;
    children?: string[] | undefined;
}

/** A parse record linking an artifact to its structural interpretation. */
export interface ParseRecord {
    parseId: string;
    artifactId: string;
    language: string;
    parser: string;
    parserConfidence: ParserConfidence;
    rootNode: string;
    nodes: ASTNode[];
    createdAt: string;
}

/** Node types recognized across all supported languages. */
export type NodeType =
    | 'FunctionDefinition'
    | 'ParameterList'
    | 'ConditionalBranch'
    | 'Return'
    | 'VariableBinding'
    | 'Assignment'
    | 'FunctionCall'
    | 'Loop'
    | 'ErrorPath'
    | 'ResultOrOption'
    | 'Allocation'
    | 'Deallocation'
    | 'PointerDereference'
    | 'ProofObligation'
    | 'ImportDependency'
    | 'StructOrClass'
    | 'InterfaceOrTrait'
    | 'TestAssertion'
    | 'Unknown';

/** Mapping from node type to candidate invariant. */
export const NODE_INVARIANT_MAP: Record<string, string> = {
    FunctionDefinition: 'INV_001',
    FunctionCall: 'INV_002',
    VariableBinding: 'INV_003',
    Assignment: 'INV_004',
    ConditionalBranch: 'INV_006',
    Loop: 'INV_007',
    Return: 'INV_008',
    ErrorPath: 'INV_009',
    ResultOrOption: 'INV_011',
    Allocation: 'INV_012',
    Deallocation: 'INV_013',
    PointerDereference: 'INV_016',
    ImportDependency: 'INV_021',
    StructOrClass: 'INV_019',
    InterfaceOrTrait: 'INV_020',
    ProofObligation: 'INV_024',
    TestAssertion: 'INV_023',
};

/** All recognized node types. */
export const VALID_NODE_TYPES: Set<NodeType> = new Set([
    'FunctionDefinition',
    'ParameterList',
    'ConditionalBranch',
    'Return',
    'VariableBinding',
    'Assignment',
    'FunctionCall',
    'Loop',
    'ErrorPath',
    'ResultOrOption',
    'Allocation',
    'Deallocation',
    'PointerDereference',
    'ProofObligation',
    'ImportDependency',
    'StructOrClass',
    'InterfaceOrTrait',
    'TestAssertion',
    'Unknown',
]);

// ─── Factory ───────────────────────────────────────────────────

let parseCounter = 0;

/** Generate a unique parse record ID. */
export function generateParseId(): string {
    parseCounter += 1;
    return `PARSE-${String(parseCounter).padStart(6, '0')}`;
}

/** Generate a unique node ID. */
export function generateNodeId(): string {
    return `NODE-${String(parseCounter).padStart(6, '0')}-${Date.now().toString(36)}`;
}

/**
 * Create a ParseRecord from an artifact and parsed nodes.
 */
export function createParseRecord(params: {
    artifactId: string;
    language: string;
    parser: string;
    parserConfidence: ParserConfidence;
    rootNode: string;
    nodes: Omit<ASTNode, 'nodeId'>[];
}): ParseRecord {
    const nodesWithIds: ASTNode[] = params.nodes.map((n, i) => ({
        ...n,
        nodeId: `NODE-${String(parseCounter).padStart(6, '0')}-${i.toString(16)}`,
        mapsToCandidateInvariant: n.mapsToCandidateInvariant ?? NODE_INVARIANT_MAP[n.nodeType],
    }));

    return {
        parseId: generateParseId(),
        artifactId: params.artifactId,
        language: params.language,
        parser: params.parser,
        parserConfidence: params.parserConfidence,
        rootNode: params.rootNode,
        nodes: nodesWithIds,
        createdAt: new Date().toISOString(),
    };
}

/** Check if a node type string is valid. */
export function isValidNodeType(type: string): type is NodeType {
    return VALID_NODE_TYPES.has(type as NodeType);
}

/**
 * Get all invariant candidates from a parse record.
 * Returns deduplicated invariant IDs that the nodes map to.
 */
export function getInvariantCandidates(record: ParseRecord): string[] {
    const invariants = new Set<string>();
    for (const node of record.nodes) {
        if (node.mapsToCandidateInvariant) {
            invariants.add(node.mapsToCandidateInvariant);
        }
    }
    return [...invariants];
}

/**
 * Example: create a sample parse record for a GuardedDivision function.
 * Used for testing and demonstration.
 */
export function createGuardedDivisionParse(artifactId: string, language: string): ParseRecord {
    return createParseRecord({
        artifactId,
        language,
        parser: 'manual_v0.3',
        parserConfidence: 'high',
        rootNode: 'FunctionDefinition',
        nodes: [
            {
                nodeType: 'FunctionDefinition',
                text: language === 'python' ? 'def safe_div(a, b):' : 'function safeDiv(a, b)',
            },
            {
                nodeType: 'ConditionalBranch',
                text: language === 'python' ? 'if b == 0:' : 'if (b === 0)',
            },
            {
                nodeType: 'Return',
                text: language === 'python' ? 'return None' : 'return null',
            },
            {
                nodeType: 'Return',
                text: 'return a / b',
            },
        ],
    });
}