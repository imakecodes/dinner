# Dinner Chef AI - Agent & Developer Guide

## 1. Project Overview
"Dinner?" is an AI-powered culinary assistant designed to solve decision fatigue and minimize food waste. It generates recipes based on available pantry items, dietary restrictions of household members, and the user's creative desires.

## 2. Technology Stack
- **Framework**: Next.js 15+ (App Router)
- **Database**: MySQL (via Prisma ORM)
- **Styling**: Tailwind CSS
- **AI Integration**: Google Gemini 1.5 Pro via `@google/genai`
- **Testing**: Jest, React Testing Library, `user-event`
- **Containerization**: Docker (Multi-stage, distroless+shell for production)

## 3. Domain Model & Architecture
The application is built around the concept of a **Kitchen** (formerly House).

- **Kitchen**: The central tenant. All data (Recipes, Pantry, Shopping List) is scoped to a specific Kitchen ID.
- **KitchenMember**: Represents a person in the kitchen. Stores:
    - **Demographics**: Name, Email (for invites).
    - **Dietary Preferences**: Restrictions (Allergies), Likes, Dislikes.
- **Recipe**: A culinary creation.
    - Stores structured `ingredients` and relational `shoppingItems`.
    - `step_by_step` instructions stored as JSON.
- **Pantry & Shopping List**:
    - **PantryItem**: Items available in stock.
    - **ShoppingItem**: Items needed for purchase. Can be "checked" to replenish the Pantry.

## 4. Agent Personas (Services)
The logic is distributed across specialized "Agents" (Simulated in `geminiService.ts`):
- **Executive Chef**: Analyzes pantry + preferences to generate recipe concepts.
- **Safety Auditor**: enforcing "Hard Stop" rules for allergies/restrictions.
- **Visual Stylist**: Generates photorealistic images of the final dish.
- **Operations Manager**: Handles automated tasks like migrations and health checks.

## 5. Deployment & Operations
### System Health
- **Endpoint**: `/api/healthz` (Public, No Auth)
- **Behavior**: Verifies DB connectivity. Returns `200 OK` or `500 Error`.
- **Usage**: Use for Kubernetes Liveness/Readiness probes.

### Automated Migrations
- **Docker**: The production image automatically runs `prisma migrate deploy` on startup.
- **Mechanism**: `scripts/start.sh` executes migrations before starting `server.js`.
- **Base Image**: Production uses `node:22-slim` to support these startup scripts.

### Email Service
- **Provider**: SMTP (Resend recommended).
- **Config**: Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`.
- **Function**: Handles invites and transactional messages via `lib/email-service.ts`.

## 6. Development Protocols
### Code Quality
- **Linting**: Run `pnpm run lint` and `pnpm run lint:fix` before committing.
- **Verification**: ALWAYS run `pnpm lint && pnpm build` before marking a task as done.
- **Formatting**: Adhere to the existing code style.

### Testing Standard (Enforced)
- **Minimum Coverage**: **85%** Line Coverage.
- **Command**: `pnpm run test:coverage`
- **Location**: Tests must be co-located in `__tests__` directories mirroring the `app/` or `components/` structure.
- **Tooling**: Use `screen` and `userEvent` for robust integration tests.

### Database Workflow
- **Schema**: Defined in `prisma/schema.prisma`.
- **Changes**:
    1. Modify `schema.prisma`.
    2. Run `pnpm db:push` to sync with the database (Development Only).
    3. Run `pnpm db:generate` to update the Prisma Client.
    4. **Release**: For production changes, YOU MUST generate a migration file using `prisma migrate dev`.
    5. **CRITICAL**: Never automatically reset the database to fix drift. Ask the user first. Never auto-commit after a reset.

### Terminology
- Use **"Kitchen"** instead of "House".
- Use **"Member"** instead of "User" (unless referring to Auth User).

### Localization (I18n)
- **Strict Rule**: ALL user-facing text, including **emails** and **API error messages**, MUST be localized based on the user's preferred language.
- **Implementation**:
    - Use `next-intl` or the custom `server-i18n` helper.
    - Pass `language` context to all service functions (email service, notification service).
    - NEVER default to English without attempting to resolve the user's preference first.
