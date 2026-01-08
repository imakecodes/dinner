---
description: Run full verification (lint, test, build) and fix any issues found.
---

# Verify and Fix Workflow

Use this workflow to ensure the project is in a healthy state after significant changes.

## Steps

1. **Linting**
   - Run `pnpm run lint`.
   - If linting fails, analyze the errors and fix them.
   - Repeat until linting passes.

2. **Testing**
   - Run `pnpm run test`.
   - If tests fail, analyze the failures and fix the code or the tests as appropriate.
   - Repeat until all tests pass.

3. **Building**
   - Run `pnpm run build`.
   - Ensure the production build completes without errors.

4. **Final Check**
   - Verify that all changes are reflected in the codebase and that no regressions were introduced.
