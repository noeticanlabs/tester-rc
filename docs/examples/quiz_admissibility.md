# Example: `cohbit-copilot quiz "proposal vs authority"`

This example shows a quiz output — a reflection question with a hint and the key doctrinal concept.

## Command

```bash
npx tsx src/cli.ts quiz "proposal vs authority"
```

## Output

```
═══════════════════════════════════════════
  CohBit-Copilot Quiz
═══════════════════════════════════════════

  Topic: proposal vs authority

  If the scanner flags a pattern with 95% confidence, should the
  copilot auto-apply the fix? Why or why not?

  Hint: Think about: A proposal is a request...

  (Reflect on your answer, then compare with the concept below.)

  Key concept: A proposal is a request to act. Authority is the
  permission to act. They are separate gates.

═══════════════════════════════════════════
```

## What This Teaches

- The quiz does **not** grade the answer — it invites reflection
- The hint is derived from the doctrine itself
- The learner must connect the concept to a concrete scenario
- The key concept is revealed after the learner has had time to think

## Available Quiz Topics

All 8 teaching topics support quizzes:
- `proposal vs authority`
- `detection is not repair authority`
- `surface detected vs verified`
- `obligation vs defect`
- `why summaries cannot upgrade evidence`
- `why receipts matter`
- `why unsafe findings are refused`
- `why tests increase confidence`