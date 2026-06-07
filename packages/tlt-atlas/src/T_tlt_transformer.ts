// @cohbit/tlt-atlas — TLT Transformer (v8.9)
// Converts markdown/text content artifacts into structured TLT graph nodes
// using the TLT Atlas as the reference map.
//
// TLT Atlas provides the categories (what structures are allowed).
// TLT Transformer produces the graph (given text, what nodes exist).
//
// Operating law:
//   TLT structures language into graph nodes. It does not verify claims,
//   mutate source text, or authorize repairs. TLT output is advisory.

import { MEANING_INVARIANTS } from './L5_meaning_invariant.js';
import { TONE_PROFILES } from './L6_tone_register.js';
import { AMBIGUITY_RISKS } from './L9_ambiguity_risk.js';
import { DOMAIN_PROFILES } from './L7_domain_context.js';
import { classifyPhilosophicalLanguage } from './philosophy/L17_philosophical_language.js';

/** Minimal content type — avoids cross-package import from tooling. */
interface TltArtifactInput {
    path: string;
    language: string;
    text: string;
}

// ─── Types ─────────────────────────────────────────────────────

export type TltNodeType = 'claim' | 'definition' | 'assumption' | 'risk' | 'dependency' | 'tone_marker' | 'ambiguity' | 'domain_context';

export type TltEdgeType = 'depends_on' | 'supports' | 'contradicts' | 'refines' | 'contextualizes' | 'receipted_by';

export interface TltGraphNode {
    nodeId: string;
    nodeType: TltNodeType;
    sourceFile: string;
    matchedText: string;
    lineApprox: number;
    matchedInvariants: string[];    // MINV_xxx references from TLT Atlas
    matchedToneRegisters: string[]; // TONE_xxx references matching L6 profiles
    matchedAmbiguityRisks: string[]; // AMB_xxx or RISK_LANG_xxx references
    matchedDomainContexts: string[]; // DOM_xxx references (maps to DOMAIN_xxx in L7)
    confidence: 'high' | 'medium' | 'low';
    evidenceLevel: 'surface_detected';
}

export interface TltGraphEdge {
    from: string;   // nodeId
    to: string;     // nodeId
    edgeType: TltEdgeType;
    reason: string;
}

export interface TltTransformResult {
    nodes: TltGraphNode[];
    edges: TltGraphEdge[];          // v9.0: relational graph edges
    summary: {
        totalNodes: number;
        claims: number;
        definitions: number;
        risks: number;
        ambiguityNodes: number;
        toneMarkers: number;
        domainContexts: number;
    };
    artifactsProcessed: number;
}

// ─── Pattern → MINV Mapping ────────────────────────────────────

const PATTERN_MINV_MAP: { regex: RegExp; minvId: string; nodeType: TltNodeType }[] = [
    { regex: /\b(must not|shall not|never|prohibit(ed)?|forbidden)\b/i, minvId: 'MINV_017', nodeType: 'risk' },
    { regex: /\b(warning|caution|danger|critical|⚠)/i, minvId: 'MINV_014', nodeType: 'risk' },
    { regex: /\b(safety|safe|unsafe|secure|security|protect)\b/i, minvId: 'MINV_003', nodeType: 'risk' },
    { regex: /\b(limitation|does not|cannot|not intended|not guaranteed)\b/i, minvId: 'MINV_011', nodeType: 'claim' },
    { regex: /\b(should|recommend(ed)?|best practice)\b/i, minvId: 'MINV_006', nodeType: 'claim' },
    { regex: /\b(claim|assert|propose|suggest)\b/i, minvId: 'MINV_001', nodeType: 'claim' },
    { regex: /\b(evidence|proof|verify|verifiable|receipt)\b/i, minvId: 'MINV_010', nodeType: 'claim' },
    { regex: /\b(public|audience|readers|users|community)\b/i, minvId: 'MINV_012', nodeType: 'domain_context' },
    { regex: /\b(definition|defined as|means that|is defined)\b/i, minvId: 'MINV_006', nodeType: 'definition' },
    { regex: /\b(boundary|limit|scope|within|constrained)\b/i, minvId: 'MINV_009', nodeType: 'claim' },
    // v9.1: Strong claim verbs — used by ClaimGuard to detect status-upgrade language
    { regex: /\b(verified|verifi(?:ed|able)|confirm(?:ed)?)\b/i, minvId: 'MINV_010', nodeType: 'claim' },
    { regex: /\b(proven|proved|proof)\b/i, minvId: 'MINV_010', nodeType: 'claim' },
    { regex: /\b(guarantee(?:s|d)?|guaranteed)\b/i, minvId: 'MINV_003', nodeType: 'claim' },
    { regex: /\b(certif(?:ied|ies)|certification)\b/i, minvId: 'MINV_010', nodeType: 'claim' },
    { regex: /\b(complet(?:e|ed|ion)|finished|done|finali(?:zed|sed))\b/i, minvId: 'MINV_005', nodeType: 'claim' },
    { regex: /\b(production[- ]ready|release[- ]ready|deployable|shippable)\b/i, minvId: 'MINV_012', nodeType: 'claim' },
];

