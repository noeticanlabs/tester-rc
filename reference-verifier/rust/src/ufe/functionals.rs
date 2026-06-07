use num_rational::Rational64;
use crate::ufe::StateSpace;

/// [PROVED] Potential functional V: X -> R
pub trait Potential<S: StateSpace> {
    fn potential(&self, state: &S) -> Rational64;
}

/// [PROVED] Risk/Danger functional R: X -> R+
pub trait Risk<S: StateSpace> {
    fn risk(&self, state: &S) -> Rational64;
}

/// [PROVED] Defect functional D: X x X -> R+
pub trait Defect<S: StateSpace> {
    fn defect(&self, from: &S, to: &S) -> Rational64;
}

/// [PROVED] Cost functional C: X x X -> R+
pub trait Cost<S: StateSpace> {
    fn cost(&self, from: &S, to: &S) -> Rational64;
}

/// [PROVED] Admissibility margin m_A: X x X -> R
pub trait Margin<S: StateSpace> {
    fn margin(&self, from: &S, to: &S) -> Rational64;
}
