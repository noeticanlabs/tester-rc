import CohBit.Spec
import CohBit.SubstrateGeometry

namespace CohBit

/--
  ### Genesis State
  The initial state from which all committed transitions must originate.
-/
axiom Genesis {X : Type} : X

/-- 
  A CohBit is "Committed" if it belongs to a verified path originating 
  from the Genesis state.
-/
def Committed {X Action Cert Hash : Type} (b : @CohBit X Action Cert Hash) : Prop :=
  ∃ (p : List (@CohBit X Action Cert Hash)), b ∈ p ∧ ∃ (y : X), p ∈ VerifiedPaths Genesis y

/--
  [PROVED] Property S1: Committed implies Verified.
  By definition of VerifiedPaths and PathVerified.
-/
theorem committed_implies_verified
  {X Action Cert Hash : Type}
  (b : @CohBit X Action Cert Hash)
  (h : Committed b) :
  Verified b :=
by
  rcases h with ⟨p, hb_in_p, y, hp_verified⟩
  unfold VerifiedPaths at hp_verified
  exact hp_verified.right.left b hb_in_p

/--
  [PROVED] Property S2: Rejection is side-effect-free.
  If a transition is not verified, it cannot be committed.
-/
theorem rejection_implies_no_state_change
  {X Action Cert Hash : Type}
  (b : @CohBit X Action Cert Hash)
  (h : ¬ Verified b) :
  b.from_state = b.to_state ∨ ¬ Committed b :=
by
  right
  intro h_committed
  have h_v := committed_implies_verified b h_committed
  contradiction

end CohBit
