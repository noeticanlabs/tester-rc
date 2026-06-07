# Example: `cohbit-copilot teach "proposal vs authority"`

This example shows a full internal teaching response for the topic "proposal vs authority" — one of the most fundamental governance concepts in the CohBit-Copilot workflow.

## Command

```bash
npx tsx src/cli.ts teach "proposal vs authority"
```

## Output (Annotated)

```
═══════════════════════════════════════════
  CohBit-Copilot Teaching Mode
═══════════════════════════════════════════

── 1. Doctrine / Concept ──
  A proposal is a request to act. Authority is the permission to act.
  They are separate gates.
```
*This is the core doctrine. Concise, precise, no overclaim.*

```
── 2. Plain-Language Explanation ──
  When the copilot finds something to fix, it makes a proposal — a
  suggestion. But it cannot act on that suggestion until a human
  reviews and authorizes it. Detection is not permission.
```
*Translates the doctrine into something anyone can understand.*

```
── 3. Workflow Example ──
  scan → finding → triage → obligation → review → proposal eligibility
  → propose → review → authorize → apply → test → receipt
```
*Shows the full pipeline. Proposal and authority are separate stages
(review → authorize).*

```
── 4. Evidence Boundary ──
  A proposal is formed from surface_detected evidence. It becomes
  authorized only after human review. No amount of scanner confidence
  grants self-authorization.
```
*Clearly states what the evidence level is and what it is not.*

```
── 5. Common Mistake ──
  Treating a scanner warning as an automatic fix request. The scanner
  detects patterns, not bugs. A finding must survive triage, obligation,
  and review before becoming actionable.
```
*Addresses the most common misunderstanding head-on.*

```
── 6. Why Refused / Allowed ──
  The copilot refuses to auto-apply because proposal and authority are
  separate gates. A post-hoc verifier protects the commit boundary; a
  Coh primitive protects the proposal boundary.
```
*Explains the governance rationale in framework terms.*

```
── 7. Reflection Question ──
  If the scanner flags a pattern with 95% confidence, should the
  copilot auto-apply the fix? Why or why not?
```
*Forces the learner to apply the concept themselves.*

```
── Sources ──
  Audience: internal
  Evidence ceiling: corpus_extracted
  Limitations included: yes
  Canon safety: passed
  Generated: 2026-06-03T15:18:02.515Z
```
*Source metadata block. Shows evidence ceiling, limitations status,
and canon safety — all required.*

## What This Teaches

- **Proposal ≠ authority**: A request to act and permission to act are separate gates
- **Detection ≠ permission**: Finding a pattern does not grant self-authorization
- **Pipeline discipline**: Every action flows through governed gates
- **Evidence awareness**: Proposals are formed from surface_detected evidence, not certified facts

## Key Takeaway

The copilot can detect patterns, suggest changes, and propose actions. It cannot and will not apply changes without human review and authorization. The gates enforce this separation.