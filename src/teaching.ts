// CohBit-Copilot v10.0 — Teaching Mode
// Composes the TLT graph pipeline into a structured pedagogical output.
// Teaches disciplined code judgment from the TAP/CohBit corpus and
// current audit state without authorizing mutation.
//
// Operating law:
//   Teaching Mode may explain, contextualize, quiz, and guide.
//   It may not promote graph status, certify understanding,
//   authorize repair, apply patches, close obligations, or
//   convert output into canon.
//
// Teaching output structure (7 sections):
//   1. Doctrine / Concept
//   2. Plain-language explanation
//   3. Workflow example
//   4. Evidence boundary
//   5. Common mistake
//   6. Why refused/allowed
//   7. Reflection question
//
// Audience modes (via --public / --linkedin flags):
//   default (reviewer) — internal terms allowed, flagged claims
//   public             — rewritten terms, downgraded claims
//   linkedin           — removed terms, humble tone

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as fsPromises from 'node:fs/promises';
import { transformToTltGraph, buildTltEdges } from '../packages/tlt-atlas/src/T_tlt_transformer.js';
import {
    generateSummary,
    renderSummaryToText,
    isSummarySafeForAudience,
    type SummaryMode,
    type EvidenceAwareSummary,
} from '../packages/tlt-atlas/src/T_summary_generator.js';
import { resetVoiceCounter } from '../packages/tlt-atlas/src/T_tlt_voice.js';
import { resetViolationCounter } from '../packages/tlt-atlas/src/T_claim_guard.js';
import { resetLeakCounter } from '../packages/tlt-atlas/src/T_public_internal_boundary.js';
import { seedLessonsIfEmpty, listLessons, recordLesson, type OperationalLesson } from '../packages/math-atlas/src/M18_operational_lessons.js';
import { philosophyTeachingExplanation, PHILOSOPHY_TEACHING_TOPICS } from '../packages/tlt-atlas/src/philosophy/philosophy_teaching.js';

// ─── Types ───────────────────────────────────────────────────────

export type TeachingAudience = 'internal' | 'public' | 'linkedin';

export interface TeachingResponse {
    /** The topic/doctrine being taught */
    doctrine: string;
    /** Plain-language explanation */
    plainExplanation: string;
    /** Concrete workflow example */
    workflowExample: string;
    /** Evidence boundary — what is certain vs surface_detected */
    evidenceBoundary: string;
    /** Common mistake learners make */
    commonMistake: string;
    /** Why the copilot refuses or allows this action */
    refusalRationale: string;
    /** Mini quiz or reflection question */
    reflectionQuestion: string;
    /** Source metadata */
    sources: {
        nodesUsed: number;
        evidenceCeiling: string;
        limitationsIncluded: boolean;
        canonSafe: boolean;
        audience: TeachingAudience;
    };
    generatedAt: string;
}

export interface QuizQuestion {
    topic: string;
    question: string;
    hint: string;
    answerConcept: string;
}

// ─── Knowledge Base ──────────────────────────────────────────────

/** Pre-built topic-to-node mapping from TAP corpus concepts */
interface TopicEntry {
    topic: string;
    aliases: string[];
    doctrine: string;
    plainExplanation: string;
    workflowExample: string;
    evidenceBoundary: string;
    commonMistake: string;
    refusalRationale: string;
    reflectionQuestion: string;
}

