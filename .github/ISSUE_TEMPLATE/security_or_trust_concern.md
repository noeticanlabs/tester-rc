---
name: Security or Trust Concern
about: Report a security issue or trust boundary concern
title: "[SECURITY] "
labels: ["security", "trust-boundary", "tester-rc"]
assignees: []
---

## Environment

- **OS:** 
- **Node version:** (`node -v`) 

## Concern Summary

What is the security or trust concern?

## Category

- [ ] File mutation (files changed without authorization)
- [ ] Network access (unexpected network call)
- [ ] Data leak (source code or data appeared somewhere unexpected)
- [ ] Profile bypass (command allowed that should have been denied)
- [ ] Receipt integrity (receipt hash didn't match expected)
- [ ] Persistence concern (data written where it shouldn't be)
- [ ] Other (describe below)

## Steps to Reproduce

1. 
2. 
3. 

## Evidence

```
Paste terminal output, logs, or file content that demonstrates the concern
```

## Did Source Files Change?

- [ ] Yes (list changed files and how you verified) 
- [ ] No
- [ ] Unknown

## Severity Assessment (your opinion)

- [ ] Critical — immediate trust boundary violation
- [ ] High — likely trust boundary violation
- [ ] Medium — possible concern, needs investigation
- [ ] Low — minor concern or observation