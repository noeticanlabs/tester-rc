# Local Copilot Capabilities

CohBit-Copilot v2.0 provides a nine-layer intelligence chain for local governed development assistance:

## Chain

```
English task
  → workspace/environment review
  → symbols/dependency map
  → work plan
  → test recommendation
  → bounded patch construction
  → governed gate lifecycle
  → rollback/receipt
  → session ledger
```

## Layer Details

### 1. English Command Understanding (v1.0E)
Rule-based parser that detects: intent, constraints (readOnly, noApply, noDelete), unsafe patterns (force commit, delete everything, bypass review), file targets, session references, and test commands. No LLM dependency.

### 2. Workspace & Environment Awareness (v1.1)
Scans project directories, detects language (Node/Rust/Go/Python/dotnet), classifies files (source/test/config/docs), and reviews environment readiness (tool availability, git status, risk level).

### 3. Symbol & Dependency Map (v1.2)
Extracts symbols (imports, exports, functions, classes, types) across TypeScript, Rust, Go, Python, and dotnet. Builds a dependency graph with adjacency and reverse adjacency for finding dependents and transitive affected files.

### 4. Work Planner (v1.3)
Converts English task descriptions into WorkPlan objects with: inferred intent (AddCommand, ModifyFunction, AddTest, FixFailure, InspectOnly), likely files with reasons, affected files via dependency graph, ordered steps, risk assessment, and mutation permission.

### 5. Test Recommendation (v1.4)
Three-tier test command recommendation: Tier 1 targeted (exact test file), Tier 2 module (file + dependents), Tier 3 full suite. Supports per-language test runner syntax. Does not claim verification has occurred.

### 6. Bounded Patch Construction (v1.5)
Six safe patch primitives: ReplaceExactBlock, InsertImportIfAbsent, AppendExport, CreateFileFromTemplate, AddCliDispatchArm, AddTestCaseFromTemplate. All primitives use exact block replacement as foundation. Builder may propose but never applies.

### 7. Guided Work Command (v1.6)
Single command that orchestrates all layers: `work "task"` runs English parse → environment review → plan → test recommendation → optionally bounded proposal. Stops before review/apply.

### 8. Failure-Aware Repair Planner (v1.7)
Parses vitest assertion failures, TypeScript build errors, and generic failure text into structured ParsedFailure objects. Maps failures to source files and suggests patch primitives. Generates RepairPlan with likely files, suggested patches, steps, and risk.

### 9. Governed Gate Pipeline (v1.0)
Seven-gate lifecycle: Propose → Review → Authorize → Apply → Test → Rollback → Receipt. Every state transition is recorded in the gate timeline. Failed patches are rolled back to verified state. Successful patches emit deterministic receipts.

## What It Does Not Do

CohBit-Copilot is not an autonomous coding agent, an LLM replacement, a general code repair system, or a production-grade AI developer. It does not claim to be formally verified end-to-end. It is a rule-based, deterministic local tool that assists a human operator through explicit governed workflows.