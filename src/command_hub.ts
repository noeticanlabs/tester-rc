// CohBit-Copilot v14.2 — Command Hub
// Interactive menu for new users. Routes to existing commands.
//
// Operating law:
//   The command hub presents safe, guided options. It may not auto-execute
//   apply/receipt commands without gate checks.

export function renderCommandHub(): string {
    return [
        '═══════════════════════════════════════════════════',
        '  CohBit-Copilot — Command Hub',
        '═══════════════════════════════════════════════════',
        '',
        '  Choose an option:',
        '',
        '  1  Audit this repo          (scan and report)',
        '  2  View dashboard            (obligation health)',
        '  3  Teach me the basics       (interactive teaching)',
        '  4  Show memory stability     (cross-run checks)',
        '  5  Review obligations        (open findings)',
        '  6  Explain trust kernels     (Rust verification)',
        '  7  System overview           (full explanation)',
        '  8  Access control            (view permissions)',
        '  9  Exit',
        '',
        '  Tip: Run cohbit-copilot demo starter for a guided tour.',
        '',
        '═══════════════════════════════════════════════════',
    ].join('\n');
}

/**
 * Route a hub selection (1-9) to the appropriate command string.
 * Returns null for 'exit' (9).
 */
export function routeHubSelection(selection: number): string | null {
    switch (selection) {
        case 1: return 'audit .';
        case 2: return 'dashboard';
        case 3: return 'teach "proposal vs authority"';
        case 4: return 'memory stability';
        case 5: return 'obligations';
        case 6: return 'trust-kernels --report';
        case 7: return 'system explain';
        case 8: return 'access show';
        case 9: return null;
        default: return null;
    }
}

/**
 * Name mapping for hub selections.
 */
export function routeHubName(selection: number): string {
    switch (selection) {
        case 1: return 'Audit this repo';
        case 2: return 'View dashboard';
        case 3: return 'Teach me the basics';
        case 4: return 'Show memory stability';
        case 5: return 'Review obligations';
        case 6: return 'Explain trust kernels';
        case 7: return 'System overview';
        case 8: return 'Access control';
        case 9: return 'Exit';
        default: return 'Unknown';
    }
}