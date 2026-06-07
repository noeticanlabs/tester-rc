// @cohbit/tooling — T Content Reader (v3.0)
// Safe, budgeted content ingestion layer.
// Reads text file contents with binary rejection, size limits,
// encoding detection, and content hashing.
//
// Operating law:
//   Content reading is observation, not mutation.
//   Binary detection is heuristic, not certification.
//   Budget enforcement is mandatory — no unbounded reads.

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ─── Types ─────────────────────────────────────────────────────

export type ContentReadStatus =
    | 'read'
    | 'skipped_binary'
    | 'skipped_large'
    | 'decode_error'
    | 'missing';

export interface ContentArtifact {
    path: string;
    extension: string;
    language: string;
    contentHash: string;
    bytes: number;
    text: string;
    readStatus: ContentReadStatus;
}

export interface ContentReaderBudget {
    maxFileBytes: number;
    maxTotalBytes: number;
    maxFiles: number;
}

export interface ContentReadResult {
    artifacts: ContentArtifact[];
    skippedBinary: string[];
    skippedLarge: string[];
    decodeErrors: string[];
    missingFiles: string[];
    budget: ContentReaderBudget;
    budgetUsed: { filesRead: number; totalBytes: number };
    readAt: string;
}

// ─── Constants ─────────────────────────────────────────────────

/** Extensions known to be binary — these files are rejected by default. */
const BINARY_EXTENSIONS = new Set([
    '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.wasm',
    '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
    '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.ttf', '.otf', '.woff', '.woff2',
    '.o', '.obj', '.class', '.pyc', '.pyo', '.lock',
]);

/** Text file extensions eligible for content reading. */
const TEXT_EXTENSIONS = new Set([
    '.rs', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
    '.py', '.lean', '.thy',
    '.md', '.txt', '.rst', '.adoc',
    '.json', '.yaml', '.yml', '.toml', '.cfg', '.ini', '.env',
    '.go', '.cs', '.java', '.cpp', '.c', '.h', '.hpp',
    '.kt', '.swift', '.scala',
    '.html', '.css', '.scss', '.less',
    '.sh', '.bash', '.ps1', '.bat',
    '.xml', '.svg',
]);

const DEFAULT_BUDGET: ContentReaderBudget = {
    maxFileBytes: 2 * 1024 * 1024,  // 2 MB per file
    maxTotalBytes: 50 * 1024 * 1024, // 50 MB aggregate
    maxFiles: 500,
};

// ─── Helpers ───────────────────────────────────────────────────

function hashContent(content: string): string {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

function extensionLanguage(ext: string): string {
    const map: Record<string, string> = {
        '.rs': 'rust', '.ts': 'typescript', '.tsx': 'typescript',
        '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript',
        '.py': 'python', '.lean': 'lean', '.thy': 'isabelle',
        '.md': 'markdown', '.txt': 'text', '.rst': 'restructuredtext',
        '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
        '.go': 'go', '.cs': 'csharp', '.java': 'java',
        '.cpp': 'cpp', '.c': 'c', '.h': 'c', '.hpp': 'cpp',
        '.kt': 'kotlin', '.swift': 'swift',
        '.sh': 'shell', '.bash': 'shell', '.bat': 'batch',
        '.html': 'html', '.css': 'css', '.scss': 'scss',
        '.xml': 'xml', '.svg': 'svg',
        '.cfg': 'config', '.ini': 'config', '.env': 'config',
    };
    return map[ext] ?? 'unknown';
}

function isBinaryExtension(ext: string): boolean {
    return BINARY_EXTENSIONS.has(ext.toLowerCase());
}

function isTextExtension(ext: string): boolean {
    return TEXT_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Detect binary content by sampling the first 4096 bytes.
 * Returns true if the content appears binary (contains null bytes
 * or has a high ratio of non-printable characters).
 */
function detectBinaryContent(buffer: Buffer): boolean {
    const sample = buffer.subarray(0, Math.min(buffer.length, 4096));

    // Null bytes strongly indicate binary
    if (sample.includes(0)) return true;

    // Check ratio of non-printable characters
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
        const byte = sample[i]!;
        // Allow: tab(9), newline(10), carriage return(13), printable ASCII 32-126
        // Also allow high bytes for UTF-8 multi-byte sequences
        if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) {
            nonPrintable++;
        }
    }

    // If more than 30% of the sample is non-printable control chars, treat as binary
    return sample.length > 0 && (nonPrintable / sample.length) > 0.30;
}

