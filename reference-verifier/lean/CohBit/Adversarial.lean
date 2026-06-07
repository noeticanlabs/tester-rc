import CohBit.Spec

namespace CohBit

/--
### Adversarial Equivalence Suite
These examples mirror the Rust `adversarial_cases.json` fixture.
-/

def V_mock (n : Nat) : Nat := n

-- Exact Boundary Accept: 10 -> 12, spend 1, defect 2, auth 1
-- 12 + 1 <= 10 + 2 + 1 => 13 <= 13 (True)
def exactBoundaryBit : CohBit Nat Nat Nat Nat := {
  from_state := 10,
  to_state := 12,
  action := 0,
  cert := 0,
  state_root := 0,
  v_pre := 10,
  v_post := 12,
  spend := 1,
  defect := 2,
  delta_hat := 2,
  risk := 0,
  authority := 1
}

example : Verified exactBoundaryBit := by
  unfold Verified Admissible Structural
  decide

-- Potential Creation Reject: 10 -> 20, spend 1, defect 0, auth 0
-- 20 + 1 <= 10 + 0 + 0 => 21 <= 10 (False)
def potentialCreationBit : CohBit Nat Nat Nat Nat := {
  from_state := 10,
  to_state := 20,
  action := 0,
  cert := 0,
  state_root := 0,
  v_pre := 10,
  v_post := 20,
  spend := 1,
  defect := 0,
  delta_hat := 0,
  risk := 0,
  authority := 0
}

example : ¬ Admissible potentialCreationBit := by
  unfold Admissible
  decide

-- Defect vs Authority: 10 -> 15, spend 0, defect 5, auth 0
-- 15 + 0 <= 10 + 5 + 0 => 15 <= 15 (True)
def defectOnlyBit : CohBit Nat Nat Nat Nat := {
  from_state := 10,
  to_state := 15,
  action := 0,
  cert := 0,
  state_root := 0,
  v_pre := 10,
  v_post := 15,
  spend := 0,
  defect := 5,
  delta_hat := 5,
  risk := 0,
  authority := 0
}

example : Admissible defectOnlyBit := by
  unfold Admissible
  decide

-- Structural Integrity Failure: defect > delta_hat
def badStructuralBit : CohBit Nat Nat Nat Nat := {
  from_state := 10,
  to_state := 10,
  action := 0,
  cert := 0,
  state_root := 0,
  v_pre := 10,
  v_post := 10,
  spend := 0,
  defect := 5,
  delta_hat := 2, -- Oops
  risk := 0,
  authority := 0
}

example : ¬ Structural badStructuralBit := by
  unfold Structural
  decide

/-- 
### Policy Bypass Resistance
A bit can be mathematically verified but operationally rejected.
-/
def validButOversizedBit : CohBit Nat Nat Nat Nat := {
  exactBoundaryBit with
  authority := 100 -- Large authority injection
}

def strictPolicy : Policy := {
  max_memory_mass := none,
  max_trace_memory_mass := none,
  max_authority := 50, -- Cap at 50
  policy_hash := 1
}

example : Verified validButOversizedBit := by
  unfold Verified Admissible Structural
  decide

example : ¬ PolicyOK validButOversizedBit strictPolicy := by
  unfold PolicyOK
  decide

/-- 
[PROOF] No Executable bit can exist for a policy-violating displacement.
-/
theorem cannot_execute_oversized (accepted_bit : @AcceptedCohBit Nat Nat Nat Nat) 
  (h_val : accepted_bit.val = validButOversizedBit) :
  ExecutableCohBit strictPolicy → Empty :=
by
  intro eb
  have h_ok := eb.policy_ok
  rw [h_val] at h_ok
  unfold PolicyOK at h_ok
  simp at h_ok
  -- authority 100 <= max_authority 50 is false
  have h_contra : ¬ (100 : Rat) ≤ 50 := by norm_num
  exact h_contra h_ok.right

end CohBit
