// @cohbit/tooling — T Rust Symbol Extractor (v3.0)
// Regex-based Rust symbol extraction.
// Detects fn, struct, enum, trait, impl, mod, use, #[test], #[derive(...)].
//
// Operating law:
//   Symbol extraction is pattern-based, not AST-verified.
//   Regex parsing may miss complex generics, where clauses, or macro-produced symbols.
//   Evidence level: `surface_detected`. Not authoritative for compilation or linking.

import type { ContentArtifact } from './T_content_reader.js';

// ─── Types ─────────────────────────────────────────────────────

export type RustSymbolKind =
    | 'fn'
    | 'pub_fn'
    | 'struct'
    | 'enum'
    | 'trait'
    | 'impl'
    | 'mod'
    | 'use'
    | 'test'
    | 'derive'
    | 'macro_rules'
    | 'static'
    | 'const';

export interface RustSymbol {
    file: string;
    name: string;
    kind: RustSymbolKind;
    line: number;
    raw: string;
}

export interface RustSymbolSummary {
    totalFunctions: number;
    pubFunctions: number;
    structs: number;
    enums: number;
    traits: number;
    impls: number;
    tests: number;
    modules: number;
    macros: number;
    statics: number;
    consts: number;
    useStatements: number;
    total: number;
}

export interface RustSymbolResult {
    symbols: RustSymbol[];
    summary: RustSymbolSummary;
    filesScanned: number;
    filesWithSymbols: number;
    scannedAt: string;
}

// ─── Regex Patterns ────────────────────────────────────────────

const PATTERNS: Array<{ kind: RustSymbolKind; regex: RegExp }> = [
    // pub fn — capture name
    { kind: 'pub_fn', regex: /pub\s+fn\s+(\w+)/g },
    // fn (non-pub, non-closure) — capture name
    { kind: 'fn', regex: /(?:^|\s)fn\s+(\w+)/gm },
    // struct — capture name
    { kind: 'struct', regex: /(?:^|\s)struct\s+(\w+)/gm },
    // enum — capture name
    { kind: 'enum', regex: /(?:^|\s)enum\s+(\w+)/gm },
    // trait — capture name
    { kind: 'trait', regex: /(?:^|\s)trait\s+(\w+)/gm },
    // impl blocks — capture target type/trait name
    { kind: 'impl', regex: /impl\s+(?:[^!\{]*?for\s+)?(\w+)\s*\{/g },
    // mod — capture name
    { kind: 'mod', regex: /(?:^|\s)mod\s+(\w+)/gm },
    // use statements — capture full path (simplified)
    { kind: 'use', regex: /use\s+([^;]+);/g },
    // #[test] — capture function name that follows
    { kind: 'test', regex: /#\[test\]\s*\n\s*(?:pub\s+)?fn\s+(\w+)/g },
    // #[derive(...)] — capture derive macro names
    { kind: 'derive', regex: /#\[derive\s*\(([^)]+)\)\]/g },
    // macro_rules! — capture name
    { kind: 'macro_rules', regex: /macro_rules!\s+(\w+)/g },
    // static — capture name
    { kind: 'static', regex: /(?:^|\s)static\s+(?:mut\s+)?(\w+)/gm },
    // const — capture name
    { kind: 'const', regex: /(?:^|\s)const\s+(\w+)/gm },
];

// ─── Helpers ───────────────────────────────────────────────────

function lineNumber(text: string, index: number): number {
    let count = 1;
    for (let i = 0; i < index; i++) {
        if (text[i] === '\n') count++;
    }
    return count;
}

// ─── Symbol Extractor ──────────────────────────────────────────

/**
 * Extract Rust symbols from a single content artifact.
 * Returns an array of symbol entries with file, name, kind, line.
 */
export function extractRustSymbols(artifact: ContentArtifact): RustSymbol[] {
    const symbols: RustSymbol[] = [];
    const { path: file, text } = artifact;

    if (!file.endsWith('.rs')) return symbols;

    // Skip lines that are comments (strip // ... and /* ... */ blocks)
    // We do a simple pass: skip matching inside lines starting with optional whitespace then //
    const lines = text.split('\n');

    for (const { kind, regex } of PATTERNS) {
        // Reset regex
        regex.lastIndex = 0;

        let match: RegExpExecArray | null;
        while ((match = regex.exec(text)) !== null) {
            const name = (match[1] ?? '').trim();
            if (!name) continue;

            // Skip common false positives
            if (name === 'self' || name === 'Self' || name === 'mut' || name === 'ref') continue;
            if (/^(if|else|while|for|loop|match|return|let|where|as|in|type)$/.test(name)) continue;

            const line = lineNumber(text, match.index);

            // Simple comment check: look at the line the match starts on
            const lineText = lines[line - 1] ?? '';
            // If the line contains // and the match is after the comment start, skip
            const commentIdx = lineText.indexOf('//');
            if (commentIdx >= 0) {
                const colInLine = match.index - text.lastIndexOf('\n', match.index - 1) - 1;
                if (colInLine > commentIdx) continue;
            }

            symbols.push({
                file,
                name: name.replace(/\s+/g, ' ').trim(),
                kind,
                line,
                raw: match[0].trim().replace(/\s+/g, ' '),
            });
        }
    }

    // Deduplicate by file+line+kind+name (same match caught by multiple patterns)
    const seen = new Set<string>();
    return symbols.filter(s => {
        const key = `${s.file}:${s.line}:${s.kind}:${s.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Extract symbols from multiple Rust content artifacts and produce a summary.
 */
export function extractRustSymbolBatch(
    artifacts: ContentArtifact[],
): RustSymbolResult {
    const allSymbols: RustSymbol[] = [];
    const rustArtifacts = artifacts.filter(a => a.path.endsWith('.rs'));
    const filesWithSymbols = new Set<string>();

    for (const artifact of rustArtifacts) {
        const symbols = extractRustSymbols(artifact);
        if (symbols.length > 0) {
            filesWithSymbols.add(artifact.path);
            allSymbols.push(...symbols);
        }
    }

    const summary: RustSymbolSummary = {
        totalFunctions: 0,
        pubFunctions: 0,
        structs: 0,
        enums: 0,
        traits: 0,
        impls: 0,
        tests: 0,
        modules: 0,
        macros: 0,
        statics: 0,
        consts: 0,
        useStatements: 0,
        total: allSymbols.length,
    };

    for (const s of allSymbols) {
        switch (s.kind) {
            case 'pub_fn': summary.pubFunctions++; summary.totalFunctions++; break;
            case 'fn': summary.totalFunctions++; break;
            case 'struct': summary.structs++; break;
            case 'enum': summary.enums++; break;
            case 'trait': summary.traits++; break;
            case 'impl': summary.impls++; break;
            case 'test': summary.tests++; break;
            case 'mod': summary.modules++; break;
            case 'macro_rules': summary.macros++; break;
            case 'derive': break; // derives counted implicitly
            case 'use': summary.useStatements++; break;
            case 'static': summary.statics++; break;
            case 'const': summary.consts++; break;
        }
    }

    return {
        symbols: allSymbols,
        summary,
        filesScanned: rustArtifacts.length,
        filesWithSymbols: filesWithSymbols.size,
        scannedAt: new Date().toISOString(),
    };
}