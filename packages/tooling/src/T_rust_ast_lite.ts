// @cohbit/tooling — T Rust AST-Lite (v3.4)
// Lightweight structural parser for Rust source code.
// Extracts function boundaries, return types, impl blocks, attributes,
// test markers, struct/enum boundaries, use/module statements.
// Not a compiler frontend. Heuristic brace counting. syntax_checked.

import type { ContentArtifact } from './T_content_reader.js';
import type { RustEvidenceLevel } from './T_rust_risk_scanner.js';

// ─── Types ─────────────────────────────────────────────────────

export interface RustFunction {
    name: string; line: number; endLine: number;
    isPublic: boolean; isUnsafe: boolean; isAsync: boolean; isTest: boolean;
    returnType: string | null; parentImpl: string | null; attributes: string[];
}

export interface RustImplBlock {
    targetType: string; line: number; endLine: number;
    isTraitImpl: boolean; traitName: string | null; functions: string[];
}

export interface RustStructDef { name: string; line: number; isPublic: boolean; }
export interface RustEnumDef { name: string; line: number; isPublic: boolean; }
export interface RustUseStatement { path: string; line: number; }
export interface RustModuleDef { name: string; line: number; isTestModule: boolean; }

export interface RustAstLite {
    functions: RustFunction[]; implBlocks: RustImplBlock[];
    structs: RustStructDef[]; enums: RustEnumDef[];
    useStatements: RustUseStatement[]; modules: RustModuleDef[];
    testFunctions: RustFunction[];
    evidenceLevel: RustEvidenceLevel; parsedAt: string;
}

export interface RustAstLiteResult { ast: RustAstLite; filesParsed: number; filesWithSymbols: number; }

export interface FunctionContext {
    function: RustFunction | null; implBlock: RustImplBlock | null;
    module: RustModuleDef | null; isTestContext: boolean; isProductionContext: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────

function isCommentLine(line: string): boolean {
    const t = line.trimStart();
    return t.startsWith('//') || t.startsWith('/*') || t.startsWith('*');
}

function parseAttributes(lines: string[], startLine: number): string[] {
    const attrs: string[] = [];
    for (let i = startLine - 1; i >= Math.max(0, startLine - 5); i--) {
        const line = lines[i]?.trim() ?? '';
        if (line.startsWith('#[')) {
            const m = line.match(/#\[([^\]]+)\]/g);
            if (m) for (const a of m) attrs.push(a.slice(2, -1).trim());
        } else if (line === '' || line.startsWith('//') || line.startsWith('///')) {
            continue;
        } else { break; }
    }
    return attrs;
}

function findMatchingBrace(lines: string[], startLine: number): number {
    let depth = 0; let inString = false; let inChar = false;
    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i]!;
        for (let j = 0; j < line.length; j++) {
            const ch = line[j]!; const prev = j > 0 ? line[j - 1]! : '';
            if (ch === '"' && prev !== '\\' && !inChar) { inString = !inString; continue; }
            if (ch === "'" && prev !== '\\' && !inString) { inChar = !inChar; continue; }
            if (inString || inChar) continue;
            if (ch === '{' && prev !== '\\') depth++;
            if (ch === '}' && prev !== '\\') { depth--; if (depth === 0) return i + 1; }
        }
    }
    return lines.length;
}

// ─── Pattern matchers ───────────────────────────────────────────

