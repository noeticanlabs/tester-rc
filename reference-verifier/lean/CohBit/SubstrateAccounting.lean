import CohBit.Stability

namespace CohBit

/--
### Property A2 — Coh law boundary exactness
Equality is the limit of admissibility.
-/
theorem coh_law_boundary
  {X Action Cert Hash : Type}
  (b : @CohBit X Action Cert Hash)
  (h : b.v_post + b.spend = b.v_pre + b.defect + b.authority) :
  Admissible b :=
by
  unfold Admissible
  rw [h]

/--
### Property A3 — Path accounting telescopes
For a finite sequence of verified CohBits, the cumulative balance must hold.
-/
theorem path_coh_law_telescopes
  {X Action Cert Hash : Type}
  (p : List (@CohBit X Action Cert Hash))
  (h_nonempty : p ≠ [])
  (h_cont : ∀ (i : ℕ) (h : i + 1 < p.length),
    (p.get ⟨i, Nat.lt_of_succ_lt h⟩).v_post = (p.get ⟨i + 1, h⟩).v_pre)
  (h_verified : ∀ b ∈ p, Verified b) :
  (p.getLast h_nonempty).v_post + (p.map (fun b => b.spend)).sum ≤
  (p.head h_nonempty).v_pre + (p.map (fun b => b.defect)).sum + (p.map (fun b => b.authority)).sum :=
by
  exact chain_stability p h_nonempty (by simp) h_cont h_verified

end CohBit
