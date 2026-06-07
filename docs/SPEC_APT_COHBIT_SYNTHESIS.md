# APT-CohBit Synthesis Specification

**Date:** 2026-05-14  
**Status:** Theoretical Specification for Implementation

---

# Core Thesis

\[
\boxed{
\textbf{
APT gives CohBit its ontology: CohBit is the smallest committed unit by which persistence becomes real.
}
}
\]

## Before APT

\[
\text{CohBit} = \text{verifier-certified state transition}
\]

## After APT

\[
\boxed{
\text{CohBit} = \text{minimal executable unit of admissible persistence}
}
\]

APT upgrades CohBit with:
- persistence geometry,
- continuation meaning,
- boundary awareness,
- trajectory role,
- realization filtering,
- dissipation accounting,
- irreversibility status,
- physical embodiment,
- semantic persistence.

---

# APT-Enhanced CohBit Type

```rust
pub struct AptCohBit {
    // Core transition
    pub from_state: StateHash,
    pub to_state: StateHash,
    pub action_hash: ActionHash,

    // Quantitative geometry (Layer 2)
    pub viability_before: u128,
    pub viability_after: u128,
    pub spend: u128,
    pub defect: u128,
    pub margin: i128,

    // Verification (Layer 0)
    pub verifier_status: VerifierStatus,
    pub receipt_hash: ReceiptHash,

    // Boundary awareness (Layer 1.5)
    pub boundary_class: BoundaryClass,

    // Sector classification (Layer 5.5)
    pub sector_class: SectorClass,

    // Irreversibility (Layer 5)
    pub irreversibility: IrreversibilityStatus,

    // Realization (Layer 3.5, 4, 6)
    pub realization: RealizationStatus,

    // Maintenance (Layer 6.5)
    pub metabolism: MetabolismStatus,

    // Semantic persistence (Layer 7)
    pub semantic_status: SemanticStatus,
}
```

---

# Promotion Classes (Theoretical)

| Class | Name | Requirements |
|-------|------|---------------|
| 0 | Candidate | Generated but unverified |
| 1 | Verifier-Accepted | RV(β) = ACCEPT |
| 2 | Margin-Safe | M(β) ≥ 0 |
| 3 | Realized | Committed to state |
| 4 | Trace-Composable | Valid in CohTrace |
| 5 | Reconstruction-Safe | Rollback/lineage exists |
| 6 | Persistence-Stable | Maintained across env |
| 7 | Semantic | Meaning preserved |

Final:

\[
\boxed{
\text{promotion-grade CohBit} = \beta_7
}
\]

---

# Theorem Stack

## Theorem 1 — Candidate is not CohBit

\[
x\leadsto_c y\nRightarrow x\leadsto_A y
\]

Generated transition does not imply CohBit.

---

## Theorem 2 — CohBit implies admissible persistence

\[
\beta:x\to y \Rightarrow x\leadsto_A y
\]

---

## Theorem 3 — CohBit margin theorem

\[
\beta\text{ admissible} \Rightarrow M(\beta)\ge0
\]

---

## Theorem 4 — CohBit trace telescoping

For trajectory τ = (β₁, ..., βₙ):

\[
\boxed{
V(x_n)+\sum_i S(\beta_i) \le V(x_0)+\sum_i D(\beta_i)
}
\]

---

## Theorem 5 — Boundary safety theorem

If β crosses a forbidden boundary (x∈S, y∉S):

\[
\neg\mathsf{Promote}(\beta)
\]

---

## Theorem 6 — Realization theorem

\[
\mathsf{Promote}(\beta) \Rightarrow \mathsf{Realizable}(\beta)
\]

No runtime realization, no promoted CohBit.

---

## Theorem 7 — Irreversibility theorem

If Irr(β) then promotion requires IrrBudgeted(β) ∧ ReceiptValid(β) ∧ PolicyAuthorized(β).

---

## Theorem 8 — Semantic preservation theorem

For semantic-sensitive domains:

\[
\mathsf{Promote}(\beta) \Rightarrow \mathsf{SemPersist}(\beta)
\]

---

## Theorem 9 — Maintenance theorem

\[
\mathsf{Canonical}(\beta) \Rightarrow \mathsf{Met}(\beta,e)
\]

---

## Theorem 10 — APT-CohBit main theorem

\[
\boxed{
\begin{aligned}
\mathsf{CanonicalCohBit}(\beta) \Rightarrow\;& \\
& x\leadsto_A y \\
\land\;& RV(\beta)=ACCEPT \\
\land\;& M(\beta)\ge0 \\
\land\;& \mathsf{Realized}(\beta) \\
\land\;& \mathsf{Receipted}(\beta) \\
\land\;& \mathsf{BoundarySafe}(\beta) \\
\land\;& \mathsf{SectorClassified}(\beta) \\
\land\;& \mathsf{Maintained}(\beta) \\
\land\;& \mathsf{SemPersist}(\beta)
\end{aligned}
}
\]

Plain meaning: *A canonical CohBit is an admissible persistence event with executable, historical, physical, and semantic integrity.*

---

# Boundary Types

\[
\boxed{
\begin{aligned}
\partial_{\mathrm{safe}} &: \text{safety boundary} \\
\partial_{\mathrm{resource}} &: \text{budget boundary} \\
\partial_{\mathrm{semantic}} &: \text{meaning boundary} \\
\partial_{\mathrm{physical}} &: \text{substrate boundary} \\
\partial_{\mathrm{security}} &: \text{authority boundary}
\end{aligned}
}
\]

---

# Sector Classification

\[
\boxed{
\begin{aligned}
S_{\mathrm{safe}} &: \text{stable sector} \\
S_{\mathrm{fragile}} &: \text{near-boundary sector} \\
S_{\mathrm{irreversible}} &: \text{non-reconstructable sector} \\
S_{\mathrm{quarantine}} &: \text{uncertain sector} \\
S_{\mathrm{canonical}} &: \text{promotion-grade sector}
\end{aligned}
}
\]

---

# Domain-Specific Interpretations

## CTRL
\[
\text{CohBit} = \text{proof-repair persistence atom}
\]

## AIR  
\[
\text{CohBit} = \text{admissible perception/release atom}
\]

## PhaseLoom
\[
\text{CohBit} = \text{memory-continuation atom}
\]

## Physical Controller
\[
\text{CohBit} = \text{safe physical transition atom}
\]

## Legal
\[
\text{CohBit} = \text{legally admissible decision atom}
\]

---

# Implementation Priority

To implement this APT-CohBit synthesis, priority order:

1. **AptCohBit struct** - Extend existing CohBit with new fields
2. **Promotion gate** - Implement promotion_apt_cohbit() function
3. **Boundary classification** - Add boundary awareness
4. **Sector tracking** - Add sector classification  
5. **Irreversibility flag** - Add irreversibility tracking
6. **Maintenance checks** - Add metabolism verification
7. **Semantic signatures** - Add observer-relative meaning

---

# Gap from Current Implementation

| Component | Current Status | APT-CohBit Target |
|-----------|----------------|------------------|
| CohBit | Basic fields | AptCohBit extended |
| Boundary | Not tracked | Required |
| Sector | Not tracked | Required |
| Irreversibility | Not tracked | Required |
| Maintenance | Not tracked | Required |
| Semantic | Not tracked | Required |

This specification is a target for future implementation.