import CohBit.Spec

namespace CohBit

/--
### Property P1 — Safe halt on empty future set
If no verified displacement exists from a state, the system must halt.
-/
def FutureSet {X Action Cert Hash : Type} (x : X) (B : Set (@CohBit X Action Cert Hash)) : Set (@CohBit X Action Cert Hash) :=
  { b ∈ B | b.from_state = x ∧ Verified b }

def SafeHalt {X Action Cert Hash : Type} (x : X) (B : Set (@CohBit X Action Cert Hash)) : Prop :=
  FutureSet x B = ∅

/--
### Property P2 — Persistence iff outgoing accepted CohBit exists
-/
def Persistent {X Action Cert Hash : Type} (x : X) (B : Set (@CohBit X Action Cert Hash)) : Prop :=
  FutureSet x B ≠ ∅

theorem persistence_iff_verified_outgoing
  {X Action Cert Hash : Type}
  (x : X)
  (B : Set (@CohBit X Action Cert Hash)) :
  Persistent x B ↔ ∃ b ∈ B, b.from_state = x ∧ Verified b :=
by
  simp [Persistent, FutureSet]
  rw [Set.ne_empty_iff_nonempty]
  simp [Set.Nonempty]

end CohBit
