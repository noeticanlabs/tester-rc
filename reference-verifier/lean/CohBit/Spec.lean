import Mathlib.Data.Rat.Lemmas
import Mathlib.Data.NNRat.Defs

namespace CohBit

/--
### The CohBit Specification
Level 1: Formal Definitions

A CohBit is an atomic certified displacement.
It must satisfy both Admissibility (the Coh law) and Structural integrity.
-/

structure CohBit {X Action Cert Hash : Type} where
  from_state : X
  action : Action
  to_state : X
  cert : Cert
  state_root : Hash
  v_pre : Rat
  v_post : Rat
  spend : Rat
  defect : Rat
  delta_hat : Rat
  risk : Rat
  authority : Rat

/-- Definition 1.1: Computational Mass (M = V + D + R) -/
def ComputationalMass {X Action Cert Hash : Type} (b : @CohBit X Action Cert Hash) : Rat :=
  b.v_pre + b.defect + b.risk

/-- Definition 1.2: Memory Footprint Mass (M_mem = |b|) -/
def MemoryFootprintMass {X Action Cert Hash : Type} (b : @CohBit X Action Cert Hash) : Nat :=
  1 -- Abstract unit size placeholder

/-- Admissibility Predicate (The Core Law)
    v_post + spend ≤ v_pre + defect + authority
    [NOTE] risk is an operational penalty, not a physical budget carrier.
-/
def Admissible {X Action Cert Hash : Type} (b : @CohBit X Action Cert Hash) : Prop :=
  b.v_post + b.spend ≤ b.v_pre + b.defect + b.authority

/-- Structural Integrity Predicate
    All physical quantities must be non-negative, and defect must be bounded by the envelope.
-/
def Structural {X Action Cert Hash : Type} (b : @CohBit X Action Cert Hash) : Prop :=
  0 ≤ b.v_pre ∧ 0 ≤ b.v_post ∧ 0 ≤ b.spend ∧ 0 ≤ b.defect ∧ 0 ≤ b.delta_hat ∧ 0 ≤ b.risk ∧ 0 ≤ b.authority ∧
  b.defect ≤ b.delta_hat

/-- Verified Predicate: The mathematical bouncer. -/
def Verified {X Action Cert Hash : Type} (b : @CohBit X Action Cert Hash) : Prop :=
  Admissible b ∧ Structural b

/-- [TCB] AcceptedCohBit: A bit that has passed mathematical verification. -/
structure AcceptedCohBit {X Action Cert Hash : Type} where
  val : @CohBit X Action Cert Hash
  verified : Verified val

/-- Level 2: Policy and Governance -/

structure Policy where
  max_memory_mass : Option Nat
  max_trace_memory_mass : Option Nat
  max_authority : Rat
  policy_hash : Nat -- Abstract policy identity

/-- Policy Compliance Predicate -/
def PolicyOK {X Action Cert Hash : Type} (b : @CohBit X Action Cert Hash) (p : Policy) : Prop :=
  (match p.max_memory_mass with | some m => MemoryFootprintMass b ≤ m | none => True) ∧
  b.authority ≤ p.max_authority

/-- [TCB] ExecutableCohBit: A bit that has passed BOTH math and policy gates. -/
structure ExecutableCohBit {X Action Cert Hash : Type} (p : Policy) where
  accepted : @AcceptedCohBit X Action Cert Hash
  policy_ok : PolicyOK accepted.val p

/-- 
### The Authorization Law (Theorem)
An ExecutableCohBit structurally implies both mathematical admissibility and 
operational policy compliance.
-/
theorem executable_implies_verified {X Action Cert Hash : Type} (p : Policy) (eb : ExecutableCohBit p) :
  Verified eb.accepted.val :=
  eb.accepted.verified

theorem executable_implies_policy_ok {X Action Cert Hash : Type} (p : Policy) (eb : ExecutableCohBit p) :
  PolicyOK eb.accepted.val p :=
  eb.policy_ok

end CohBit
