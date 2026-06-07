// rust-guarded-unwrap-fixture
// Proves: guarded unwrap is downgraded to P2/P3.
// unwrap() with nearby if_let/match/is_some guard should NOT be P0.

pub fn guarded_if_let(input: Option<String>) -> String {
    if let Some(val) = input { val } else { String::from("default") }
}

pub fn guarded_match(input: Result<i32,&str>) -> i32 {
    match input { Ok(v) => v, Err(_) => 0 }
}

pub fn guarded_unwrap_or(input: Option<i32>) -> i32 {
    input.unwrap_or(42)
}

pub fn guarded_is_some(input: Option<String>) -> String {
    if input.is_some() { input.unwrap() } else { String::from("default") }
}

pub fn unguarded_unwrap(input: Option<String>) -> String {
    input.unwrap()
}
