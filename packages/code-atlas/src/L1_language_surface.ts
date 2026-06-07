// @cohbit/code-atlas — L1 Language Surface Layer
// Identifies the visible language-specific form of code.
//
// Spec source: Noetican Code Invariant Atlas v0.2 §B
// Governing law:
//   Surface syntax is never treated as correctness.
//   It is only a clue that a deeper invariant may be present.

// ─── Types ─────────────────────────────────────────────────────

/** A language profile describing what each language can naturally express. */
export interface LanguageProfile {
    languageId: string;
    name: string;
    atlasRole: string;
    nativeStrengths: string[];
    nativeRisks: string[];
    preferredFailureEncoding: string[];
    defaultVerifierRoutes: string[];
}

/** A surface pattern: visible syntax mapped to a candidate invariant. */
export interface SurfacePattern {
    surfaceId: string;
    language: string;
    surfacePattern: string;
    mapsToInvariant: string;
    notes: string;
}

// ─── Language Registry ─────────────────────────────────────────

export const LANG_PYTHON: LanguageProfile = {
    languageId: 'LANG_PYTHON',
    name: 'Python',
    atlasRole: 'readable_logic_scripting',
    nativeStrengths: [
        'indentation_blocks',
        'dynamic_typing',
        'exceptions',
        'None_failure_encoding',
        'duck_typing',
    ],
    nativeRisks: [
        'silent_None_return',
        'uncaught_exception',
        'type_confusion_at_runtime',
        'mutable_default_args',
    ],
    preferredFailureEncoding: ['None', 'Exception', 'Optional[Value]'],
    defaultVerifierRoutes: ['pytest', 'mypy', 'ruff', 'bandit'],
};

export const LANG_TYPESCRIPT: LanguageProfile = {
    languageId: 'LANG_TYPESCRIPT',
    name: 'TypeScript',
    atlasRole: 'tool_layer_interface',
    nativeStrengths: [
        'structural_typing',
        'union_types',
        'async_await',
        'interfaces',
        'discriminated_unions',
    ],
    nativeRisks: [
        'null_or_undefined_risk',
        'any_type_escape',
        'runtime_type_narrowing_gaps',
        'async_unhandled_rejection',
    ],
    preferredFailureEncoding: ['Result<T,E>', 'number | null', 'discriminated union'],
    defaultVerifierRoutes: ['tsc --noEmit', 'vitest', 'eslint', 'prettier'],
};

export const LANG_RUST: LanguageProfile = {
    languageId: 'LANG_RUST',
    name: 'Rust',
    atlasRole: 'safe_systems',
    nativeStrengths: [
        'ownership',
        'borrowing',
        'lifetimes',
        'Option',
        'Result',
        'pattern_matching',
    ],
    nativeRisks: [
        'panic_on_unwrap',
        'unsafe_blocks',
        'lifetime_complexity',
        'float_edge_cases',
    ],
    preferredFailureEncoding: ['Option<T>', 'Result<T,E>'],
    defaultVerifierRoutes: ['cargo check', 'cargo test', 'clippy', 'miri_optional'],
};

export const LANG_C: LanguageProfile = {
    languageId: 'LANG_C',
    name: 'C',
    atlasRole: 'unsafe_systems_low_level',
    nativeStrengths: [
        'pointers',
        'manual_memory',
        'return_codes',
        'headers',
        'explicit_output_parameters',
    ],
    nativeRisks: [
        'null_pointer_dereference',
        'buffer_overflow',
        'use_after_free',
        'double_free',
        'undefined_behavior',
    ],
    preferredFailureEncoding: ['return_code', 'bool + output_pointer', 'errno'],
    defaultVerifierRoutes: ['gcc -Wall -Wextra', 'valgrind', 'cppcheck', 'asan'],
};

export const LANG_LEAN: LanguageProfile = {
    languageId: 'LANG_LEAN',
    name: 'Lean',
    atlasRole: 'formal_verification',
    nativeStrengths: [
        'definitions',
        'theorems',
        'proof_obligations',
        'dependent_types',
        'tactics',
    ],
    nativeRisks: [
        'sorry_placeholder',
        'unproven_assumption',
        'incomplete_specification',
        'axiom_misuse',
    ],
    preferredFailureEncoding: ['Option α', 'proof obligation', '¬ (negation)'],
    defaultVerifierRoutes: ['lean --check', 'lake build', 'lean proof_watch'],
};

