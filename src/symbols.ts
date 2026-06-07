// CohBit-Copilot Symbol Extraction (v1.2)
// Regex-based per-language symbol extraction. Conservative, confidence-tagged.
//
// Operating law:
//   Symbol and dependency analysis may inspect, classify, route, and warn.
//   It may not mutate, authorize, apply, rollback, or commit.

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { detectLanguage } from './lang.js';
import { scanWorkspace } from './workspace.js';
import type {
    SymbolInfo,
    SymbolKind,
    SymbolFilter,
    ProjectSymbols,
    Language,
    ParserConfidence,
} from './types.js';

// ─── Per-Language Extractors ───────────────────────────────────

function makeSym(
    file: string, name: string, kind: SymbolKind, line: number,
    confidence: ParserConfidence, raw: string,
): SymbolInfo {
    return { file, name, kind, line, confidence, raw };
}

function getLineNumber(text: string, pos: number): number {
    return text.substring(0, pos).split('\n').length;
}

// ─── TypeScript / JavaScript ──────────────────────────────────
function extractTS(content: string, file: string): SymbolInfo[] {
    const syms: SymbolInfo[] = [];

    // import { X, Y } from './path'
    const importNamed = /import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = importNamed.exec(content)) !== null) {
        const names = m[1]!.split(',').map(n => n.trim()).filter(Boolean);
        for (const name of names) {
            syms.push(makeSym(file, name, 'Import', getLineNumber(content, m.index), 'high', m[0]));
        }
    }

    // import X from './path'
    const importDefault = /import\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
    while ((m = importDefault.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Import', getLineNumber(content, m.index), 'high', m[0]));
    }

    // import * as X from './path'
    const importNamespace = /import\s*\*\s*as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
    while ((m = importNamespace.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Import', getLineNumber(content, m.index), 'high', m[0]));
    }

    // export function X
    const exportFn = /export\s+(?:async\s+)?function\s+(\w+)/g;
    while ((m = exportFn.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Function', getLineNumber(content, m.index), 'high', m[0]));
    }

    // export class X
    const exportClass = /export\s+class\s+(\w+)/g;
    while ((m = exportClass.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Class', getLineNumber(content, m.index), 'high', m[0]));
    }

    // export interface X
    const exportIface = /export\s+interface\s+(\w+)/g;
    while ((m = exportIface.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Interface', getLineNumber(content, m.index), 'high', m[0]));
    }

    // export type X =
    const exportType = /export\s+type\s+(\w+)\s*=/g;
    while ((m = exportType.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Type', getLineNumber(content, m.index), 'high', m[0]));
    }

    // export enum X
    const exportEnum = /export\s+enum\s+(\w+)/g;
    while ((m = exportEnum.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Enum', getLineNumber(content, m.index), 'high', m[0]));
    }

    // export const X =
    const exportConst = /export\s+const\s+(\w+)\s*[:=]/g;
    while ((m = exportConst.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Const', getLineNumber(content, m.index), 'medium', m[0]));
    }

    // export default function/class
    const exportDefault = /export\s+default\s+(?:function|class)\s+(\w+)/g;
    while ((m = exportDefault.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Function', getLineNumber(content, m.index), 'high', m[0]));
    }

    return syms;
}

// ─── Rust ─────────────────────────────────────────────────────
function extractRust(content: string, file: string): SymbolInfo[] {
    const syms: SymbolInfo[] = [];
    let m: RegExpExecArray | null;

    // pub fn X
    const pubFn = /pub\s+(?:async\s+)?fn\s+(\w+)/g;
    while ((m = pubFn.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Function', getLineNumber(content, m.index), 'high', m[0]));
    }

    // pub struct X
    const pubStruct = /pub\s+struct\s+(\w+)/g;
    while ((m = pubStruct.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Struct', getLineNumber(content, m.index), 'high', m[0]));
    }

    // pub enum X
    const pubEnum = /pub\s+enum\s+(\w+)/g;
    while ((m = pubEnum.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Enum', getLineNumber(content, m.index), 'high', m[0]));
    }

    // pub trait X
    const pubTrait = /pub\s+trait\s+(\w+)/g;
    while ((m = pubTrait.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Trait', getLineNumber(content, m.index), 'high', m[0]));
    }

    // pub mod X
    const pubMod = /pub\s+mod\s+(\w+)/g;
    while ((m = pubMod.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Module', getLineNumber(content, m.index), 'high', m[0]));
    }

    // mod X;
    const modDecl = /mod\s+(\w+)\s*;/g;
    while ((m = modDecl.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Module', getLineNumber(content, m.index), 'medium', m[0]));
    }

    // use crate::X
    const useCrate = /use\s+((?:crate|self|super)::[\w:]+(?:::[\w:]+)*)/g;
    while ((m = useCrate.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Import', getLineNumber(content, m.index), 'high', m[0]));
    }

    return syms;
}

// ─── Python ───────────────────────────────────────────────────
function extractPython(content: string, file: string): SymbolInfo[] {
    const syms: SymbolInfo[] = [];
    let m: RegExpExecArray | null;

    // import X
    const importX = /^import\s+(\w+)/gm;
    while ((m = importX.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Import', getLineNumber(content, m.index), 'high', m[0]));
    }

    // from X import Y
    const fromImport = /^from\s+(\S+)\s+import\s+(\w+)/gm;
    while ((m = fromImport.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Import', getLineNumber(content, m.index), 'high', m[0]));
        syms.push(makeSym(file, m[2]!, 'Import', getLineNumber(content, m.index), 'high', m[0]));
    }

    // def X
    const defX = /^def\s+(\w+)/gm;
    while ((m = defX.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Function', getLineNumber(content, m.index), 'high', m[0]));
    }

    // class X
    const classX = /^class\s+(\w+)/gm;
    while ((m = classX.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Class', getLineNumber(content, m.index), 'high', m[0]));
    }

    return syms;
}

// ─── Go ───────────────────────────────────────────────────────
function extractGo(content: string, file: string): SymbolInfo[] {
    const syms: SymbolInfo[] = [];
    let m: RegExpExecArray | null;

    // import "X" or import ( "X" ... )
    const importSingle = /import\s+"([^"]+)"/g;
    while ((m = importSingle.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, 'Import', getLineNumber(content, m.index), 'high', m[0]));
    }
    const importBlock = /import\s*\(([^)]+)\)/g;
    while ((m = importBlock.exec(content)) !== null) {
        const lines = m[1]!.match(/"([^"]+)"/g);
        if (lines) {
            for (const line of lines) {
                syms.push(makeSym(file, line.replace(/"/g, ''), 'Import', getLineNumber(content, m.index), 'medium', m[0]));
            }
        }
    }

    // func X
    const funcX = /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/g;
    while ((m = funcX.exec(content)) !== null) {
        const name = m[1]!;
        if (name !== 'init' && !name.startsWith('Test')) {
            syms.push(makeSym(file, name, 'Function', getLineNumber(content, m.index), 'high', m[0]));
        }
    }

    // type X struct/interface
    const typeX = /type\s+(\w+)\s+(struct|interface)/g;
    while ((m = typeX.exec(content)) !== null) {
        syms.push(makeSym(file, m[1]!, m[2] === 'struct' ? 'Struct' : 'Interface', getLineNumber(content, m.index), 'high', m[0]));
    }

    return syms;
}

// ─── Dispatch ─────────────────────────────────────────────────
function extractSymbolsFromContent(content: string, file: string, language: Language): SymbolInfo[] {
    switch (language) {
        case 'node': return extractTS(content, file);
        case 'rust': return extractRust(content, file);
        case 'go': return extractGo(content, file);
        case 'python': return extractPython(content, file);
        case 'dotnet': return extractTS(content, file); // closest approximation
        default: return [{
            file, name: 'unsupported_language', kind: 'Unknown', line: 1,
            confidence: 'low', raw: `Unsupported language: ${language}`,
        }];
    }
}

// ─── Public API ────────────────────────────────────────────────

export async function extractSymbols(
    filePath: string,
    cwd: string,
): Promise<SymbolInfo[]> {
    let content: string;
    try {
        content = await fs.readFile(filePath, 'utf-8');
    } catch {
        return [{
            file: filePath, name: 'file_read_error', kind: 'Unknown', line: 0,
            confidence: 'low', raw: 'Failed to read file',
        }];
    }

    const language = await detectLanguage(cwd);
    return extractSymbolsFromContent(content, filePath, language);
}

export async function findSymbolsInProject(
    cwd: string,
    filter?: SymbolFilter,
): Promise<ProjectSymbols> {
    const workspace = await scanWorkspace(cwd);
    const language = workspace.language;

    const allSymbols: SymbolInfo[] = [];
    const fileIndex: Record<string, SymbolInfo[]> = {};

    const allSourceFiles = [...workspace.sourceFiles, ...workspace.testFiles];

    for (const relPath of allSourceFiles) {
        const fullPath = path.join(cwd, relPath);
        let content: string;
        try {
            content = await fs.readFile(fullPath, 'utf-8');
        } catch {
            continue;
        }

        const syms = extractSymbolsFromContent(content, relPath, language);
        const filtered = filter
            ? syms.filter(s => {
                if (filter.kinds && !filter.kinds.includes(s.kind)) return false;
                if (filter.paths && !filter.paths.some(p => s.file.includes(p))) return false;
                if (filter.namePattern && !new RegExp(filter.namePattern).test(s.name)) return false;
                return true;
            })
            : syms;

        allSymbols.push(...filtered);
        fileIndex[relPath] = filtered;
    }

    return { root: cwd, language, symbols: allSymbols, fileIndex };
}