# Agent Rules

This project enforces high code quality standards.

## Testing
- **Minimum Code Coverage**: The codebase must maintain at least **85%** unit test coverage for lines.
- **Test files**: Co-located in `__tests__` directories mirroring the source structure.
- **Running tests**: Use `pnpm run test:coverage` to verify coverage.

## Database Safety
- **NO AUTOMATED RESETS**: Never reset the database automatically. If a migration requires a reset (e.g., due to drift), STOP and ask for user permission.
- **NO AUTO-COMMIT**: Never automatically commit and push changes after a database reset or significant schema change without user verification.
- **Migration Files**: Always check for missing migration files before deploying to production.

