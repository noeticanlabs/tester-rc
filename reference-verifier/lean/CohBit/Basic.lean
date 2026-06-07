import CohBit.Spec

namespace CohBit

/--
### CohBit Structural Components
Formalizes the Nine-Part Tuple in Lean 4.
-/
/--
### State Stability Condition
A state x is stable if it admits an admissible self-loop.
-/
def is_stable {X Action Cert Hash : Type} (x : X) (bit : @CohBit X Action Cert Hash) : Prop :=
  bit.from_state = x ∧ bit.to_state = x

def is_strongly_stable {X Action Cert Hash : Type} (x : X) (bit : @CohBit X Action Cert Hash) : Prop :=
  is_stable x bit ∧ bit.spend < bit.defect

/--
### CohAtom: The State Algebra
A state x equipped with its local transition algebra.
-/
structure CohAtom (X Action Cert Hash : Type) where
  state : X
  bits : List (@CohBit X Action Cert Hash)
  all_from_state : ∀ b ∈ bits, b.from_state = state

/--
### Theorem: Identity CohBit Exists
Every state x has an admissible identity transition.
-/
theorem identity_exists {X Action Cert Hash : Type} (x : X) (v : Rat) (h_nonneg : 0 ≤ v) (cert : Cert) (id_action : Action) (root : Hash) :
  ∃ (bit : @CohBit X Action Cert Hash),
    bit.from_state = x ∧
    bit.to_state = x ∧
    bit.v_pre = v ∧
    bit.v_post = v ∧
    bit.spend = 0 ∧
    bit.defect = 0 ∧
    bit.delta_hat = 0 ∧
    bit.authority = 0 ∧
    Verified bit :=
by
  refine ⟨{
    from_state := x,
    action := id_action,
    to_state := x,
    cert := cert,
    state_root := root,
    v_pre := v,
    v_post := v,
    spend := 0,
    defect := 0,
    delta_hat := 0,
    authority := 0
  }, rfl, rfl, rfl, rfl, rfl, rfl, rfl, rfl, ?_⟩
  simp [Verified, Admissible, Structural, h_nonneg]

end CohBit
