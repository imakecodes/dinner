---
trigger: always_on
glob:
description: Agent rules for POE2 Genie development
---

# Agent Rules

> [!IMPORTANT]
> **Always follow these rules when working on POE2 Genie.**

## Code Quality & Testing
- **Test Coverage**: Maintain a minimum of **85% code coverage** for the project.
- **Unit Tests**: All new components and services must be accompanied by unit tests.
- **Testing Stack**: Use Jest and React Testing Library.
- **Test Files**: Co-located in `__tests__` directories mirroring the source structure.
- **Running Tests**: Use `pnpm run test:coverage` to verify coverage.

## Coding Standards
- **UI/UX**: Prioritize "Wow" factor and premium aesthetics.
- **Strict Typing**: No `any` types unless absolutely necessary.
- **Structure**: Follow the existing feature-based folder structure.
- **Linting**: Always run `pnpm run lint` and `pnpm run lint:fix` before committing.
- **Verification**: ALWAYS run `pnpm lint && pnpm build` before marking a task as done.

## Database Safety
- **NO AUTOMATED RESETS**: Never reset the database automatically. If a migration requires a reset (e.g., due to drift), STOP and ask for user permission.
- **NO AUTO-COMMIT**: Never automatically commit and push changes after a database reset or significant schema change without user verification.
- **Migration Files**: Always check for missing migration files before deploying to production.
- **Schema Changes**: 
  1. Modify `prisma/schema.prisma`
  2. Run `pnpm db:push` to sync with the database (Development Only)
  3. Run `pnpm db:generate` to update the Prisma Client
  4. **Release**: For production changes, YOU MUST generate a migration file using `prisma migrate dev`

## Terminology
- Use **"Hideout"** instead of "Kitchen"
- Use **"Party Member"** instead of "User" (unless referring to Auth User)
- Use **"Build"** instead of "Recipe"
- Use **"Stash"** instead of "Pantry"
- Use **"Checklist"** instead of "Shopping List"

## Localization (I18n)
- **Strict Rule**: ALL user-facing text, including **emails** and **API error messages**, MUST be localized based on the user's preferred language.
- **Implementation**:
  - Use `next-intl` or the custom `server-i18n` helper.
  - Pass `language` context to all service functions (email service, notification service).
  - NEVER default to English without attempting to resolve the user's preference first.