const FN_RE = /(?:(pub(?:\([^)]*\))?)\s+)?(?:(unsafe)\s+)?(?:(async)\s+)?fn\s+(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?:->\s*([^{;]+))?\s*(?:where\s+[^{]+)?\s*\{/;
const IMPL_RE = /impl\s+(?:([\w:]+)\s+for\s+)?([\w:]+)\s*\{/;
const STRUCT_RE = /(?:(pub(?:\([^)]*\))?)\s+)?struct\s+(\w+)/;
const ENUM_RE = /(?:(pub(?:\([^)]*\))?)\s+)?enum\s+(\w+)/;
const USE_RE = /use\s+([^;]+);/;
const MOD_RE = /mod\s+(\w+)\s*\{/;

function tryParseFn(line: string): { name: string; isPublic: boolean; isUnsafe: boolean; isAsync: boolean; returnType: string | null } | null {
    const m = line.match(FN_RE);
    if (!m) return null;
    return { name: m[4]!, isPublic: m[1] !== undefined, isUnsafe: m[2] !== undefined, isAsync: m[3] !== undefined, returnType: m[5]?.trim() ?? null };
}

function tryParseImpl(line: string): { targetType: string; isTraitImpl: boolean; traitName: string | null } | null {
    const m = line.match(IMPL_RE);
    if (!m) return null;
    return { targetType: m[2]!, isTraitImpl: m[1] !== undefined, traitName: m[1] ?? null };
}

// ─── Main Parser ────────────────────────────────────────────────

export function parseRustAstLite(source: string, _filePath: string): RustAstLite {
    const lines = source.split('\n');
    const functions: RustFunction[] = [];
    const implBlocks: RustImplBlock[] = [];
    const structs: RustStructDef[] = [];
    const enums: RustEnumDef[] = [];
    const useStatements: RustUseStatement[] = [];
    const modules: RustModuleDef[] = [];

    let currentImpl: string | null = null;
    const openImpls: RustImplBlock[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!; const lineNum = i + 1;
        if (isCommentLine(line)) continue;

        // impl blocks
        const implM = tryParseImpl(line);
        if (implM) {
            const endLine = findMatchingBrace(lines, i);
            const impl: RustImplBlock = { targetType: implM.targetType, line: lineNum, endLine, isTraitImpl: implM.isTraitImpl, traitName: implM.traitName, functions: [] };
            implBlocks.push(impl);
            openImpls.push(impl);
            currentImpl = implM.targetType;
            i = endLine - 1;
            continue;
        }

        // functions
        const fnM = tryParseFn(line);
        if (fnM) {
            const attrs = parseAttributes(lines, i);
            const isTest = attrs.some(a => a === 'test' || a.startsWith('test'));
            const endLine = findMatchingBrace(lines, i);
            const func: RustFunction = {
                name: fnM.name, line: lineNum, endLine,
                isPublic: fnM.isPublic, isUnsafe: fnM.isUnsafe, isAsync: fnM.isAsync,
                isTest, returnType: fnM.returnType,
                parentImpl: currentImpl, attributes: attrs,
            };
            functions.push(func);
            const lastImpl = openImpls[openImpls.length - 1];
            if (lastImpl && lastImpl.line <= lineNum && lineNum <= lastImpl.endLine) {
                lastImpl.functions.push(fnM.name);
            }
            i = endLine - 1;
            continue;
        }

        // struct
        const structM = line.match(STRUCT_RE);
        if (structM) { structs.push({ name: structM[2]!, line: lineNum, isPublic: structM[1] !== undefined }); }

        // enum
        const enumM = line.match(ENUM_RE);
        if (enumM) { enums.push({ name: enumM[2]!, line: lineNum, isPublic: enumM[1] !== undefined }); }

        // use
        const useM = line.match(USE_RE);
        if (useM) { useStatements.push({ path: useM[1]!.trim(), line: lineNum }); }

        // mod
        const modM = line.match(MOD_RE);
        if (modM) { modules.push({ name: modM[1]!, line: lineNum, isTestModule: modM[1] === 'tests' || modM[1]!.startsWith('test_') }); }
    }

    return {
        functions, implBlocks, structs, enums, useStatements, modules,
        testFunctions: functions.filter(f => f.isTest),
        evidenceLevel: 'syntax_checked', parsedAt: new Date().toISOString(),
    };
}

// ─── Context Lookup ─────────────────────────────────────────────

export function findFunctionContext(ast: RustAstLite, line: number): FunctionContext {
    let bestFunc: RustFunction | null = null;
    let bestImpl: RustImplBlock | null = null;
    let bestMod: RustModuleDef | null = null;

    for (const func of ast.functions) {
        if (func.line <= line && line <= func.endLine) {
            if (!bestFunc || func.line > bestFunc.line) bestFunc = func;
        }
    }
    for (const impl of ast.implBlocks) {
        if (impl.line <= line && line <= impl.endLine) {
            if (!bestImpl || impl.line > bestImpl.line) bestImpl = impl;
        }
    }
    for (const m of ast.modules) {
        if (m.line <= line) { if (!bestMod || m.line > bestMod.line) bestMod = m; }
    }

    const isTestContext = (bestFunc?.isTest ?? false) || (bestMod?.isTestModule ?? false);
    const isProductionContext = !isTestContext && ((bestFunc?.isPublic ?? false) || bestFunc !== null);

    return { function: bestFunc, implBlock: bestImpl, module: bestMod, isTestContext, isProductionContext };
}

// ─── Batch Parser ───────────────────────────────────────────────

export function parseRustAstLiteBatch(contentArtifacts: ContentArtifact[]): RustAstLiteResult {
    const allFns: RustFunction[] = []; const allImpls: RustImplBlock[] = [];
    const allStructs: RustStructDef[] = []; const allEnums: RustEnumDef[] = [];
    const allUses: RustUseStatement[] = []; const allMods: RustModuleDef[] = [];
    const allTests: RustFunction[] = [];
    let filesParsed = 0; let filesWithSymbols = 0;

    for (const a of contentArtifacts) {
        if (!a.path.endsWith('.rs')) continue;
        filesParsed++;
        const ast = parseRustAstLite(a.text, a.path);
        allFns.push(...ast.functions); allImpls.push(...ast.implBlocks);
        allStructs.push(...ast.structs); allEnums.push(...ast.enums);
        allUses.push(...ast.useStatements); allMods.push(...ast.modules);
        allTests.push(...ast.testFunctions);
        if (ast.functions.length > 0) filesWithSymbols++;
    }

    return {
        ast: {
            functions: allFns, implBlocks: allImpls, structs: allStructs, enums: allEnums,
            useStatements: allUses, modules: allMods, testFunctions: allTests,
            evidenceLevel: 'syntax_checked', parsedAt: new Date().toISOString(),
        },
        filesParsed, filesWithSymbols,
    };
}