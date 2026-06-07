# CohBit: Atomic Certified Displacements for Directed Proof-Carrying Computation

## 📜 Abstract Specification

A **CohBit** is the smallest certified displacement by which a system is allowed to persist from one state to another.

[
\boxed{
b:x\rightsquigarrow y
}
]

It is not merely a proposed transition. It is an accepted, typed, receipt-valid, verifier-approved displacement satisfying the Coh admissibility law.

---

## 1. State Space

Let $X$ be the state space. A state may represent machine state, program state, physical state, PDE cell state, or certified observable state.

A raw process may propose a transition $x \to y$, but this proposal has no authority until it becomes a verified CohBit.

---

## 2. CohBit Primitive

### Definition 1 — CohBit Candidate
A CohBit candidate is a tuple governed by the **Safety Wedge** ($\mathcal{W}$):
[
\boxed{
b=(\mathcal{W}, \text{ID}, \text{StateRoot}, V_{pre}, V_{post}, \Sigma)
}
]

### The 11-Term Wedge Law
The **Safety Wedge** ($\mathcal{W}$) encapsulates the following fields:
1.  **Version**: Substrate versioning.
2.  **DomainID**: Namespace isolation.
3.  **PolicyHash**: Binding to operational governance.
4.  **FromState**: Source state commitment.
5.  **ActionHash**: The intent/input commitment.
6.  **ToState**: Target state commitment.
7.  **Spend ($s$)**: Potential reduction (energy/gas).
8.  **Defect ($d$)**: Tolerated error/uncertainty.
9.  **PrescribedEnvelope**: Mandatory safety margin.
10. **Authority ($a$)**: Permitted resource injection.
11. **CertificateHash**: Verification proof binding.

The fundamental Admissibility Law is:
[
\boxed{
V_{post} + s \le V_{pre} + d + a
}
]

### Definition 1.1 — Computational Mass
The **Computational Mass** of an atom (or by extension, a state) is:
[
\boxed{
M = V + D + R
}
]
where $V$ is potential, $D$ is defect, and $R$ is localized risk.

This measure captures the verification and storage complexity of the displacement.

> [!IMPORTANT]
> **Canonical Mandate**: $M_{\mathrm{mem}}$ is defined strictly over the byte length of the canonical serialization of the CohBit. Non-canonical encodings are forbidden to ensure mass stability.

### The Dual-Mass Model Canon
[
\boxed{
\textbf{
High-integrity persistence has two masses: computational mass, measuring the verifier-visible burden of a state, and memory footprint mass, measuring the byte-weight of the certified displacement that preserves it.
}
}
]

For a **CohAtom** $A$:
[
\boxed{
M_{\mathrm{comp}}(A) = V(A) + D(A) + R(A)
}
]

[
\boxed{
M_{\mathrm{mem}}(b) = |\mathrm{CanonicalBytes}(b)|
}
]

### 3. Policy Layer: Governance of the Substrate
The **Policy Layer** allows the substrate to govern operational burden beyond formal correctness.

#### 3.1 — Memory Mass Policy
[
\boxed{
M_{\mathrm{mem}}(b) \le B_{\mathrm{mem}}
}
]
[
\boxed{
\sum_{b \in \tau} M_{\mathrm{mem}}(b) \le B_{\mathrm{trace}}
}
]

#### 3.2 — Mass-Aware Solver Objective
The solver objective functional $\mathcal{L}$ now accounts for both physical and informational mass:
[
\boxed{
\mathcal{L}(b) = \alpha_c c(b) + \alpha_{\mathrm{comp}} \Delta M_{\mathrm{comp}} + \alpha_{\mathrm{mem}} M_{\mathrm{mem}}(b)
}
]
where $c(b) = s_b + \widehat{\delta}_b$ is the geometric cost.

> [!IMPORTANT]
> **The Distinction Canon**: The CohBit substrate distinguishes **Mathematical Acceptance** from **Executable Permission**. A CohBit may be formally accepted by the verifier yet rejected by policy if its memory footprint, cumulative trace burden, or mass drift exceeds declared operational budgets.

[
\boxed{
\textbf{Mathematical Acceptance} \neq \textbf{Executable Permission}
}
]

### Definition 2 — Accepted CohBit
A candidate $b$ is an **accepted CohBit** iff:
[
\boxed{
\mathrm{Accepted}(b)
\quad\wedge\quad
\mathrm{PolicyOK}(b).
}
]

### 3.3 — The Bypass Risk & Mitigation
Policies can be bypassed if the runtime couples state commitment only to mathematical acceptance. To mitigate this, the substrate mandates the use of the **Governance Gate** and the following type-safe execution flow:

1. **[CANDIDATE]** `CohBitInput`
2. **[MATHEMATICAL]** `CohBit::new` $\rightarrow$ `AcceptedCohBit`
3. **[OPERATIONAL]** `Policy::authorize` $\rightarrow$ `ExecutableCohBit`
4. **[COMMITMENT]** `Commit(ExecutableCohBit)` $\rightarrow$ `StateChange`

**[MANDATE] Type-Safe Coupling**: No commit path may exist that bypasses the policy. The substrate uses the type system to ensure that only displacements passing both the **Admissibility** gate and the **Policy** gate can reach the commitment boundary.

**[MANDATE] Policy Binding**: The `AcceptedCohBit` must declare the `policy_hash` of the policy it intends to satisfy. The `Policy::authorize` gate enforces that the provided policy matches this declaration.

