# Example: `cohbit-copilot explain-finding <id>`

This example shows what `explain-finding` outputs and why the distinction between signal and defect matters.

## Command

```bash
npx tsx src/cli.ts explain-finding FND-0001
```

## Output

```
═══════════════════════════════════════════
  CohBit-Copilot Finding Explanation
═══════════════════════════════════════════

  Finding: FND-0001

  ⚠ Finding explanations reference audit state.
  Run "cohbit-copilot audit ." to populate findings,
  then use "cohbit-copilot obligations" to list them.

  Key distinction:
    A finding is a surface-detected pattern — not a verified defect.
    Signal ≠ defect. Detection ≠ repair authority.

  To learn more:
    cohbit-copilot teach "detection is not repair authority"
    cohbit-copilot teach "surface detected vs verified"

═══════════════════════════════════════════
```

## What This Teaches

- Findings are **signals**, not confirmed defects
- Run `audit` first to populate findings
- Use `obligations` to list and triage them
- Detection ≠ permission to fix
- Related topics: "detection is not repair authority", "surface detected vs verified"

## Key Boundary

A scanner finding is never proof of a bug. It is always `surface_detected` evidence until reviewed, triaged, and receipted. The copilot will not auto-apply patches based on findings.