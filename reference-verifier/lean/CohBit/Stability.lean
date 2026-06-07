import CohBit.Spec
import Mathlib.Tactic

namespace CohBit

private theorem chain_stability_values {X Action Cert Hash : Type} (chain : List (@CohBit X Action Cert Hash))
  (h_nonempty : chain ≠ [])
  (h_cont_val : ∀ (i : ℕ) (h : i + 1 < chain.length),
    (chain.get ⟨i, Nat.lt_of_succ_lt h⟩).v_post = (chain.get ⟨i + 1, h⟩).v_pre)
  (h_verified : ∀ b ∈ chain, Verified b) :
  (chain.getLast h_nonempty).v_post + (chain.map (fun b => b.spend)).sum ≤
  (chain.head h_nonempty).v_pre + (chain.map (fun b => b.defect)).sum + (chain.map (fun b => b.authority)).sum :=
by
  induction chain generalizing h_nonempty h_cont_val h_verified with
  | nil =>
      contradiction
  | cons b tail ih =>
      cases tail with
      | nil =>
          simpa using (h_verified b (by simp)).left
      | cons b' tail' =>
          have htail_nonempty : b' :: tail' ≠ [] := by
            simp
          have hbridge : b.v_post = b'.v_pre := by
            simpa using h_cont_val 0 (by simp)
          have hb : b.v_post + b.spend ≤ b.v_pre + b.defect + b.authority := by
            exact (h_verified b (by simp)).left
          have htail_cont_val : ∀ (i : ℕ) (h : i + 1 < (b' :: tail').length),
              ((b' :: tail').get ⟨i, Nat.lt_of_succ_lt h⟩).v_post = ((b' :: tail').get ⟨i + 1, h⟩).v_pre := by
            intro i h
            have h' : i + 1 + 1 < (b :: b' :: tail').length := by
              simpa using Nat.succ_lt_succ h
            simpa using h_cont_val (i + 1) h'
          have htail_verified : ∀ bit ∈ (b' :: tail'), Verified bit := by
            intro bit hbit
            exact h_verified bit (by simp [hbit])
          set spendTail : Rat := ((b' :: tail').map (fun bit => bit.spend)).sum
          set defectTail : Rat := ((b' :: tail').map (fun bit => bit.defect)).sum
          set authTail : Rat := ((b' :: tail').map (fun bit => bit.authority)).sum
          have htail := ih htail_nonempty htail_cont_val htail_verified
          have htail' :
              ((b' :: tail').getLast htail_nonempty).v_post + spendTail ≤ b.v_post + defectTail + authTail := by
            simpa [spendTail, defectTail, authTail, hbridge] using htail
          have hcombined :
              ((b' :: tail').getLast htail_nonempty).v_post + (b.spend + spendTail) ≤
              b.v_pre + (b.defect + defectTail) + (b.authority + authTail) := by
            linarith
          simpa [spendTail, defectTail, authTail, add_assoc, add_left_comm, add_comm] using hcombined

/--
### Theorem: Trajectory Stability
A verified chain preserves the cumulative coherence budget.
Telescoping sum proof.
-/
theorem chain_stability {X Action Cert Hash : Type} (chain : List (@CohBit X Action Cert Hash))
  (h_nonempty : chain ≠ [])
  (h_cont_state : ∀ (i : ℕ) (h : i + 1 < chain.length),
    (chain.get ⟨i, Nat.lt_of_succ_lt h⟩).to_state = (chain.get ⟨i + 1, h⟩).from_state)
  (h_cont_val : ∀ (i : ℕ) (h : i + 1 < chain.length),
    (chain.get ⟨i, Nat.lt_of_succ_lt h⟩).v_post = (chain.get ⟨i + 1, h⟩).v_pre)
  (h_verified : ∀ b ∈ chain, Verified b) :
  (chain.getLast h_nonempty).v_post + (chain.map (fun b => b.spend)).sum ≤
  (chain.head h_nonempty).v_pre + (chain.map (fun b => b.defect)).sum + (chain.map (fun b => b.authority)).sum :=
by
  exact chain_stability_values chain h_nonempty h_cont_val h_verified

/--
### Theorem: Forward Invariance
If the cumulative authority and defect are bounded by B, the valuation remains in a safe set.
-/
theorem forward_invariance {X Action Cert Hash : Type} (chain : List (@CohBit X Action Cert Hash))
  (h_nonempty : chain ≠ [])
  (h_cont_val : ∀ (i : ℕ) (h : i + 1 < chain.length),
    (chain.get ⟨i, Nat.lt_of_succ_lt h⟩).v_post = (chain.get ⟨i + 1, h⟩).v_pre)
  (h_verified : ∀ b ∈ chain, Verified b)
  (C B : Rat)
  (h_start : (chain.head h_nonempty).v_pre ≤ C)
  (h_budget : (chain.map (fun b => b.defect)).sum + (chain.map (fun b => b.authority)).sum ≤ B) :
  (chain.getLast h_nonempty).v_post ≤ C + B :=
by
  have hstable := chain_stability_values chain h_nonempty h_cont_val h_verified
  have h_spend_nonneg : 0 ≤ (chain.map (fun b => b.spend)).sum := by
    refine List.sum_nonneg ?_
    intro bit hbit
    exact (h_verified bit hbit).right.2.2.1
  linarith

end CohBit
