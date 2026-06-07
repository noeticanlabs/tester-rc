# Sample Teaching Session — v10.1

This report captures a complete Teaching Mode session: teach, quiz, and lesson listing.

**Generated:** 2026-06-03  
**Version:** CohBit-Copilot v10.1.0

## 1. Teach: Proposal vs Authority

```bash
$ npx tsx src/cli.ts teach "proposal vs authority"
```

```
═══════════════════════════════════════════
  CohBit-Copilot Teaching Mode
═══════════════════════════════════════════

── 1. Doctrine / Concept ──
  A proposal is a request to act. Authority is the permission to act.
  They are separate gates.

── 2. Plain-Language Explanation ──
  When the copilot finds something to fix, it makes a proposal — a
  suggestion. But it cannot act on that suggestion until a human
  reviews and authorizes it. Detection is not permission.

── 3. Workflow Example ──
  scan → finding → triage → obligation → review → proposal eligibility
  → propose → review → authorize → apply → test → receipt

── 4. Evidence Boundary ──
  A proposal is formed from surface_detected evidence. It becomes
  authorized only after human review. No amount of scanner confidence
  grants self-authorization.

── 5. Common Mistake ──
  Treating a scanner warning as an automatic fix request. The scanner
  detects patterns, not bugs.

── 6. Why Refused / Allowed ──
  The copilot refuses to auto-apply because proposal and authority are
  separate gates. A post-hoc verifier protects the commit boundary; a
  Coh primitive protects the proposal boundary.

── 7. Reflection Question ──
  If the scanner flags a pattern with 95% confidence, should the
  copilot auto-apply the fix? Why or why not?

── Sources ──
  Audience: internal
  Evidence ceiling: corpus_extracted
  Limitations included: yes
  Canon safety: passed
═══════════════════════════════════════════
```

## 2. Quiz: Why Receipts Matter

```bash
$ npx tsx src/cli.ts quiz "why receipts matter"
```

```
═══════════════════════════════════════════
  CohBit-Copilot Quiz
═══════════════════════════════════════════

  Topic: why receipts matter

  Why does the copilot generate a receipt even for a rejected proposal?
  What value does a rejection receipt provide?

  Hint: Think about: A decision without a receipt...

  Key concept: A decision without a receipt is incomplete. Receipts
  capture what was decided, why, under what constraints, and at what
  cost.
═══════════════════════════════════════════
```

## 3. Public-Safe Teaching

```bash
$ npx tsx src/cli.ts teach "why summaries cannot upgrade evidence" --public
```

```
── 1. Doctrine / Concept ──
  Voice may explain graph state. Voice may not upgrade graph state.
  A summary describes what the graph contains; it cannot make the
  graph say something stronger.
```

*Public mode rewrites internal terms and downgrades strong claims.
The doctrine remains accessible while removing framework-specific
language like "CohBit" or "TLT voice."*

## 4. Lesson Memory

```bash
$ npx tsx src/cli.ts lesson list
```

```
═══ Operational Lessons ═══
  Total: 9

  LES_001 [high] Real.decidableLT regression
    Hit count: 1  |  Status: active
  LES_002 [medium] Unicode λ parse issue
    Hit count: 1  |  Status: active
  ...
  LES_008 [critical] Cascade failure ≠ local content failure
    Hit count: 1  |  Status: active
  LES_009 [medium] Tactic regression
    Hit count: 1  |  Status: active
```

## 5. Available Topics

```
── Available topics: 8 ──
    - proposal vs authority
    - detection is not repair authority
    - surface detected vs verified
    - obligation vs defect
    - why summaries cannot upgrade evidence
    - why receipts matter
    - why unsafe findings are refused
    - why tests increase confidence
```

## Verification

All outputs pass:
- ✅ 7-section template present
- ✅ Evidence boundary included
- ✅ Canon safety passes
- ✅ LinkedIn mode: zero declarative strong claim verbs
- ✅ Evidence ceiling not upgraded (`corpus_extracted`)
- ✅ 9 operational lessons available