Equivalently: $b \in \mathcal{B}$ where $\mathcal{B}$ is the set of all accepted displacements.

---

## 3. Critical Distinctions

[
\boxed{
\textbf{proposal} \neq \textbf{transition} \neq \textbf{CohBit}
}
]

1. **Proposal**: $y = S_{\Delta t}(x)$ is only a candidate.
2. **Transition**: $x \to y$ is only a relation.
3. **CohBit**: $b:x\rightsquigarrow y$ is a sealed, verified, receipt-bearing displacement satisfying the Coh law.

The solver does not get to hallucinate "progress" just because it produced a next state.

---

## 4. Defect / Authority Separation

Do not collapse these: $d \neq a$.

- **Defect ($d$)**: Uncertainty, residual, projection slack, tolerated error.
- **Authority ($a$)**: External permitted injection, override budget, granted resource.

The primitive law is:
[
\boxed{
V(y) + s \le V(x) + d + a
}
]
Target potential plus spend must be paid for by source potential, tolerated defect, and explicit authority.

---

## 5. Edge Cost and Geometry

For reviewer-safe directed geometry, we define:
[
\boxed{
c(b) = s_b + \widehat{\delta}_b
}
]
where $\widehat{\delta}_b$ is the envelope defect. Authority is not silently treated as free geometry cost; it belongs in a separate ledger/policy.

### Definition 3 — CohGeometry
$\mathcal{G}_{\mathrm{Coh}} = (X, \mathcal{B})$ is the directed graph/category of permitted persistence.

### Definition 4 — Directed Coh Distance
[
\boxed{
d_{\mathrm{Coh}}(x,y) = \inf_{\tau:x\rightsquigarrow y} \sum_{b\in\tau} c(b)
}
]
If no CohPath exists, $d_{\mathrm{Coh}}(x,y) = +\infty$.

---

## 6. Theorem Stack

### Lemma 1 — Accepted CohBits satisfy the Coh Law
By definition of $\mathcal{B}$, every accepted CohBit satisfies the admissibility inequality.

### Theorem 1 — Directed Lawvere Geometry
$(X, d_{\mathrm{Coh}})$ is an extended directed Lawvere pseudometric space, satisfying:
1. **Identity**: $d_{\mathrm{Coh}}(x,x) = 0$.
2. **Triangle Inequality**: $d_{\mathrm{Coh}}(x,z) \le d_{\mathrm{Coh}}(x,y) + d_{\mathrm{Coh}}(y,z)$.

### Theorem 2 — Safety / Persistence Separation
Safety (invalid displacements cannot commit) is a negative property. Persistence (an accepted outgoing displacement exists) is an existential property. A system may halt safely if $F(x) = \emptyset$ without violating safety.

### Theorem 3 — Governed Composition (Step 9)
For a trajectory $\tau = \{b_1, b_2, \dots, b_n\}$, the **Composition Matrix** ($\mathcal{M}$) allows $O(1)$ verification of the entire chain:
[
\boxed{
V(y_n) + \sum s_i \le V(x_1) + \sum d_i + \sum a_i
}
]
This ensures that recursive aggregation preserves the global admissibility law without needing to verify intermediate states after composition.

### 6.1 — Layer 7 Persistence Gate
Promotion to the canonical substrate requires satisfying the **Persistence Slack** ($\epsilon$):
[
\boxed{
\epsilon = V_{pre} + d + a - (V_{post} + s) > C_{\mathrm{recon}}
}
]
where $C_{\mathrm{recon}}$ is the mandatory reconstruction cost. This ensures the state remains persistent even under catastrophic defect propagation.

---

## 7. Solver Specification

A certified solver operates only over the set of admissible displacements $\mathcal{B}_x$. If $\mathcal{B}_x = \emptyset$, the solver must return `None` (Safe Halt). Otherwise, a cost-minimizing solver selects:
[
\boxed{
b^\star \in \arg\min_{b\in\mathcal{B}_x} c(b)
}
]

---

## 8. Receipt Specification

A receipt $R$ must deterministically bind source, target, spend, defect, authority, and verifier evidence. Without deterministic receipt identity, the geometry becomes "garbage soup with a checksum sticker."

---

## 9. Test Obligations

The implementation must pass the following property tests:
- `rejects_unauthorized_potential_creation`
- `accepts_exact_boundary_coh_law`
- `solver_returns_none_on_empty_future_set`
- `solver_verifies_before_optimizing`
- `committed_implies_verified`
- `receipt_hash_is_deterministic`
- `directed_triangle_inequality_holds`
- `path_accounting_telescopes`

---

## 10. References: Theoretical Foundations

The formal axioms and operational calculus for CohBit are derived from the following canonical theoretical foundations, included in this release:

1. **APT (Action-Potential-Trace) Axioms**:
   - [Layer 0](docs/foundations/APT_Layer0_Publication.pdf): The ground-truth formalization.
   - [Layer 0.5](docs/foundations/APT_Layer0_5_Extended_Publication_Grade_v2.pdf): Bridging to discrete state-carrying substrates.
   - [Layer 1](docs/foundations/APT_Layer1_Full_Publication_Grade_v3.pdf): Operational calculus and trajectory stability.

2. **Unified Coh Architecture**:
   - [Coh V1-V4](docs/foundations/Coh_V1_V4_Unified_Complete_Release.pdf): The complete architectural synthesis of the proof-carrying substrate.