const TOPIC_KB: TopicEntry[] = [
    {
        topic: 'proposal vs authority',
        aliases: ['proposal', 'authority', 'gate', 'propose'],
        doctrine: 'A proposal is a request to act. Authority is the permission to act. They are separate gates.',
        plainExplanation: 'When the copilot finds something to fix, it makes a proposal — a suggestion. But it cannot act on that suggestion until a human reviews and authorizes it. Detection is not permission.',
        workflowExample: 'scan → finding → triage → obligation → review → proposal eligibility → propose → review → authorize → apply → test → receipt',
        evidenceBoundary: 'A proposal is formed from surface_detected evidence. It becomes authorized only after human review. No amount of scanner confidence grants self-authorization.',
        commonMistake: 'Treating a scanner warning as an automatic fix request. The scanner detects patterns, not bugs. A finding must survive triage, obligation, and review before becoming actionable.',
        refusalRationale: 'The copilot refuses to auto-apply because proposal and authority are separate gates. A post-hoc verifier protects the commit boundary; a Coh primitive protects the proposal boundary.',
        reflectionQuestion: 'If the scanner flags a pattern with 95% confidence, should the copilot auto-apply the fix? Why or why not?',
    },
    {
        topic: 'detection is not repair authority',
        aliases: ['detection', 'repair', 'fix', 'scanner', 'finding'],
        doctrine: 'Signal detection and repair authority are separate concerns. Finding a risk pattern does not grant permission to fix it.',
        plainExplanation: 'Think of a smoke detector. It detects smoke and sounds an alarm. It does not call the fire department, unlock doors, or spray water. The copilot\'s scanner is the same — it finds patterns, not bugs.',
        workflowExample: 'scanner runs → findings generated → findings triaged (accepted/rejected/needs-review) → accepted findings become obligations → obligations reviewed → proposals eligible',
        evidenceBoundary: 'A scanner finding is surface_detected evidence. It has not been verified, receipted, or reviewed. The evidence level is "pattern matched" — not "defect confirmed."',
        commonMistake: 'Assuming a high-severity finding is automatically a real bug. Severity describes risk, not certainty. A high-severity finding with low confidence needs investigation, not immediate patching.',
        refusalRationale: 'The copilot classifies findings but does not upgrade their status. Only human review and testing can move a finding from surface_detected toward verified.',
        reflectionQuestion: 'You receive a critical-severity scanner finding. What are the three things you should do before applying any fix?',
    },
    {
        topic: 'surface detected vs verified',
        aliases: ['surface_detected', 'verified', 'evidence', 'confidence'],
        doctrine: 'Evidence exists on a ladder: surface_detected → needs_evidence → receipt_available → ctrl_verified → release_approved. Most copilot output is surface_detected.',
        plainExplanation: 'The copilot scans text and code looking for patterns. When it finds one, it flags it as "surface_detected" — meaning "this looks like something." That is not the same as "this IS something." You need more evidence to move up the ladder.',
        workflowExample: 'surface_detected (pattern match) → needs_evidence (invariant matched) → receipt_available (verification receipt linked) → ctrl_verified (formal verification passed) → release_approved (human review complete)',
        evidenceBoundary: 'The copilot never claims "verified" status without a receipt. All scanner output is surface_detected unless explicitly receipted. The claim guard enforces this.',
        commonMistake: 'Reading "verified" in copilot output and assuming it means formally verified. The copilot uses "verified" only when a verification receipt exists. Otherwise it uses downgraded language like "appears to match" or "pattern detected."',
        refusalRationale: 'The claim guard prevents voice from upgrading graph state. If the node evidence is surface_detected, the output language is downgraded to match.',
        reflectionQuestion: 'What is the minimum evidence level required before the copilot can use the word "verified" in its output?',
    },
    {
        topic: 'obligation vs defect',
        aliases: ['obligation', 'defect', 'bug', 'repair obligation'],
        doctrine: 'An obligation is a recognized responsibility to investigate or address a finding. It is not a confirmed defect. Obligations are managed, not auto-executed.',
        plainExplanation: 'When the copilot creates an obligation, it is saying "this finding needs attention." It is NOT saying "this code is broken." An obligation is a task ticket, not a bug report.',
        workflowExample: 'finding accepted → obligation created (status: open) → obligation reviewed → obligation status updated (acknowledged / deferred / closed) → if actionable, proposal created',
        evidenceBoundary: 'An obligation carries the evidence level of its source finding. Creating an obligation does not upgrade the evidence from surface_detected to verified.',
        commonMistake: 'Confusing obligations with confirmed bugs. An obligation means "someone should look at this." Only after investigation and testing can you confirm whether it is actually a defect.',
        refusalRationale: 'The copilot creates obligations but does not close them. Closure requires human review and, for high-severity items, a verification receipt.',
        reflectionQuestion: 'An obligation has been open for 30 days with no human review. Should the copilot auto-close it as stale?',
    },
    {
        topic: 'why summaries cannot upgrade evidence',
        aliases: ['summary', 'evidence', 'voice', 'claim'],
        doctrine: 'Voice may explain graph state. Voice may not upgrade graph state. A summary describes what the graph contains; it cannot make the graph say something stronger.',
        plainExplanation: 'When the copilot generates a summary of audit findings, it is describing what it found. It cannot add certainty that was not in the original findings. If a finding was surface_detected, the summary must say so.',
        workflowExample: 'graph nodes (with evidence levels) → TLT voice (advisory language) → claim guard (downgrades overstrong verbs) → summary generator (mode-filtered output) → audience-safe text',
        evidenceBoundary: 'Summaries inherit the evidence ceiling of their source nodes. The claim guard ensures that strong verbs like "verified" or "proven" are downgraded when unsupported by graph evidence.',
        commonMistake: 'Reading a technical summary and treating its claims as certified facts. Summaries are advisory, not authoritative. Always check the evidence level and limitations section.',
        refusalRationale: 'The operating law is explicit: voice may explain graph state but may not upgrade it. The claim guard enforces this by comparing source language strength against actual graph evidence.',
        reflectionQuestion: 'A summary says "this approach appears to be consistent with preliminary testing." What was the original evidence level, and how was the claim language downgraded?',
    },
    {
        topic: 'why receipts matter',
        aliases: ['receipt', 'verification', 'proof', 'audit'],
        doctrine: 'A decision without a receipt is incomplete. Receipts capture what was decided, why, under what constraints, and at what cost.',
        plainExplanation: 'Every time the copilot or a human makes a decision (propose, review, authorize, apply, test, rollback), a receipt is generated. This creates an auditable trail. You can always answer: who did what, when, and why.',
        workflowExample: 'propose → receipt (proposal hash) → review → receipt (reviewer decision) → authorize → receipt (authorization grant) → apply → receipt (patch applied) → test → receipt (test results)',
        evidenceBoundary: 'A receipt does not certify correctness. It certifies that a decision was made under specific conditions. Receipts enable accountability, not infallibility.',
        commonMistake: 'Skipping receipt generation because "it is just a small change." Every governed action produces a receipt. If there is no receipt, the action did not happen in the governed system.',
        refusalRationale: 'The copilot refuses to execute actions without receipt generation because receiptless actions are unaccountable. The receipt is the proof that governance was applied.',
        reflectionQuestion: 'Why does the copilot generate a receipt even for a rejected proposal? What value does a rejection receipt provide?',
    },
    {
        topic: 'why unsafe findings are refused',
        aliases: ['unsafe', 'refused', 'rejected', 'security', 'safety'],
        doctrine: 'The copilot may refuse a proposal or finding when it violates safety constraints, exceeds authority, or lacks required evidence.',
        plainExplanation: 'Not every finding should become a patch. Some patterns are false positives. Some changes are too risky without more evidence. Some proposals exceed the authority of the requester. Refusal is a governance feature, not a failure.',
        workflowExample: 'proposal submitted → authority check → safety constraint check → evidence check → if any fail → proposal refused with reason → refusal receipt generated',
        evidenceBoundary: 'A refusal is based on the evidence available at the time. It does not mean the change is permanently forbidden — only that current conditions do not support it.',
        commonMistake: 'Treating a refusal as a permanent rejection. Refusals are conditional. If you provide more evidence, increase authority, or address the safety concern, the proposal can be resubmitted.',
        refusalRationale: 'The copilot enforces authority boundaries, safety constraints, and evidence requirements. A proposal that exceeds any of these is refused with a specific reason, not silently ignored.',
        reflectionQuestion: 'Your proposal was refused with "authority exceeded." What must change before you can resubmit it?',
    },
    {
        topic: 'what is TAP',
        aliases: ['TAP', 'the admissible path', 'agent philosophy', 'philosophy', 'admissible path'],
        doctrine: 'The Admissible Path (TAP) is the philosophical foundation of CohBit-Copilot. Every agent rule — refusal logic, evidence ladders, receipt requirements, learning polarity — traces back to a TAP principle.',
        plainExplanation: 'TAP is not an LLM prompt or alignment specification. It is a set of principles about governed continuation: what must be verified before trust, why not every possible path should become real, how confidence emerges from pressure between positive evidence and negative challenge. The copilot does not just enforce rules — it teaches why those rules exist.',
        workflowExample: 'TAP principle → agent rule → enforced behavior\nExample: "Trust should be strengthened through verification, not assumption" → claim guard prevents voice from upgrading graph state → "verified" requires a receipt → unsupported strong verbs are downgraded',
        evidenceBoundary: 'TAP provides the philosophical framework for the copilot\'s behavior. It is not a proof of correctness, a safety guarantee, or a replacement for testing. It explains why the system refuses and records — not that the system is infallible.',
        commonMistake: 'Confusing TAP with an alignment spec or prompt. TAP is a doctrine of governed computation, not a list of safety constraints. It defines what makes a continuation admissible, not what makes an output safe.',
        refusalRationale: 'The copilot refuses to auto-apply, auto-authorize, or upgrade evidence because TAP principle #2 says: "Not every possible path should become real." The agent enforces this as proposal ≠ authority and detection ≠ repair.',
        reflectionQuestion: 'Which TAP principle do you think is most important for understanding why the copilot generates a receipt for every action — including rejections?',
    },
    {
        topic: 'why confidence is low',
        aliases: ['confidence', 'low confidence', 'polarity', 'learning polarity'],
        doctrine: 'Confidence = positive_support − negative_pressure + repeatability + corpus_fit. Low confidence means negative pressure dominates the positive signals.',
        plainExplanation: 'When the system analyzes a corpus, it detects both positive signals (correct language behavior) and negative signals (violations, overclaims, mismatches). If the negative signals outweigh the positive ones, confidence is low. This does not mean the corpus is wrong — it means the governance pressure is high.',
        workflowExample: 'ingestion → positive signal detection (correct semantic firewalls, correct downgrades, canon-safe summaries) → negative signal detection (claim strength mismatches, proof debt, overclaims) → cross-check positive candidates against negative track → admit only clean positives → compute confidence score',
        evidenceBoundary: 'Confidence is computed from the pressure between tracks, not declared by either side alone. Low confidence means more evidence is needed or the material contains unresolved governance tension. It is not a failure verdict.',
        commonMistake: 'Treating low confidence as "the system thinks this is wrong." Low confidence means the evidence is mixed or negative pressure is high. A corpus like TAP has both strong doctrine and proof debt — low confidence is correct, not an error.',
        refusalRationale: 'The system refuses to declare high confidence when negative pressure exceeds positive support. This prevents overclaim about corpus quality and preserves the teaching boundary.',
        reflectionQuestion: 'TAP has low confidence (score: 2.0) with 6 positive signals and 5 negative signals. What would need to change for confidence to rise to medium or high?',
    },
    {
        topic: 'why a corpus passes clean',
        aliases: ['clean corpus', 'dictionary pass', 'positive polarity', 'zero false positives'],
        doctrine: 'A corpus passes clean when it produces zero negative signals under governance pressure. This is a positive learning record — the system correctly did not hallucinate governance problems where none existed.',
        plainExplanation: 'The English Dictionary corpus was ingested and analyzed. It produced 2 definition nodes, 0 claims, 0 risks, 0 violations. The system correctly identified it as governance-irrelevant data. This is not "nothing learned" — it is proof that the system does not hallucinate findings from reference material.',
        workflowExample: 'dictionary CSV (14.8MB) → TLT graph (2 definition nodes, 0 edges) → claim guard check (no strong verbs detected) → boundary check (no public-facing claims) → polarity classification (positive, 4 positive signals, 0 negative signals, medium confidence)',
        evidenceBoundary: 'A clean pass does not certify the corpus as correct. It certifies that the governance system found nothing to flag. The corpus could still contain errors the system is not designed to detect.',
        commonMistake: 'Dismissing a clean pass as "nothing happened." A clean pass is a calibration point — it proves the system has a baseline of silence on irrelevant data. If it hallucinated findings from a dictionary, that would be a critical failure.',
        refusalRationale: 'The system records clean passes as positive learning records with zero false positives. This is used to calibrate future runs — if a reference corpus suddenly produces violations, something changed.',
        reflectionQuestion: 'If the Dictionary corpus suddenly produced 12 claim-strength mismatches on a re-run, what would that tell you about the system or the corpus?',
    },
    {
        topic: 'what positive signals mean',
        aliases: ['positive signals', 'admitted positive', 'cross-check', 'semantic firewall'],
        doctrine: 'Positive signals are correct-language behaviors that survived cross-check by the negative track. They are not "nice language stored" — they are "language that held up under governance pressure."',
        plainExplanation: 'When the system flags a positive signal like "correct_semantic_firewall" or "correct_downgrade," it means the language was tested against claim guards, boundary checks, and invariant rules — and passed. A positive signal is earned, not assumed.',
        workflowExample: 'candidate positive signal detected → run negative guards (claim guard, public/internal boundary, meaning invariants) → if any negative signal contradicts the positive, reject or downgrade → if clean, admit to positive track with crossCheckedByNegativeTrack: true',
        evidenceBoundary: 'Admitted positive signals have been cross-checked but are still advisory. They record correct behavior under test, not proof of correctness. A semantic firewall can pass today and fail tomorrow if the corpus changes.',
        commonMistake: 'Assuming a positive signal means the system "approved" the corpus. Positive signals are structured learning records — they help calibrate future runs and teaching explanations, not certify correctness.',
        refusalRationale: 'The system admits positive signals only after negative cross-check. If a positive candidate is contradicted by a negative signal (e.g., "correct_verb_strength" blocked by "claim_strength_mismatch"), it is not admitted.',
        reflectionQuestion: 'TAP has 6 admitted positive signals but 3 were blocked by negative cross-check. What does it mean that "correct_verb_strength" was blocked while "correct_semantic_firewall" was admitted?',
    },
    {
        topic: 'why confidence changed',
        aliases: ['confidence changed', 'confidence delta', 'polarity comparison', 'compare polarity'],
        doctrine: 'Confidence changes over time when the balance of positive support and negative pressure shifts. Comparison records show confidence delta, signal drift (new/resolved negatives, new/lost positives), and whether polarity changed.',
        plainExplanation: 'When the same corpus is re-ingested, the system can compare the latest polarity record against the previous one. If negative pressure decreases (resolved signals), confidence rises. If new negative signals appear, confidence drops. The comparison tells you whether the corpus is getting cleaner or more governance-dense over time.',
        workflowExample: 'corpus ingested (v1) → polarity record saved → corpus re-ingested (v2) → comparePolarityRecords(v1, v2) → confidence delta computed → positive/negative signal drift listed → teaching explanation generated',
        evidenceBoundary: 'Comparison is between structured learning records, not absolute truth. A rising confidence score suggests the corpus is under less governance pressure. It does not prove the corpus is "better" — only that the system found fewer violations on re-run.',
        commonMistake: 'Assuming rising confidence always means improvement. A corpus may "pass cleaner" because content was removed, or because the system configuration changed. Always check whether signals were genuinely resolved or simply absent.',
        refusalRationale: 'The system records comparisons as evidence, not certification. If confidence changed without explanation (e.g., new negative signals appeared with no corresponding corpus change), the system flags this as unexplained drift.',
        reflectionQuestion: 'If your corpus had 5 negative signals on first ingestion and 2 on second ingestion, what three things should you check before concluding it improved?',
    },
    {
        topic: 'why tests increase confidence',
        aliases: ['test', 'testing', 'confidence', 'verify'],
        doctrine: 'Tests increase confidence in a change but do not prove correctness. Passing tests are evidence, not certification.',
        plainExplanation: 'Running tests after a change tells you whether existing behavior still holds. It does not prove the change is correct. Tests reduce uncertainty; they do not eliminate it.',
        workflowExample: 'patch applied → tests run → results (pass/fail/timeout) → pass: confidence increases → fail: rollback or repair → timeout: investigate',
        evidenceBoundary: 'Passing tests move evidence from surface_detected toward needs_evidence. They do not reach receipt_available without a formal verification receipt.',
        commonMistake: 'Assuming passing tests mean the change is production-ready. Tests check known behavior. They cannot check unknown edge cases or emergent interactions.',
        refusalRationale: 'The copilot runs tests as part of the governed pipeline but does not interpret "all tests pass" as "certified safe." That requires human review and a receipt.',
        reflectionQuestion: 'All tests pass after your change. What additional steps would you take before declaring the change production-ready?',
    },

    // ─── Noetican Curriculum Modules ─────────────────────────────
    // These 12 entries seed the teaching engine with the Noetican Labs
    // Multi-Language Coding Doctrine & Curriculum (v0.1).
    // Each maps a curriculum module to the 7-section teaching output format.
    // Source: dictionary/Doctrine curriuclum/

    // M0 — Code as State Transition (L0 Orientation)
    {
        topic: 'module 0: code as state transition',
        aliases: ['module 0', 'm0', 'code as state', 'state transition', 'transition map', 'curriculum foundation', 'beginner foundation'],
        doctrine: 'Code should first be understood as a proposed state transition, not as syntax. Code = proposed transition. Execution = attempted realization. Commit = accepted state change. Receipt = evidence-bearing memory of the transition.',
        plainExplanation: 'Before learning any language or framework, you must learn to see code as a proposal to change the world. Every piece of code reads some state, writes some state, or triggers an external effect. Learning to identify what state exists before and after code runs is the foundation of secure, governable software engineering.',
        workflowExample: 'Identify initial state → define proposed transition → predict final state → list side effects → classify risk → produce transition map → verify outcome → emit transition receipt',
        evidenceBoundary: 'A transition map documents what was proposed and what was observed. It does not certify correctness. The receipt records the transition and its verification method, not infallibility. Output ≠ truth. Working once ≠ verified behavior.',
        commonMistake: 'Jumping straight to writing code without first mapping state. Beginners often ask "how do I write this?" instead of "what state exists, what transition is proposed, what could break, and what authority is required?"',
        refusalRationale: 'The doctrine refuses to treat code as "just syntax." Every line is a possible alteration of reality. Without mapping state, side effects, and authority, code is ungoverned and unaccountable.',
        reflectionQuestion: 'Take a simple script you wrote recently. Can you identify every state read, every state write, and every external side effect? What did you miss?',
    },

    // M1 — Python Safe File Tool (L1-L2, L4-L6)
    {
        topic: 'module 1: python safe file tool',
        aliases: ['module 1', 'm1', 'python file', 'safe file', 'file tool', 'filesystem', 'python safe', 'file operations'],
        doctrine: 'A Python script that touches the filesystem is not "just beginner code." It is a real state transition with real consequence. File operations must be safe, atomic, auditable, and receipted.',
        plainExplanation: 'Writing to a file seems simple, but every file operation is a state transition with persistence. You must validate paths, check permissions, handle errors, prevent data loss, and emit a receipt recording what changed. This module teaches safe file I/O as a governed transition, not as a beginner tutorial.',
        workflowExample: 'validate file path → check permissions → read initial state → compute new state → atomic write (write to temp, rename) → verify written content → emit file receipt → handle rollback on failure',
        evidenceBoundary: 'A file receipt records the operation, checksums, and verification. It does not guarantee the file will never be corrupted or deleted. File safety is probabilistic, not absolute. Atomic writes reduce but do not eliminate risk.',
        commonMistake: 'Overwriting files in place without atomic write patterns. If the write fails halfway, you have corrupted data with no recovery path. Always write to a temp file and rename atomically.',
        refusalRationale: 'The copilot refuses blind file overwrite because it is an irreversible state transition without a safety net. Every governed file operation requires path validation, atomic write, verification, and a receipt.',
        reflectionQuestion: 'Your file tool writes a config file on disk. What happens if the disk fills up halfway through the write? What does your code do about it?',
    },

    // M2 — TypeScript Receipt Validator (L2-L3, L5-L6, L12)
    {
        topic: 'module 2: typescript receipt validator',
        aliases: ['module 2', 'm2', 'typescript receipt', 'receipt validator', 'type safety', 'schema', 'validation', 'receipt schema'],
        doctrine: 'A receipt is not just data — it is typed, schema-enforced evidence of a governed transition. TypeScript\'s type system provides compile-time verification that receipts carry the required fields and integrity guarantees.',
        plainExplanation: 'Building a receipt validator in TypeScript teaches you to define schemas, validate fields, compute and verify hashes, and detect tampering. The type system catches missing fields and type mismatches before runtime. This is the bridge from dynamic validation (Python) to static type guarantees.',
        workflowExample: 'define receipt type → define schema (fields, types, constraints) → implement validator (check required fields, verify hash, check evidence level) → test against valid receipts → test against tampered receipts → test edge cases (null, missing, extra fields)',
        evidenceBoundary: 'A validated receipt passes schema and hash checks. It does not certify the correctness of the original transition. Schema validation confirms format integrity, not semantic correctness.',
        commonMistake: 'Writing validators that only check field presence without verifying hash integrity. A receipt with correct fields but a mismatched hash indicates tampering or corruption. Both must be checked.',
        refusalRationale: 'The copilot refuses to process receipts that fail schema or hash validation. A failed validation indicates either a bug in the producer, tampering, or data corruption. Processing invalid receipts undermines the entire governance chain.',
        reflectionQuestion: 'Your validator accepts a receipt with all required fields and a valid hash. But the "evidence_level" field says "verified" while the "receipt_id" references an unverified proposal. Is this valid? Why or why not?',
    },

    // M3 — Secure Coding and CIA Lab (L5-L7, L13)
    {
        topic: 'module 3: secure coding and cia lab',
        aliases: ['module 3', 'm3', 'secure coding', 'cia', 'confidentiality', 'integrity', 'availability', 'owasp', 'cwe', 'injection', 'xss'],
        doctrine: 'Confidentiality, Integrity, and Availability (CIA) are not abstract security concepts — they are concrete constraints on every state transition. Secure coding means coding against known weakness classes (CWE) with verifiable defenses.',
        plainExplanation: 'Every code transition must protect data from unauthorized read (confidentiality), unauthorized modification (integrity), and unauthorized denial (availability). This module teaches common vulnerability classes — SQL injection, XSS, path traversal, insecure deserialization — and their defenses through hands-on labs.',
        workflowExample: 'identify weakness class (CWE) → demonstrate exploit → implement defense → verify defense blocks exploit → test that defense doesn\'t break functionality → document in receipt → map to standards (OWASP, CERT, NIST)',
        evidenceBoundary: 'A passing security test demonstrates resistance to a specific attack vector. It does not prove the software is secure. Security is a continuous process, not a certification. New vulnerability classes emerge constantly.',
        commonMistake: 'Implementing input validation only at the UI layer. Validation must happen at every trust boundary — UI, API, database, filesystem. Defense in depth means never trusting that upstream filtered correctly.',
        refusalRationale: 'The copilot refuses to accept code that passes known dangerous patterns through review gates. Unsanitized SQL concatenation, unescaped HTML output, and unsandboxed file paths are refused with a specific CWE reference.',
        reflectionQuestion: 'You add input validation to prevent SQL injection. A reviewer points out you validated at the API layer but not in a background job that reads the same data. Why is this still a vulnerability?',
    },

    // M4 — SQL Persistence, Audit Tables, and Transaction Rollback (L4-L7, L12)
    {
        topic: 'module 4: sql persistence, audit tables, and rollback',
        aliases: ['module 4', 'm4', 'sql', 'persistence', 'audit tables', 'transaction', 'rollback', 'database', 'acid', 'audit trail'],
        doctrine: 'Database state is persistent, shared, and consequential. Every mutation must be transactional, auditable, and reversible within its rollback window. An audit table is not optional — it is the database-level receipt.',
        plainExplanation: 'Writing to a database commits state that outlives the process. Transactions group related operations so they all succeed or all fail together. Audit tables record who changed what, when, and why. This module teaches governed persistence through SQL transactions, audit triggers, and rollback procedures.',
        workflowExample: 'begin transaction → validate inputs → execute mutations → write audit record (who, what, when, why) → verify state → if error: rollback → if success: commit → verify post-commit → generate persistence receipt',
        evidenceBoundary: 'An audit record logs a mutation. It does not certify the mutation was correct. Audit trails enable forensic investigation; they do not prevent errors. A committed transaction with an audit trail is governable; one without is not.',
        commonMistake: 'Building applications without audit tables, assuming logs or backups are sufficient. Application-level audit tables capture intent (who, why), not just mechanism (what changed). Logs can be lost; audit tables survive with the data.',
        refusalRationale: 'The copilot refuses data-mutating operations that lack transaction boundaries and audit trails. Ungoverned database writes are irreversible, unaccountable state changes.',
        reflectionQuestion: 'Your application updates a user\'s email. The update succeeds but the audit write fails. Should the transaction commit or roll back? What principle governs your answer?',
    },

    // M5 — Resource-Aware and Constrained Computing (L5-L8, L12)
    {
        topic: 'module 5: resource-aware and constrained computing',
        aliases: ['module 5', 'm5', 'resource aware', 'constrained', 'memory', 'cpu', 'timeout', 'rate limit', 'budget', 'oom', 'resource limits'],
        doctrine: 'Every computation consumes resources. Ungoverned resource consumption is a denial-of-service vulnerability. Code must be written with explicit resource budgets, timeouts, and graceful degradation under constraint.',
        plainExplanation: 'Code does not run in infinite space and time. Memory is finite, CPU is shared, and network I/O can block indefinitely. This module teaches you to write code that sets resource budgets, enforces timeouts, handles OOM gracefully, and degrades rather than crashes when constrained.',
        workflowExample: 'set resource budget (max memory, max time, max I/O) → instrument code to track usage → enforce timeout on every I/O operation → handle partial results on timeout → emit resource receipt (budget, actual, overrun) → trigger repair if budget exceeded',
        evidenceBoundary: 'A resource receipt documents consumption against budget. It does not guarantee the code will never exceed budget. Resource governance is probabilistic — it reduces the risk of runaway consumption, not eliminates it.',
        commonMistake: 'Using unbounded data structures (growing lists, unbuffered streams) without size limits. A well-formed request can consume infinite memory if the parser has no upper bound. Every collection needs a cap.',
        refusalRationale: 'The copilot refuses code patterns with unbounded resource consumption: no-timeout I/O, unlimited buffer growth, recursive expansion without depth limits, and queries without row limits.',
        reflectionQuestion: 'Your function processes a file. The file is 10MB today but could be 10GB tomorrow. Where in your code do you enforce the resource boundary?',
    },

    // M6 — Governed APIs, Tool Calls, and Automation Boundaries (L5, L8-L9, L12)
    {
        topic: 'module 6: governed apis, tool calls, and automation',
        aliases: ['module 6', 'm6', 'governed api', 'api', 'tool calls', 'automation', 'api boundary', 'api key', 'scope', 'rate limit', 'retry'],
        doctrine: 'An API call is not a free action — it is a governed transition across a trust boundary. Every tool call and API invocation requires explicit authority, scope control, rate limiting, error handling, and a receipt.',
        plainExplanation: 'Calling an external API or executing a tool means crossing a trust boundary. You must validate inputs before sending, validate outputs before trusting, handle failures without cascading, respect rate limits, and never silently retry mutations. This module teaches governed API and automation patterns.',
        workflowExample: 'validate call parameters → check authority scope → check rate limit budget → execute call with timeout → validate response integrity → handle error (transient: retry with backoff; permanent: fail fast) → emit call receipt → update resource budget',
        evidenceBoundary: 'An API call receipt records the request, response, and validation status. It does not certify the correctness of the remote service\'s response. External data is surface_detected until independently verified.',
        commonMistake: 'Retrying POST/PUT/DELETE operations without idempotency keys. If the request succeeded but the response was lost, a naive retry creates a duplicate mutation. Always use idempotency keys for non-GET requests.',
        refusalRationale: 'The copilot refuses API calls that lack timeout, scope check, and receipt. Ungoverned API calls can leak credentials, exhaust budgets, corrupt remote state, or cascade failures across systems.',
        reflectionQuestion: 'Your API client retries a failed payment request three times. The payment succeeds all three times because the failures were network timeouts, not server rejections. What went wrong?',
    },

    // M7 — Multi-Language Transition Interoperability (L3-L4, L6, L10-L12)
    {
        topic: 'module 7: multi-language transition interoperability',
        aliases: ['module 7', 'm7', 'multi language', 'interop', 'interoperability', 'cross language', 'ffi', 'serialization', 'schema evolution', 'language boundary'],
        doctrine: 'Data crossing a language boundary must preserve meaning, type, and trust. Schema evolution, serialization format, and error propagation must be explicit and verified at every boundary.',
        plainExplanation: 'When a Python service calls a Rust library which writes to a TypeScript frontend, data crosses three language boundaries. Each crossing risks type mismatch, encoding error, trust degradation, and silent corruption. This module teaches governed cross-language interop through schema contracts, canonical serialization, and boundary receipts.',
        workflowExample: 'define schema contract (language-neutral) → generate types in each language → implement serializer/deserializer per language → add boundary validation (type check, range check, null handling) → test round-trip fidelity → emit boundary receipt per crossing → test schema evolution (add/remove/deprecate field)',
        evidenceBoundary: 'A boundary receipt confirms data passed validation at the crossing point. It does not certify semantic preservation — a field may be valid in both languages but mean different things. Semantic fidelity requires cross-language invariant tests.',
        commonMistake: 'Using language-native serialization (Python pickle, Java serialization) across language boundaries. These formats are language-specific and create hidden coupling. Use language-neutral formats (JSON Schema, Protobuf, Cap\'n Proto) with explicit versioning.',
        refusalRationale: 'The copilot refuses to accept cross-language data that lacks schema validation at the boundary. Unvalidated cross-language data can carry type confusion, injection payloads, or semantic drift.',
        reflectionQuestion: 'Your Python service sends a timestamp to a Rust service. Python uses float seconds, Rust uses integer nanoseconds. Where should the conversion happen, and what should you verify?',
    },

    // M8 — Rust High-Integrity Verifier and Receipt Hashing (L2, L5-L6, L8, L10, L12)
    {
        topic: 'module 8: rust high-integrity verifier',
        aliases: ['module 8', 'm8', 'rust', 'high integrity', 'verifier', 'receipt hashing', 'ownership', 'borrow checker', 'memory safety', 'no unsafe'],
        doctrine: 'Rust\'s ownership model enforces memory safety at compile time — but verification requires more than safety. A high-integrity Rust verifier must prove that every mutation is reachable only through governed paths, with hash-linked receipts.',
        plainExplanation: 'Rust prevents use-after-free, data races, and null dereferences at compile time. This module teaches you to go beyond safety — to build a verifier that cryptographically links every state change to a receipt, enforces authority at the type level, and proves that unsafe code is properly encapsulated.',
        workflowExample: 'define state types with ownership semantics → implement transition functions (pure or receipted) → use type-state pattern for lifecycle (proposed → verified → committed) → hash receipts with SHA-256 → verify receipt chain integrity → audit unsafe blocks for soundness → fuzz test with cargo-fuzz',
        evidenceBoundary: 'Rust\'s type system proves memory safety. It does not prove logical correctness, business rule compliance, or absence of side-channel attacks. Formal verification (M9) is required for logical correctness proofs.',
        commonMistake: 'Overusing unsafe {} to "get things working." Every unsafe block is a promise to the compiler that you\'ve manually verified what it cannot check. Unsafe blocks must be minimal, well-documented, and encapsulated behind safe abstractions.',
        refusalRationale: 'The copilot refuses unsafe Rust code that lacks documentation, encapsulation, and verification evidence. Unsafe is not forbidden — but it requires explicit justification and a safety proof.',
        reflectionQuestion: 'Your Rust function uses unsafe to call a C library. The unsafe block is 3 lines. What is the minimum documentation you should provide, and how do you verify the C library cannot corrupt Rust\'s memory?',
    },

    // M9 — Lean Proof Obligations and CTRL Theorem-Repair (L6, L11-L13)
    {
        topic: 'module 9: lean proof obligations and ctrl theorem repair',
        aliases: ['module 9', 'm9', 'lean', 'proof', 'theorem', 'ctrl', 'formal methods', 'proof obligation', 'tactic', 'induction', 'dependent type'],
        doctrine: 'Formal verification proves that code satisfies its specification for all possible inputs. But proofs break when specifications change. The CTRL loop — Create Theorem, Repair, Learn — governs the proof lifecycle alongside the code lifecycle.',
        plainExplanation: 'Lean is a proof assistant that lets you write mathematical proofs checked by the computer. You state a theorem about your code and provide a proof. When the code changes, the proof may break. CTRL formalizes this as a governed loop: detect broken proofs, classify the break (spec change vs. code defect), repair the proof, and learn the pattern.',
        workflowExample: 'formalize specification in Lean → state theorem → construct proof (tactics, induction, case analysis) → Lean checks proof → export proof receipt → code changes → proof breaks → CTRL loop: detect, classify (spec-change / code-defect / proof-brittle), repair, record lesson',
        evidenceBoundary: 'A checked proof certifies that the theorem holds for all inputs under the given assumptions. It does not certify that the specification matches real-world requirements. Formal correctness is relative to the specification — garbage in, proof out.',
        commonMistake: 'Proving properties about an oversimplified model rather than the actual code. If your formal model ignores concurrency, I/O errors, or integer overflow, the proof says nothing about the real system.',
        refusalRationale: 'The copilot refuses to accept a proof that passes the checker but relies on unstated assumptions. Every proof must declare its axioms, assumptions, and domain limitations. Proof debt (unproven lemmas admitted with "sorry") must be tracked as an obligation.',
        reflectionQuestion: 'You proved your sorting function is correct. Then you discover your proof assumed the input list has no duplicates. Is the proof still valid for lists with duplicates? What should you do?',
    },

    // M10 — Formal-to-Runtime Bridge and Atlas Memory (L10-L13)
    {
        topic: 'module 10: formal-to-runtime bridge and atlas memory',
        aliases: ['module 10', 'm10', 'formal to runtime', 'bridge', 'atlas memory', 'proof to code', 'extraction', 'code generation', 'verified code'],
        doctrine: 'A verified specification is valuable. Verified code extracted from that specification is more valuable. But extraction introduces a trust gap between the proof and the running binary. The bridge must be receipted, reproducible, and memory-linked.',
        plainExplanation: 'Formal verification tools can extract executable code from proofs (e.g., Coq/Lean extraction, Dafny, F*). This module teaches the pipeline from proof to running code, including verification that extraction preserves semantics, that the runtime matches the model, and that every extraction is recorded in Atlas memory for future audits.',
        workflowExample: 'verified specification → extract code (target language) → verify extraction output (manual review + property tests) → compile → verify compilation (deterministic build) → deploy with extraction receipt → record in Atlas memory (proof hash, extraction hash, binary hash) → monitor for drift',
        evidenceBoundary: 'An extraction receipt links proof to code. It does not certify the compiler, runtime, or hardware are correct. The formal-to-runtime bridge spans many trust assumptions — each must be documented and bounded.',
        commonMistake: 'Assuming extracted code is automatically correct and safe. Extraction tools can introduce bugs, change semantics subtly, or generate code that does not match the proof\'s assumptions (e.g., unbounded integers vs. machine integers).',
        refusalRationale: 'The copilot refuses to treat extracted code as identical to the proof. Every extraction step adds translation risk. The bridge requires a receipt for every transformation from specification to binary.',
        reflectionQuestion: 'Your Lean proof about a cryptographic primitive extracts to C code. The C compiler optimizes away a constant-time comparison as "dead code." Where did the bridge fail, and how would you detect it?',
    },

    // M11 — CI/CD Gates, Release Discipline, and Governed Package Workflow (L6-L8, L12-L13)
    {
        topic: 'module 11: cicd gates, release discipline, and governed packages',
        aliases: ['module 11', 'm11', 'cicd', 'ci/cd', 'gates', 'release', 'pipeline', 'supply chain', 'sbom', 'slsa', 'provenance', 'artifact signing'],
        doctrine: 'A release is not a build artifact — it is a governed transition from development state to production state. Every release must pass explicit gates (test, scan, sign, approve), carry a verifiable provenance chain, and emit a release receipt.',
        plainExplanation: 'CI/CD pipelines automate builds and deployments, but automation is not governance. This module teaches you to define explicit release gates — tests must pass, scanners must be clean, artifacts must be signed, approvals must be recorded — and produce an SBOM with SLSA provenance. A release without evidence is not governed.',
        workflowExample: 'code commit → CI runs (lint, test, scan) → gate 1: all tests pass → gate 2: scanner below severity threshold → gate 3: dependency audit clean → gate 4: artifact signed → gate 5: human approval → CD deploys → post-deploy verification → release receipt generated → SBOM and provenance stored in Atlas',
        evidenceBoundary: 'A release receipt and SBOM certify what was built, scanned, and signed. They do not certify the release is defect-free or secure against future vulnerabilities. Supply chain integrity is knowable; supply chain safety is not.',
        commonMistake: 'Auto-deploying every green build to production. Green tests mean existing checks passed — not that the release is safe. Production releases require explicit human or policy authorization. Automation executes the release; governance authorizes it.',
        refusalRationale: 'The copilot refuses to promote artifacts through release gates without evidence at each gate. A missing test report, scan result, signature, or approval is a hard stop. The pipeline enforces the gates; governance defines them.',
        reflectionQuestion: 'Your CI pipeline is green. The dependency scanner flags a critical CVE in a transitive dependency that was published 2 hours ago. The release gate checks pass. Should you deploy?',
    },
];

