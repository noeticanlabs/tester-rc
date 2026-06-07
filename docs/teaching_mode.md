# Teaching Mode (v10.0+)

CohBit-Copilot Teaching Mode is a CLI-based learning layer that explains governed coding concepts from the TAP/CohBit corpus. It teaches developers how to interpret findings, obligations, proposal boundaries, evidence levels, refusal logic, receipts, and safe next steps — without authorizing mutation, promoting evidence, or converting output into canon.

**Product identity:** CohBit-Copilot is a local deterministic teaching copilot for governed code changes.

**Wedge:** Learn coding by governing real code changes.

## Commands

| Command | Purpose |
|---------|---------|
| `cohbit-copilot teach "<topic>"` | Explain a governance concept using the 7-section teaching template |
| `cohbit-copilot teach "<topic>" --public` | Public-safe mode (internal terms rewritten, claims downgraded) |
| `cohbit-copilot teach "<topic>" --linkedin` | LinkedIn-safe mode (no internal terms, humble tone, peer-inviting posture) |
| `cohbit-copilot explain-finding <id>` | Explain an audit finding — distinguishes signal from defect |
| `cohbit-copilot explain-obligation <id>` | Explain a repair obligation — distinguishes obligation from confirmed bug |
| `cohbit-copilot lesson list` | List persisted operational lessons |
| `cohbit-copilot lesson list --spend critical` | Filter lessons by severity |
| `cohbit-copilot lesson audit` | Severity breakdown of persisted lessons |
| `cohbit-copilot quiz "topic"` | Generate a reflection question with hint and answer concept |

## The 7-Section Teaching Template

Every teaching response includes:

| # | Section | Purpose |
|---|---------|---------|
| 1 | **Doctrine / Concept** | What the discipline says |
| 2 | **Plain-Language Explanation** | Accessible paraphrase |
| 3 | **Workflow Example** | Concrete pipeline steps |
| 4 | **Evidence Boundary** | What is certain vs. surface_detected |
| 5 | **Common Mistake** | What people get wrong |
| 6 | **Why Refused / Allowed** | Copilot governance rationale |
| 7 | **Reflection Question** | Mini quiz for the learner |

Each response also includes a **Sources** block with:
- Audience mode
- Evidence ceiling
- Limitations included (yes/no)
- Canon safety status

## Available Topics

| Topic | Core Lesson |
|-------|-------------|
| `proposal vs authority` | A proposal is a request to act. Authority is the permission to act. |
| `detection is not repair authority` | Finding a risk pattern does not grant permission to fix it. |
| `surface detected vs verified` | Evidence exists on a ladder. Most output is surface_detected. |
| `obligation vs defect` | An obligation is a responsibility to investigate — not a confirmed defect. |
| `why summaries cannot upgrade evidence` | Voice may explain graph state. Voice may not upgrade graph state. |
| `why receipts matter` | A decision without a receipt is incomplete. |
| `why unsafe findings are refused` | Refusal is a governance feature, not a failure. |
| `why tests increase confidence` | Tests reduce uncertainty; they do not eliminate it. |

## Audience Modes

| Mode | Internal terms | Claim strength | Limitations | Use case |
|------|---------------|----------------|-------------|----------|
| `--internal` (default) | Allowed | Flagged | Optional | Learning within project context |
| `--public` | Rewritten | Downgraded | Included | Blog posts, external docs |
| `--linkedin` | Removed | Strongly downgraded | Included | Social media, public outreach |

## Operating Law

Teaching Mode may explain, contextualize, quiz, and guide. It may **not**:

- Promote graph status or evidence levels
- Certify understanding
- Authorize repair, apply patches, or close obligations
- Convert teaching output into canon

## Evidence Boundary

All teaching output carries an evidence ceiling derived from the knowledge base. The evidence levels used are:

| Level | Meaning |
|-------|---------|
| `corpus_extracted` | Extracted from the TAP/CohBit corpus — authoritative for the framework but not formally verified |
| `surface_detected` | Pattern-matched from source text — advisory only |

Teaching output never claims `receipt_available`, `ctrl_verified`, or `release_approved` without a verifier receipt.

## Limitations

- Teaching Mode uses a pre-built knowledge base of 8 core topics. It does not dynamically generate lessons from arbitrary concepts.
- `explain-finding` and `explain-obligation` provide conceptual explanations with pointers to audit state. They do not currently display live finding/obligation data (that requires an active audit run).
- The TAP corpus fallback (for unrecognized topics) is path-dependent and requires the corpus directory to be present.
- All teaching output is advisory. No teaching response constitutes a certified fact about the codebase.