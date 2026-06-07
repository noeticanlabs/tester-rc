// @cohbit/tooling — T5 Atlas Router
// Routes artifacts to the correct Atlas by content type and file extension.
// Spec: Noetican Tooling Layer v0.1 §9

export type AtlasTarget = 'code-atlas' | 'tlt-atlas' | 'math-atlas' | 'receipt-engine' | 'unknown';

export interface RoutingRecord {
    routingId: string;
    source: string;
    targetAtlas: AtlasTarget;
    secondaryRoutes: AtlasTarget[];
    reason: string;
    confidence: 'high' | 'medium' | 'low';
}

// ─── Routing Heuristics ────────────────────────────────────────

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.rs', '.py', '.c', '.cpp', '.go', '.java', '.cs', '.swift', '.kt']);
const MATH_EXTENSIONS = new Set(['.lean', '.thy']);
const TLT_EXTENSIONS = new Set(['.md', '.txt', '.rst', '.adoc']);
const RECEIPT_EXTENSIONS = new Set(['.json']);

let routeIdCounter = 0;

export function routeContent(filePath: string, content?: string): RoutingRecord {
    routeIdCounter += 1;
    const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
    const text = (content ?? '').toLowerCase();

    let targetAtlas: AtlasTarget = 'unknown';
    let reason = '';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    const secondaryRoutes: AtlasTarget[] = [];

    // Content-based routing (check first — can override extension for ambiguous files)
    if (text) {
        if (text.includes('theorem') || text.includes('proof') || text.includes('lemma') || text.includes('axiom')) {
            targetAtlas = 'math-atlas';
            reason = 'Content contains mathematical theorem/proof language.';
            confidence = 'medium';
        } else if (text.includes('translate') || text.includes('meaning') || text.includes('language') || text.includes('phrase')) {
            targetAtlas = 'tlt-atlas';
            reason = 'Content contains language/translation patterns.';
            confidence = 'medium';
        } else if (text.includes('function') || text.includes('class') || text.includes('import') || text.includes('return')) {
            targetAtlas = 'code-atlas';
            reason = 'Content contains programming patterns.';
            confidence = 'medium';
        }
    }

    // Extension-based routing (overrides content if content hasn't matched)
    if (targetAtlas === 'unknown') {
        if (CODE_EXTENSIONS.has(ext)) {
            targetAtlas = 'code-atlas';
            reason = `Code file extension '${ext}' detected.`;
            confidence = 'high';
        } else if (MATH_EXTENSIONS.has(ext)) {
            targetAtlas = 'math-atlas';
            reason = `Formal proof file extension '${ext}' detected.`;
            confidence = 'high';
        } else if (TLT_EXTENSIONS.has(ext)) {
            targetAtlas = 'tlt-atlas';
            reason = `Document file extension '${ext}' detected.`;
            confidence = 'high';
        } else if (RECEIPT_EXTENSIONS.has(ext) && filePath.toLowerCase().includes('receipt')) {
            targetAtlas = 'receipt-engine';
            reason = 'Receipt JSON file detected.';
            confidence = 'high';
        }
    }

    // Secondary routes
    if (targetAtlas === 'code-atlas' && text && (text.includes('proof') || text.includes('verify'))) {
        secondaryRoutes.push('math-atlas');
    }
    if (targetAtlas === 'math-atlas' && ext === '.lean') {
        secondaryRoutes.push('code-atlas');
    }
    if (targetAtlas === 'tlt-atlas' && text && text.includes('translate')) {
        secondaryRoutes.push('math-atlas');
    }

    return {
        routingId: `ROUTE_${String(routeIdCounter).padStart(6, '0')}`,
        source: filePath,
        targetAtlas,
        secondaryRoutes,
        reason,
        confidence,
    };
}