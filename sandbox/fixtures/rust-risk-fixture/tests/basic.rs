// Test file for rust-risk-fixture.
// These patterns are expected in test code and should receive P2/P3 priority,
// not P0/P1. They verify the scanner correctly distinguishes test context.

#[test]
fn test_panic() {
    // Expected test panic — should be P2 (high severity in test code)
    panic!("test panic is intentional");
}

#[test]
fn test_unwrap() {
    // Expected test unwrap — should be P3
    let val: Option<i32> = Some(42);
    assert_eq!(val.unwrap(), 42);
}

#[test]
fn test_todo() {
    // Expected test todo — should be P2
    todo!("test not yet written");
}