/** All supported v0.2 languages. */
export const LANGUAGE_REGISTRY: Map<string, LanguageProfile> = new Map([
    [LANG_PYTHON.languageId, LANG_PYTHON],
    [LANG_TYPESCRIPT.languageId, LANG_TYPESCRIPT],
    [LANG_RUST.languageId, LANG_RUST],
    [LANG_C.languageId, LANG_C],
    [LANG_LEAN.languageId, LANG_LEAN],
]);

/** Retrieve a language profile by ID. */
export function getLanguage(languageId: string): LanguageProfile | undefined {
    return LANGUAGE_REGISTRY.get(languageId);
}

/** List all registered language IDs. */
export function listLanguages(): string[] {
    return [...LANGUAGE_REGISTRY.keys()];
}

// ─── Surface Pattern Registry ──────────────────────────────────

export const SURFACE_PATTERNS: SurfacePattern[] = [
    {
        surfaceId: 'SURF_IF_PY',
        language: 'python',
        surfacePattern: 'if condition:',
        mapsToInvariant: 'INV_006',
        notes: 'Python branch structure is indentation-governed.',
    },
    {
        surfaceId: 'SURF_IF_TS',
        language: 'typescript',
        surfacePattern: 'if (condition) { ... }',
        mapsToInvariant: 'INV_006',
        notes: 'TypeScript branch structure is brace-governed.',
    },
    {
        surfaceId: 'SURF_IF_RUST',
        language: 'rust',
        surfacePattern: 'if condition { ... } else { ... }',
        mapsToInvariant: 'INV_006',
        notes: 'Rust if can be expression-valued.',
    },
    {
        surfaceId: 'SURF_IF_C',
        language: 'c',
        surfacePattern: 'if (condition) { ... }',
        mapsToInvariant: 'INV_006',
        notes: 'C branch may interact with pointers and return codes.',
    },
    {
        surfaceId: 'SURF_IF_LEAN',
        language: 'lean',
        surfacePattern: 'if h : condition then ... else ...',
        mapsToInvariant: 'INV_006',
        notes: 'Lean branch may carry proof witness h.',
    },
    {
        surfaceId: 'SURF_RETURN_PY',
        language: 'python',
        surfacePattern: 'return value',
        mapsToInvariant: 'INV_008',
        notes: 'Python return may emit None implicitly.',
    },
    {
        surfaceId: 'SURF_RETURN_RUST',
        language: 'rust',
        surfacePattern: '-> ReturnType',
        mapsToInvariant: 'INV_008',
        notes: 'Rust return type is explicit in signature.',
    },
    {
        surfaceId: 'SURF_MATCH_RUST',
        language: 'rust',
        surfacePattern: 'match value { ... }',
        mapsToInvariant: 'INV_006',
        notes: 'Rust match can be exhaustive over patterns.',
    },
    {
        surfaceId: 'SURF_ERROR_TS',
        language: 'typescript',
        surfacePattern: 'try { ... } catch (error) { ... }',
        mapsToInvariant: 'INV_009',
        notes: 'TypeScript try/catch handles thrown exceptions.',
    },
    {
        surfaceId: 'SURF_ERROR_PY',
        language: 'python',
        surfacePattern: 'try:\n    ...\nexcept Exception as e:\n    ...',
        mapsToInvariant: 'INV_009',
        notes: 'Python exception handling with typed except clauses.',
    },
];

/** Get surface patterns for a specific language. */
export function getSurfacePatternsForLanguage(language: string): SurfacePattern[] {
    return SURFACE_PATTERNS.filter(p => p.language === language);
}

/** Get surface patterns that map to a given invariant. */
export function getSurfacePatternsForInvariant(invariantId: string): SurfacePattern[] {
    return SURFACE_PATTERNS.filter(p => p.mapsToInvariant === invariantId);
}