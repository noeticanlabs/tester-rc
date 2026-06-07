// @cohbit/tooling — Repo Test Map (v3.5)
// Maps source files to their likely test files using naming conventions.
// Heuristic, not symbol-level.

export interface SourceTestMapping {
    sourceFile: string;
    testFiles: string[];
    testCount: number;
}

function inferTestFiles(sourceFile: string, allTestFiles: string[]): string[] {
    const nf = sourceFile.replace(/\\/g, '/');
    const baseName = nf.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
    const dirName = nf.replace(/[\\/][^\\/]+$/, '').replace(/^src[\\/]?/, '');

    const candidates: string[] = [];
    for (const tf of allTestFiles) {
        const nt = tf.replace(/\\/g, '/');
        // Pattern: tests/foo_test.rs, tests/foo.test.ts
        if (nt.includes(baseName) && (nt.includes('_test.') || nt.includes('.test.'))) {
            candidates.push(tf);
        }
        // Pattern: tests/module/ containing source's directory
        if (dirName && nt.includes(dirName.replace(/\\/g, '/'))) {
            candidates.push(tf);
        }
        // Pattern: __tests__/foo.test.ts
        if (nt.includes('__tests__') && nt.includes(baseName)) {
            candidates.push(tf);
        }
    }
    return [...new Set(candidates)];
}

export function buildSourceTestMap(sources: string[], allTestFiles: string[]): SourceTestMapping[] {
    return sources.map(sourceFile => {
        const testFiles = inferTestFiles(sourceFile, allTestFiles);
        return { sourceFile, testFiles, testCount: testFiles.length };
    });
}