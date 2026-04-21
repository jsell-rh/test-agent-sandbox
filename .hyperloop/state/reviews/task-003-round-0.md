---
task_id: task-003
round: 0
role: implementer
verdict: pass
---

## Summary

Implemented the two Domain Errors specified in `specs/domain-model.spec.md` using strict TDD.

### What was done

**Tests written first (RED → GREEN)**

- `src/domain/errors/__tests__/DomainErrors.test.ts` — 20 tests covering both error classes

**Implementation**

- `src/domain/errors/InvalidTitleError.ts` — raised when a `TodoTitle` is blank or exceeds 500 characters. Extends `Error`, sets `name` to `'InvalidTitleError'`, preserves prototype chain via `Object.setPrototypeOf`.
- `src/domain/errors/TodoNotFoundError.ts` — raised when a `TodoId` references a non-existent `Todo`. Same structure; message includes the offending `todoId`.
- `src/domain/errors/index.ts` — barrel export for both error classes.

**Project scaffolding**

- `package.json`, `tsconfig.json`, `jest.config.js` — TypeScript + Jest (ts-jest) setup, mirroring task-001.

### Test results

```
Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

`tsc --noEmit` exits cleanly.

### Spec coverage

| Spec requirement | Status |
|---|---|
| `InvalidTitleError` exists and is throwable | ✅ |
| `InvalidTitleError` name is `'InvalidTitleError'` | ✅ |
| `InvalidTitleError` message includes reason | ✅ |
| `instanceof Error` works (prototype chain) | ✅ |
| `TodoNotFoundError` exists and is throwable | ✅ |
| `TodoNotFoundError` name is `'TodoNotFoundError'` | ✅ |
| `TodoNotFoundError` message includes the `todoId` | ✅ |
| `instanceof Error` works (prototype chain) | ✅ |
| The two errors are not interchangeable | ✅ |
