// @cohbit/tooling — R21 Compute Processor Map Tests (v11.0)
// 10 tests verifying the CPU/GPU doctrine.

import { describe, it, expect } from "vitest";
import {
  getProcessorProfile, createProcessorRecord, authorizeProcessorRecord,
  completeProcessorRecord, canAuthorizeAction, canCommitState,
  isFutureProcessor, processorDoctrineSummary, explainProcessorBoundary,
  PROCESSOR_PROFILES,
} from "../src/resource/R21_compute_processor_map.js";

describe("R21 Compute Processor Map", () => {
  it("1. deterministic CPU processors can route/block/receipt but cannot commit", () => {
    const rec = createProcessorRecord("review_queue_build", { inputSummary: "test" });
    expect(rec.logic).toBe("deterministic");
    expect(rec.device).toBe("cpu");
    expect(canAuthorizeAction(rec)).toBe(true);
    expect(canCommitState(rec)).toBe(false);
  });

  it("2. heuristic processors cannot authorize action", () => {
    const rec = createProcessorRecord("rust_risk_scan", { inputSummary: "test" });
    expect(rec.logic).toBe("heuristic");
    expect(canAuthorizeAction(rec)).toBe(false);
  });

  it("3. future GPU processors are marked future_not_connected", () => {
    const rec = createProcessorRecord("future_gpu_symbolic_search", { inputSummary: "test" });
    expect(rec.device).toBe("future_not_connected");
    expect(isFutureProcessor(rec)).toBe(true);
  });

  it("4. hybrid processors explain deterministic gate requirement", () => {
    const rec = createProcessorRecord("rust_ast_lite_parse", { inputSummary: "test" });
    expect(rec.logic).toBe("hybrid");
    const exp = explainProcessorBoundary(rec);
    expect(exp).toContain("deterministic gates");
  });

  it("5. receipt_emit is deterministic CPU CohBit_receipt", () => {
    const rec = createProcessorRecord("receipt_emit", { inputSummary: "test" });
    expect(rec.logic).toBe("deterministic");
    expect(rec.device).toBe("cpu");
    expect(rec.layer).toBe("CohBit_receipt");
    expect(rec.authority).toContain("may_receipt");
  });

  it("6. rust_risk_scan is heuristic CPU UPT_possibility", () => {
    const p = getProcessorProfile("rust_risk_scan");
    expect(p.logic).toBe("heuristic");
    expect(p.device).toBe("cpu");
    expect(p.layer).toBe("UPT_possibility");
  });

  it("7. claim_guard is deterministic CPU APT_admissibility", () => {
    const rec = createProcessorRecord("claim_guard", { inputSummary: "test" });
    expect(rec.logic).toBe("deterministic");
    expect(rec.device).toBe("cpu");
    expect(rec.layer).toBe("APT_admissibility");
    expect(rec.authority).toContain("may_block");
  });

  it("8. canCommitState() always returns false", () => {
    for (const kind of Object.keys(PROCESSOR_PROFILES) as Array<keyof typeof PROCESSOR_PROFILES>) {
      const rec = createProcessorRecord(kind, { inputSummary: "test" });
      expect(canCommitState(rec)).toBe(false);
    }
  });

  it("9. all processor profiles have limitation text", () => {
    for (const [kind, profile] of Object.entries(PROCESSOR_PROFILES)) {
      expect(profile.limitation).toBeTruthy();
      expect(profile.limitation.length).toBeGreaterThan(20);
    }
  });

  it("10. create/authorize/complete lifecycle works", () => {
    let rec = createProcessorRecord("audit_scan", { inputSummary: "full-repo-scan" });
    expect(rec.status).toBe("planned");
    expect(rec.authorized).toBe(false);
    
    rec = authorizeProcessorRecord(rec, "BUDGET_002");
    expect(rec.status).toBe("authorized");
    expect(rec.authorized).toBe(true);
    expect(rec.budgetId).toBe("BUDGET_002");
    
    rec = completeProcessorRecord(rec, { cpuMs: 450, filesRead: 12, outputSummary: "3 findings" });
    expect(rec.status).toBe("completed");
    expect(rec.cpuMs).toBe(450);
    expect(rec.filesRead).toBe(12);
    expect(rec.endedAt).toBeTruthy();
  });
});
