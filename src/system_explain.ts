// CohBit-Copilot v14.2 — System Explanation Mode
// Provides plain-language system overview for new users.
//
// Operating law:
//   System explanation may describe what the tool does and does not do.
//   It may not overclaim capabilities, guarantee safety, or promise correctness.

export function formatSystemExplain(): string {
    const lines: string[] = [];

    lines.push('═══════════════════════════════════════════════════');
    lines.push('  CohBit-Copilot — System Overview');
    lines.push('═══════════════════════════════════════════════════');
    lines.push('');
    lines.push('1. WHAT THIS TOOL IS');
    lines.push('');
    lines.push('  CohBit-Copilot is a local governed development and teaching copilot');
    lines.push('  for code-change judgment. It is NOT an LLM agent, NOT a code generator,');
    lines.push('  NOT a replacement developer. It helps you inspect, review, and govern');
    lines.push('  code changes with evidence, receipts, and memory.');
    lines.push('');
    lines.push('2. WHAT IT CAN INSPECT');
    lines.push('');
    lines.push('  • Source code files (Rust, TypeScript, Python, Lean, Markdown)');
    lines.push('  • Project structure and dependencies');
    lines.push('  • Security risk patterns (CWE-mapped)');
    lines.push('  • Environment and workspace state');
    lines.push('  • Test results and coverage');
    lines.push('  • Memory stability across runs');
    lines.push('  • Curriculum and doctrine alignment');
    lines.push('');
    lines.push('3. WHAT IT CAN PROPOSE');
    lines.push('');
    lines.push('  • Audit findings (review signals, NOT verified defects)');
    lines.push('  • Patch proposals (human-reviewed before application)');
    lines.push('  • Test recommendations');
    lines.push('  • Teaching explanations');
    lines.push('  • Learning candidates (advisory, not auto-admitted)');
    lines.push('');
    lines.push('4. WHAT IT REFUSES TO DO');
    lines.push('');
    lines.push('  • Auto-apply patches without human review');
    lines.push('  • Self-authorize proposals');
    lines.push('  • Upgrade evidence without verification receipts');
    lines.push('  • Claim verification without independent evidence');
    lines.push('  • Close obligations via learning alone');
    lines.push('  • Promote canon without human admission');
    lines.push('  • Mutate Teaching KB without proposals');
    lines.push('');
    lines.push('5. WHAT EVIDENCE MEANS');
    lines.push('');
    lines.push('  surface_detected   — Pattern matched; not confirmed.');
    lines.push('  corpus_extracted   — Pattern observed in structured data.');
    lines.push('  cross_run_stable   — Same pattern seen across ≥ 2 runs.');
    lines.push('  verified           — Independent verification (Rust kernel / Lean proof).');
    lines.push('');
    lines.push('  Most copilot output is surface_detected. "Verified" requires a receipt.');
    lines.push('');
    lines.push('6. WHAT GETS STORED LOCALLY');
    lines.push('');
    lines.push('  • .cohbit/config.json        — Your access profile and settings');
    lines.push('  • .cohbit/gates/              — Gate records (proposals, reviews, receipts)');
    lines.push('  • .cohbit/atlas/              — Atlas memory (learning records, lessons)');
    lines.push('  • reports/                    — Audit reports, curriculum reviews');
    lines.push('');
    lines.push('  Nothing is sent to remote servers. Everything stays on your machine.');
    lines.push('');
    lines.push('7. WHAT REQUIRES HUMAN APPROVAL');
    lines.push('');
    lines.push('  • Patch application (governed gate: review → authorize → apply → test → receipt)');
    lines.push('  • Learning record admission');
    lines.push('  • Teaching KB updates');
    lines.push('  • Canon promotion');
    lines.push('  • Obligation closure');
    lines.push('');
    lines.push('8. TWO EXECUTION PATHS');
    lines.push('');
    lines.push('  PATH A — Governed Patch');
    lines.push('    propose → review → authorize → apply → test → receipt');
    lines.push('    Each step is a gate. None are auto-passed.');
    lines.push('');
    lines.push('  PATH B — Integrated Audit');
    lines.push('    scan → find → triage → obligation → report');
    lines.push('    Audit observes and reports. It does NOT mutate code.');
    lines.push('');
    lines.push('9. CROSS-CUTTING SYSTEMS');
    lines.push('');
    lines.push('  • Rust Trust Kernels — Verify receipts, path safety, scanner evidence');
    lines.push('  • Atlas Memory — Persistent learning records, canonical patterns');
    lines.push('  • Teaching Mode — Explain concepts, quiz, curriculum navigation');
    lines.push('  • Resource Governance — Budget, throttle, rate limit enforcement');
    lines.push('');
    lines.push('10. COMMANDS TO TRY FIRST');
    lines.push('');
    lines.push('  cohbit-copilot init                  — Set up your local config');
    lines.push('  cohbit-copilot start                 — Interactive command hub');
    lines.push('  cohbit-copilot system explain        — This overview');
    lines.push('  cohbit-copilot access show           — See your permissions');
    lines.push('  cohbit-copilot demo starter          — Run a safe starter demo');
    lines.push('  cohbit-copilot audit .               — Audit your current directory');
    lines.push('  cohbit-copilot teach "proposal vs authority"  — Learn a concept');
    lines.push('  cohbit-copilot memory stability     — Check system memory health');
    lines.push('');
    lines.push('═══════════════════════════════════════════════════');

    return lines.join('\n');
}

/**
 * Shorter version for "about" command.
 */
export function formatAbout(): string {
    return [
        'CohBit-Copilot v14.2',
        '',
        'A local governed development and teaching copilot for code-change judgment.',
        '',
        'Core principle: observe → classify → gate → receipt → remember → compare → teach.',
        '',
        'Type cohbit-copilot system explain for full overview.',
    ].join('\n');
}