// ─── Content Reader ────────────────────────────────────────────

let readCounter = 0;

/**
 * Read file contents with budget enforcement and binary rejection.
 *
 * @param filePaths - List of relative file paths to read
 * @param budget - Optional budget override (defaults to 2MB/file, 50MB total, 500 files)
 * @returns ContentReadResult with artifacts and skip records
 */
export function readContentFiles(
    filePaths: string[],
    budget?: Partial<ContentReaderBudget>,
): ContentReadResult {
    readCounter += 1;

    const effectiveBudget: ContentReaderBudget = {
        ...DEFAULT_BUDGET,
        ...budget,
    };

    const artifacts: ContentArtifact[] = [];
    const skippedBinary: string[] = [];
    const skippedLarge: string[] = [];
    const decodeErrors: string[] = [];
    const missingFiles: string[] = [];

    let totalBytes = 0;
    let filesRead = 0;

    for (const filePath of filePaths) {
        // Budget gate: max files
        if (filesRead >= effectiveBudget.maxFiles) break;

        const ext = path.extname(filePath).toLowerCase();

        // Binary rejection by extension
        if (!isTextExtension(ext) || isBinaryExtension(ext)) {
            skippedBinary.push(filePath);
            continue;
        }

        const absolutePath = path.resolve(filePath);

        // Check file exists and get size
        let stat: fs.Stats;
        try {
            stat = fs.statSync(absolutePath);
        } catch {
            missingFiles.push(filePath);
            continue;
        }

        if (!stat.isFile()) {
            missingFiles.push(filePath);
            continue;
        }

        // Reject large files
        if (stat.size > effectiveBudget.maxFileBytes) {
            skippedLarge.push(filePath);
            continue;
        }

        // Aggregate budget gate
        if (totalBytes + stat.size > effectiveBudget.maxTotalBytes) {
            // Still count as skipped_large for reporting clarity
            skippedLarge.push(filePath);
            continue;
        }

        // Read file as buffer first for binary detection
        let buffer: Buffer;
        try {
            buffer = fs.readFileSync(absolutePath);
        } catch {
            decodeErrors.push(filePath);
            continue;
        }

        // Content-level binary detection
        if (detectBinaryContent(buffer)) {
            skippedBinary.push(filePath);
            continue;
        }

        // Decode to UTF-8
        let text: string;
        try {
            text = buffer.toString('utf-8');
        } catch {
            decodeErrors.push(filePath);
            continue;
        }

        // Validate decode didn't produce garbage (replacement chars are ok for real UTF-8 errors)
        // But null bytes in decoded text shouldn't happen for valid text
        if (text.includes('\x00')) {
            skippedBinary.push(filePath);
            continue;
        }

        const contentHash = hashContent(text);
        const bytes = buffer.length;

        artifacts.push({
            path: filePath,
            extension: ext,
            language: extensionLanguage(ext),
            contentHash,
            bytes,
            text,
            readStatus: 'read',
        });

        totalBytes += bytes;
        filesRead++;
    }

    return {
        artifacts,
        skippedBinary,
        skippedLarge,
        decodeErrors,
        missingFiles,
        budget: effectiveBudget,
        budgetUsed: { filesRead, totalBytes },
        readAt: new Date().toISOString(),
    };
}

/**
 * Convenience: read only Rust source files.
 */
export function readRustFiles(filePaths: string[], budget?: Partial<ContentReaderBudget>): ContentReadResult {
    const rustFiles = filePaths.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.rs';
    });
    return readContentFiles(rustFiles, budget);
}

/**
 * Convenience: read only Lean proof files.
 */
export function readLeanFiles(filePaths: string[], budget?: Partial<ContentReaderBudget>): ContentReadResult {
    const leanFiles = filePaths.filter(f => {
        const ext = path.extname(f).toLowerCase();
        return ext === '.lean';
    });
    return readContentFiles(leanFiles, budget);
}