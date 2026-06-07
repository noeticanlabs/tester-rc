# Example: `cohbit-copilot explain-obligation <id>`

This example shows what `explain-obligation` outputs and why obligations are not the same as confirmed defects.

## Command

```bash
npx tsx src/cli.ts explain-obligation OBL-0001
```

## Output

```
═══════════════════════════════════════════
  CohBit-Copilot Obligation Explanation
═══════════════════════════════════════════

  Obligation: OBL-0001

  ⚠ Obligation explanations reference audit state.
  Run "cohbit-copilot audit ." to populate obligations,
  then use "cohbit-copilot obligations" to list them.

  Key distinction:
    An obligation is a recognized responsibility to investigate —
    not a confirmed defect.
    Obligations are managed, not auto-executed.

  To learn more:
    cohbit-copilot teach "obligation vs defect"
    cohbit-copilot teach "why receipts matter"

═══════════════════════════════════════════
```

## What This Teaches

- Obligations are **responsibilities to investigate**, not confirmed bugs
- Creating an obligation does not upgrade evidence from `surface_detected` to verified
- Obligations must be triaged and reviewed before becoming actionable proposals
- Related topics: "obligation vs defect", "why receipts matter"

## Key Boundary

An obligation is a task ticket — it means "someone should look at this." Only after investigation, testing, and human review can you confirm whether it represents an actual defect. The copilot creates obligations but does not close them.