// ─── Tone Matching ─────────────────────────────────────────────

const TONE_PATTERNS: { regex: RegExp; toneId: string }[] = [
    { regex: /\b(must|required|mandatory|shall)\b/i, toneId: 'TONE_003' }, // authoritative
    { regex: /\b(please|thank you|appreciate|welcome)\b/i, toneId: 'TONE_001' }, // collaborative
    { regex: /\b(may|might|could|possibly|perhaps)\b/i, toneId: 'TONE_004' }, // uncertain
    { regex: /\b(caution|careful|warning|⚠)\b/i, toneId: 'TONE_005' }, // cautionary
];

// ─── Ambiguity Detection ───────────────────────────────────────

const AMBIGUITY_PATTERNS: { regex: RegExp; ambId: string }[] = [
    { regex: /\b(may|might|could|possibly|perhaps|unclear)\b/i, ambId: 'AMB_001' },
    { regex: /\b(should|should not|recommend)\b/i, ambId: 'AMB_002' },
    { regex: /\b(assume|assuming|assumption)\b/i, ambId: 'AMB_004' },
];

// ─── Domain Context ────────────────────────────────────────────

const DOMAIN_PATTERNS: { regex: RegExp; domId: string }[] = [
    { regex: /\b(spec|specification|formal|proof|theorem|lean)\b/i, domId: 'DOM_002' }, // formal/spec
    { regex: /\b(code|function|module|import|rust|typescript|python)\b/i, domId: 'DOM_001' }, // engineering
    { regex: /\b(doc|documentation|readme|guide|tutorial)\b/i, domId: 'DOM_003' }, // documentation
    { regex: /\b(public|community|post|announce|release)\b/i, domId: 'DOM_004' }, // public-facing
];

/**
 * Build typed edges between TLT graph nodes based on co-location heuristics.
 * v9.0: proximity-based edge inference.
 *
 * Edge rules:
 *   - definition → claim (refines): a definition in the same file refines a nearby claim
 *   - claim → claim (depends_on): adjacent claims in same file form dependency
 *   - risk → claim (contradicts): a risk node contradicts claims in same file
 *   - claim → definition (depends_on): claims depend on definitions in the same file
 *   - domain_context → any (contextualizes): domain context frames any node
 *   - receipt-required nodes → virtual verifier (receipted_by): marks proof debt
 */
export function buildTltEdges(nodes: TltGraphNode[]): TltGraphEdge[] {
    const edges: TltGraphEdge[] = [];
    const seen = new Set<string>();

    function addEdge(from: string, to: string, edgeType: TltEdgeType, reason: string) {
        const key = `${from}:${to}:${edgeType}`;
        if (!seen.has(key) && from !== to) {
            seen.add(key);
            edges.push({ from, to, edgeType, reason });
        }
    }

    // Group nodes by file for proximity inference
    const byFile = new Map<string, TltGraphNode[]>();
    for (const node of nodes) {
        const fileNodes = byFile.get(node.sourceFile) || [];
        fileNodes.push(node);
        byFile.set(node.sourceFile, fileNodes);
    }

    for (const [, fileNodes] of byFile) {
        // Sort by line number
        fileNodes.sort((a, b) => a.lineApprox - b.lineApprox);

        const definitions = fileNodes.filter(n => n.nodeType === 'definition');
        const claims = fileNodes.filter(n => n.nodeType === 'claim');
        const risks = fileNodes.filter(n => n.nodeType === 'risk');
        const domainContexts = fileNodes.filter(n => n.nodeType === 'domain_context');

        // definition → claim (refines): closest claim after a definition
        for (const def of definitions) {
            const nearby = claims.filter(c => c.lineApprox > def.lineApprox && c.lineApprox <= def.lineApprox + 10);
            for (const claim of nearby.slice(0, 3)) {
                addEdge(def.nodeId, claim.nodeId, 'refines',
                    `Definition at line ${def.lineApprox} refines claim at line ${claim.lineApprox} in ${def.sourceFile}`);
            }
        }

        // claim → definition (depends_on): claim references a nearby definition
        for (const claim of claims) {
            const nearby = definitions.filter(d => d.lineApprox < claim.lineApprox && d.lineApprox >= claim.lineApprox - 10);
            for (const def of nearby.slice(0, 3)) {
                addEdge(claim.nodeId, def.nodeId, 'depends_on',
                    `Claim at line ${claim.lineApprox} depends on definition at line ${def.lineApprox} in ${claim.sourceFile}`);
            }
        }

        // risk → claim (contradicts): risk node contradicts a nearby claim
        for (const risk of risks) {
            const nearby = claims.filter(c => Math.abs(c.lineApprox - risk.lineApprox) <= 5);
            for (const claim of nearby.slice(0, 2)) {
                addEdge(risk.nodeId, claim.nodeId, 'contradicts',
                    `Risk at line ${risk.lineApprox} may contradict claim at line ${claim.lineApprox} in ${risk.sourceFile}`);
            }
        }

        // domain_context → any (contextualizes): frames nearby nodes
        for (const dc of domainContexts) {
            const nearby = fileNodes.filter(n =>
                n.nodeId !== dc.nodeId && Math.abs(n.lineApprox - dc.lineApprox) <= 8
            );
            for (const other of nearby.slice(0, 5)) {
                addEdge(dc.nodeId, other.nodeId, 'contextualizes',
                    `Domain context at line ${dc.lineApprox} frames node ${other.nodeType} at line ${other.lineApprox} in ${dc.sourceFile}`);
            }
        }

        // claim → claim (supports): adjacent claims within 3 lines
        for (let i = 0; i < claims.length - 1; i++) {
            const a = claims[i]!;
            const b = claims[i + 1]!;
            if (b.lineApprox - a.lineApprox <= 3) {
                addEdge(a.nodeId, b.nodeId, 'supports',
                    `Adjacent claims at lines ${a.lineApprox}-${b.lineApprox} in ${a.sourceFile}`);
            }
        }

        // receipt-required nodes → receipted_by (proof debt marker)
        const receiptNodes = fileNodes.filter(n =>
            n.matchedInvariants.some(id => {
                const minv = MEANING_INVARIANTS.get(id);
                return minv?.receiptRequired;
            })
        );
        for (const rn of receiptNodes) {
            // Edge to a virtual verifier node — marks proof debt
            addEdge(rn.nodeId, 'VERIFIER_RECEIPT_REQUIRED', 'receipted_by',
                `Node ${rn.nodeType} at line ${rn.lineApprox} requires verifier receipt in ${rn.sourceFile}`);
        }
    }

    return edges;
}