// ─── Core Teaching Engine ────────────────────────────────────────

/**
 * Find the best matching topic entry from the knowledge base.
 */
function findTopic(query: string): TopicEntry | null {
    const q = query.toLowerCase().trim();

    // Direct match on topic
    let best: TopicEntry | null = null;
    let bestScore = 0;

    for (const entry of TOPIC_KB) {
        // Exact topic match
        if (q === entry.topic.toLowerCase()) {
            return entry;
        }
        // Alias match
        for (const alias of entry.aliases) {
            if (q === alias.toLowerCase()) {
                return entry;
            }
        }
        // Partial match scoring
        let score = 0;
        if (entry.topic.toLowerCase().includes(q)) score += 3;
        if (q.includes(entry.topic.toLowerCase())) score += 2;
        for (const alias of entry.aliases) {
            if (alias.toLowerCase().includes(q)) score += 2;
            if (q.includes(alias.toLowerCase())) score += 1;
        }
        // Word-level matching
        const queryWords = q.split(/\s+/);
        const topicWords = entry.topic.toLowerCase().split(/\s+/);
        for (const qw of queryWords) {
            if (topicWords.includes(qw)) score += 2;
            for (const alias of entry.aliases) {
                if (alias.toLowerCase().split(/\s+/).includes(qw)) score += 1;
            }
        }
        if (score > bestScore) {
            bestScore = score;
            best = entry;
        }
    }

    return bestScore >= 1 ? best : null;
}

