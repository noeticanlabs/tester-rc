import Lake
open Lake DSL

package «cohbit» {
  -- add package configuration options here
  description := "Formal formalization of the CohBit primitive and stability laws."
}

lean_lib CohBit where
  -- add library configuration options here

require mathlib from git
  "https://github.com/leanprover-community/mathlib4.git"