// ─── Transformer ───────────────────────────────────────────────

let nodeCounter = 0;

/**
 * Transform content artifacts into TLT graph nodes using TLT Atlas registries.
 */
export function transformToTltGraph(artifacts: TltArtifactInput[]): TltTransformResult {
    const nodes: TltGraphNode[] = [];
    const docArtifacts = artifacts.filter(a =>
        a.language === 'markdown' || a.path.endsWith('.md') || a.path.endsWith('.txt') || a.path.endsWith('.rst')
    );

    for (const artifact of docArtifacts) {
        const lines = artifact.text.split('\n');

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            const line = lines[lineIdx]!;

            // Pre-compute shared line-level signal detection (v9.0: no break — multi-signal)
            const lineToneIds = TONE_PATTERNS
                .filter(tp => tp.regex.test(line))
                .map(tp => tp.toneId);

            const lineAmbIds = AMBIGUITY_PATTERNS
                .filter(ap => ap.regex.test(line))
                .map(ap => ap.ambId);

            const lineDomIds = DOMAIN_PATTERNS
                .filter(dp => dp.regex.test(line))
                .map(dp => dp.domId);

            // Match against TLT Atlas meaning invariants — allow multiple matches per line
            for (const mapping of PATTERN_MINV_MAP) {
                const match = line.match(mapping.regex);
                if (!match || !match[0]) continue;

                const inv = MEANING_INVARIANTS.get(mapping.minvId);
                if (!inv) continue;

                nodeCounter++;
                const nodeId = `TLT_${String(nodeCounter).padStart(5, '0')}`;

                nodes.push({
                    nodeId,
                    nodeType: mapping.nodeType,
                    sourceFile: artifact.path,
                    matchedText: line.trim().substring(0, 120),
                    lineApprox: lineIdx + 1,
                    matchedInvariants: [mapping.minvId],
                    matchedToneRegisters: [...new Set(lineToneIds)],
                    matchedAmbiguityRisks: [...new Set(lineAmbIds)],
                    matchedDomainContexts: [...new Set(lineDomIds)],
                    confidence: inv.receiptRequired ? 'high' : 'medium',
                    evidenceLevel: 'surface_detected',
                });
            }
        }
    }

    // ─── v9.0: Edge Construction ──────────────────────────────────
    const edges = buildTltEdges(nodes);

    const summary = {
        totalNodes: nodes.length,
        claims: nodes.filter(n => n.nodeType === 'claim').length,
        definitions: nodes.filter(n => n.nodeType === 'definition').length,
        risks: nodes.filter(n => n.nodeType === 'risk').length,
        ambiguityNodes: nodes.filter(n => n.matchedAmbiguityRisks.length > 0).length,
        toneMarkers: nodes.filter(n => n.matchedToneRegisters.length > 0).length,
        domainContexts: nodes.filter(n => n.matchedDomainContexts.length > 0).length,
    };

    return { nodes, edges, summary, artifactsProcessed: docArtifacts.length };
}