// CohBit-Copilot Dependency Graph (v1.2)
// Builds file-to-file dependency graphs from extracted symbols.
//
// Operating law:
//   Symbol and dependency analysis may inspect, classify, route, and warn.
//   It may not mutate, authorize, apply, rollback, or commit.

import * as path from 'node:path';
import { findSymbolsInProject } from './symbols.js';
import type {
    DependencyGraph,
    DependencyEdge,
    SymbolInfo,
    ParserConfidence,
} from './types.js';

// ─── Import Resolution ─────────────────────────────────────────
function resolveImportPath(
    fromFile: string,
    importPath: string,
    sourceFiles: string[],
): string | null {
    // Skip node_modules and external packages
    if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.startsWith('@')) {
        // Absolute external package — not resolvable to our source files
        return null;
    }

    const fromDir = path.dirname(fromFile);

    // Resolve relative imports
    if (importPath.startsWith('.')) {
        let resolved = path.join(fromDir, importPath);
        resolved = resolved.replace(/\\/g, '/');

        // Try exact match first
        if (sourceFiles.includes(resolved)) return resolved;

        // Try with .ts, .js, .rs, .py, .go extensions
        const extensions = ['.ts', '.js', '.tsx', '.jsx', '.mjs', '.rs', '.py', '.go', '.cs'];
        for (const ext of extensions) {
            if (sourceFiles.includes(resolved + ext)) return resolved + ext;
        }

        // Try index files
        for (const ext of ['/index.ts', '/index.js', '/mod.rs', '/__init__.py']) {
            if (sourceFiles.includes(resolved + ext)) return resolved + ext;
        }

        return resolved; // best-effort match
    }

    return null; // external package
}

// ─── Extract Dependencies from Symbols ────────────────────────
function extractEdges(
    file: string,
    symbols: SymbolInfo[],
    sourceFiles: string[],
): DependencyEdge[] {
    const edges: DependencyEdge[] = [];
    const imports = symbols.filter(s => s.kind === 'Import');

    for (const imp of imports) {
        // Extract the import target from raw
        let importPath = '';
        const rawStr = imp.raw;

        // TS: import { X } from './path'
        const fromMatch = rawStr.match(/from\s*['"]([^'"]+)['"]/);
        if (fromMatch) importPath = fromMatch[1]!;

        // Python: import X
        if (!importPath && /\bimport\s+(\S+)/.test(rawStr)) {
            const pyMatch = rawStr.match(/from\s+(\S+)/);
            if (pyMatch) importPath = pyMatch[1]!;
            else {
                const pyImportMatch = rawStr.match(/^import\s+(\S+)/);
                if (pyImportMatch) importPath = pyImportMatch[1]!;
            }
        }

        // Rust: use crate::X
        if (!importPath && /use\s+((?:crate|self|super)::\S+)/.test(rawStr)) {
            importPath = imp.name;
        }

        // Go: import "X"
        if (!importPath && imp.name) {
            importPath = imp.name;
        }

        if (importPath) {
            const resolved = resolveImportPath(file, importPath, sourceFiles);
            if (resolved) {
                edges.push({
                    from: file,
                    to: resolved,
                    rawImport: rawStr,
                    confidence: imp.confidence,
                });
            }
        }
    }

    return edges;
}

// ─── Public API ────────────────────────────────────────────────

export async function buildDependencyGraph(cwd: string): Promise<DependencyGraph> {
    const projectSymbols = await findSymbolsInProject(cwd);
    const allSourceFiles = Object.keys(projectSymbols.fileIndex);

    const edges: DependencyEdge[] = [];
    const seen = new Set<string>();

    for (const [file, symbols] of Object.entries(projectSymbols.fileIndex)) {
        const fileEdges = extractEdges(file, symbols, allSourceFiles);
        for (const edge of fileEdges) {
            const key = `${edge.from}→${edge.to}`;
            if (!seen.has(key)) {
                seen.add(key);
                edges.push(edge);
            }
        }
    }

    // Build adjacency lists
    const adjacency: Record<string, string[]> = {};
    const reverseAdjacency: Record<string, string[]> = {};

    for (const edge of edges) {
        if (!adjacency[edge.from]) adjacency[edge.from] = [];
        if (!reverseAdjacency[edge.to]) reverseAdjacency[edge.to] = [];

        if (!adjacency[edge.from]!.includes(edge.to)) adjacency[edge.from]!.push(edge.to);
        if (!reverseAdjacency[edge.to]!.includes(edge.from)) reverseAdjacency[edge.to]!.push(edge.from);
    }

    return { edges, adjacency, reverseAdjacency };
}

export function findDependents(
    filePath: string,
    graph: DependencyGraph,
): string[] {
    return graph.reverseAdjacency[filePath] ?? [];
}

export function findAffectedFiles(
    filePath: string,
    graph: DependencyGraph,
): string[] {
    const visited = new Set<string>();
    const queue = [filePath];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        const dependents = graph.reverseAdjacency[current] ?? [];
        for (const dep of dependents) {
            if (!visited.has(dep)) queue.push(dep);
        }
    }

    visited.delete(filePath); // remove self
    return [...visited].sort();
}