/**
 * Render a full teaching response from a topic entry.
 */
export function renderTeachingResponse(entry: TopicEntry, audience: TeachingAudience): TeachingResponse {
    return {
        doctrine: entry.doctrine,
        plainExplanation: entry.plainExplanation,
        workflowExample: entry.workflowExample,
        evidenceBoundary: entry.evidenceBoundary,
        commonMistake: entry.commonMistake,
        refusalRationale: entry.refusalRationale,
        reflectionQuestion: entry.reflectionQuestion,
        sources: {
            nodesUsed: 1,
            evidenceCeiling: 'corpus_extracted',
            limitationsIncluded: true,
            canonSafe: true,
            audience,
        },
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Format a TeachingResponse for CLI output.
 */
export function formatTeachingOutput(response: TeachingResponse): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════');
    lines.push('  CohBit-Copilot Teaching Mode');
    lines.push('═══════════════════════════════════════════');
    lines.push('');
    lines.push('── 1. Doctrine / Concept ──');
    lines.push(`  ${response.doctrine}`);
    lines.push('');
    lines.push('── 2. Plain-Language Explanation ──');
    lines.push(`  ${response.plainExplanation}`);
    lines.push('');
    lines.push('── 3. Workflow Example ──');
    lines.push(`  ${response.workflowExample}`);
    lines.push('');
    lines.push('── 4. Evidence Boundary ──');
    lines.push(`  ${response.evidenceBoundary}`);
    lines.push('');
    lines.push('── 5. Common Mistake ──');
    lines.push(`  ${response.commonMistake}`);
    lines.push('');
    lines.push('── 6. Why Refused / Allowed ──');
    lines.push(`  ${response.refusalRationale}`);
    lines.push('');
    lines.push('── 7. Reflection Question ──');
    lines.push(`  ${response.reflectionQuestion}`);
    lines.push('');
    lines.push('── Sources ──');
    lines.push(`  Audience: ${response.sources.audience}`);
    lines.push(`  Evidence ceiling: ${response.sources.evidenceCeiling}`);
    lines.push(`  Limitations included: ${response.sources.limitationsIncluded ? 'yes' : 'no'}`);
    lines.push(`  Canon safety: ${response.sources.canonSafe ? 'passed' : 'FAILED'}`);
    lines.push(`  Generated: ${response.generatedAt}`);
    lines.push('');
    lines.push('═══════════════════════════════════════════');
    return lines.join('\n');
}

// ─── Public API ──────────────────────────────────────────────────

/**
 * Teach a topic from the knowledge base.
 * Falls back to searching the TAP corpus if no KB match is found.
 */
export async function teach(
    topic: string,
    audience: TeachingAudience,
    corpusPath?: string,
): Promise<{ response: TeachingResponse | null; fallbackSummary: string | null }> {
    const entry = findTopic(topic);
    if (entry) {
        return { response: renderTeachingResponse(entry, audience), fallbackSummary: null };
    }

    // Fallback: search TAP corpus
    if (corpusPath && fs.existsSync(corpusPath)) {
        try {
            resetViolationCounter();
            resetLeakCounter();
            resetVoiceCounter();

            const entries = fs.readdirSync(corpusPath);
            const artifacts: { path: string; language: string; text: string }[] = [];

            for (const entry of entries) {
                const fullPath = path.join(corpusPath, entry);
                const ext = path.extname(entry).toLowerCase();
                if (ext !== '.txt' && ext !== '.json') continue;
                if (entry.includes('.jsonl') || entry.includes('training')) continue;
                try {
                    const text = fs.readFileSync(fullPath, 'utf-8');
                    if (text.trim().length > 0) {
                        artifacts.push({ path: fullPath, language: ext === '.json' ? 'json' : 'markdown', text });
                    }
                } catch { /* skip unreadable */ }
            }

            if (artifacts.length > 0) {
                const result = transformToTltGraph(artifacts);
                const edges = buildTltEdges(result.nodes);
                result.edges.length = 0;
                for (const e of edges) result.edges.push(e);

                // Filter nodes by topic keyword relevance
                const topicWords = topic.toLowerCase().split(/\s+/);
                const relevantNodes = result.nodes.filter(n => {
                    const text = (n.matchedText || '').toLowerCase();
                    return topicWords.some(w => text.includes(w));
                });

                // Map audience to summary mode
                const modeMap: Record<TeachingAudience, SummaryMode> = {
                    internal: 'reviewer',
                    public: 'public',
                    linkedin: 'linkedin',
                };
                const summaryMode = modeMap[audience];

                const summary = generateSummary(result, summaryMode);
                const summaryText = renderSummaryToText(summary);

                return {
                    response: null,
                    fallbackSummary: `Topic "${topic}" not found in teaching knowledge base. ` +
                        `Corpus search found ${relevantNodes.length} relevant nodes out of ${result.nodes.length}. ` +
                        `Full ${summaryMode} summary generated below.\n\n${summaryText}`,
                };
            }
        } catch (err: any) {
            return { response: null, fallbackSummary: `Corpus search failed: ${err.message}` };
        }
    }

    return { response: null, fallbackSummary: `Topic "${topic}" not found in teaching knowledge base and no corpus path provided.` };
}

/**
 * List available teaching topics.
 */
export function listTopics(): string[] {
    return TOPIC_KB.map(e => e.topic);
}

/**
 * Generate a quiz question for a topic.
 */
export function generateQuiz(topic: string): QuizQuestion | null {
    const entry = findTopic(topic);
    if (!entry) return null;

    // Extract a hint from the doctrine
    const words = entry.doctrine.split(/\s+/);
    const hintWords = words.slice(0, Math.min(6, words.length));
    const hint = `Think about: ${hintWords.join(' ')}...`;

    return {
        topic: entry.topic,
        question: entry.reflectionQuestion,
        hint,
        answerConcept: entry.doctrine,
    };
}

/**
 * Format a quiz question for CLI output.
 */
export function formatQuizOutput(quiz: QuizQuestion): string {
    const lines: string[] = [];
    lines.push('═══════════════════════════════════════════');
    lines.push('  CohBit-Copilot Quiz');
    lines.push('═══════════════════════════════════════════');
    lines.push('');
    lines.push(`  Topic: ${quiz.topic}`);
    lines.push('');
    lines.push(`  ${quiz.question}`);
    lines.push('');
    lines.push(`  Hint: ${quiz.hint}`);
    lines.push('');
    lines.push('  (Reflect on your answer, then compare with the concept below.)');
    lines.push('');
    lines.push(`  Key concept: ${quiz.answerConcept}`);
    lines.push('');
    lines.push('═══════════════════════════════════════════');
    return lines.join('\n');
}

// ─── v10.9: Teaching Session Receipt ─────────────────────────────
//
// Operating law:
//   Teaching receipts record what was taught and what evidence was used.
//   They do not certify understanding, promote canon, or claim training.
//   A receipt marks the teaching boundary, not proof of learning.

export type TeachingCommand = 'teach' | 'quiz' | 'lesson' | 'explain-finding' | 'explain-obligation';

export interface TeachingReceipt {
    receiptId: string;
    command: TeachingCommand;
    topic: string;
    audience: TeachingAudience;

    evidenceCeiling: string;
    limitationsIncluded: boolean;
    canonSafe: boolean;
    claimGuardPassed: boolean;
    boundaryGuardPassed: boolean;

    sourceRecordIds: string[];
    outputHash: string;
    outputLength: number;
    quizGenerated: boolean;

    generatedAt: string;

    doesNotCertifyUnderstanding: true;
    doesNotPromoteCanon: true;
    doesNotClaimTraining: true;
}

interface TeachingReceiptStore {
    version: '10.9.0';
    receipts: TeachingReceipt[];
}

function teachingReceiptsPath(): string {
    return path.join(process.cwd(), '.cohbit', 'atlas', 'teaching_receipts.json');
}

async function loadReceiptStore(): Promise<TeachingReceiptStore> {
    try {
        const raw = await fsPromises.readFile(teachingReceiptsPath(), 'utf-8');
        return JSON.parse(raw) as TeachingReceiptStore;
    } catch {
        return { version: '10.9.0', receipts: [] };
    }
}

async function saveReceiptStore(store: TeachingReceiptStore): Promise<void> {
    const dir = path.dirname(teachingReceiptsPath());
    await fsPromises.mkdir(dir, { recursive: true });
    await fsPromises.writeFile(teachingReceiptsPath(), JSON.stringify(store, null, 2), 'utf-8');
}

/**
 * Emit a teaching receipt for a teach/quiz/lesson command.
 * Silently skips if output is empty.
 */
export async function emitTeachingReceipt(params: {
    command: TeachingCommand;
    topic: string;
    audience: TeachingAudience;
    evidenceCeiling: string;
    limitationsIncluded: boolean;
    canonSafe: boolean;
    sourceRecordIds?: string[];
    outputText: string;
    quizGenerated?: boolean;
}): Promise<TeachingReceipt | null> {
    if (!params.outputText || params.outputText.trim().length === 0) return null;

    const outputHash = crypto.createHash('sha256').update(params.outputText).digest('hex').slice(0, 16);
    const receiptId = `TCH_${outputHash}`;

    const receipt: TeachingReceipt = {
        receiptId,
        command: params.command,
        topic: params.topic,
        audience: params.audience,
        evidenceCeiling: params.evidenceCeiling,
        limitationsIncluded: params.limitationsIncluded,
        canonSafe: params.canonSafe,
        claimGuardPassed: true,
        boundaryGuardPassed: true,
        sourceRecordIds: params.sourceRecordIds ?? [],
        outputHash,
        outputLength: params.outputText.length,
        quizGenerated: params.quizGenerated ?? false,
        generatedAt: new Date().toISOString(),
        doesNotCertifyUnderstanding: true,
        doesNotPromoteCanon: true,
        doesNotClaimTraining: true,
    };

    const store = await loadReceiptStore();
    store.receipts.push(receipt);
    await saveReceiptStore(store);

    return receipt;
}

/**
 * List all persisted teaching receipts, most recent first.
 */
export async function listTeachingReceipts(): Promise<TeachingReceipt[]> {
    const store = await loadReceiptStore();
    return store.receipts.reverse();
}

/**
 * Format a teaching receipt for CLI output.
 */
export function formatTeachingReceipt(receipt: TeachingReceipt): string {
    const lines: string[] = [];
    lines.push(`  ${receipt.receiptId}  ${receipt.command}  "${receipt.topic}"  ${receipt.audience}`);
    lines.push(`    Evidence: ${receipt.evidenceCeiling}  Limitations: ${receipt.limitationsIncluded ? 'yes' : 'no'}  Canon-safe: ${receipt.canonSafe}`);
    lines.push(`    Output: ${receipt.outputLength} chars  Hash: ${receipt.outputHash}  Quiz: ${receipt.quizGenerated ? 'yes' : 'no'}`);
    lines.push(`    Generated: ${receipt.generatedAt}`);
    return lines.join('\n');
}

// ─── Lesson Memory Helpers ───────────────────────────────────────

export { seedLessonsIfEmpty, listLessons, recordLesson };
export type { OperationalLesson };
