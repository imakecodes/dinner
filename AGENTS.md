# POE2 Genie - Agent & Developer Guide

> [!IMPORTANT]
> **Always consider and follow the rules defined in @[.agent/rules.md] in addition to this guide.**

## 1. Project Overview
"POE2 Genie" is an AI-powered Path of Exile 2 build strategist designed to solve decision fatigue and optimize build planning. It generates practical builds based on available stash items, party member restrictions/preferences, and the user's creative desires.

## 2. Technology Stack
- **Framework**: Next.js 16+ (App Router)
- **Database**: MySQL/MariaDB (via Prisma ORM)
- **Styling**: Tailwind CSS with custom PoE2 design system
- **AI Integration**: Google Gemini 2.5 Pro via `@google/genai`
- **Testing**: Jest, React Testing Library, `user-event`
- **Containerization**: Docker (Multi-stage, distroless+shell for production)

## 3. Domain Model & Architecture
The application is built around the concept of a **Hideout** (formerly Kitchen).

- **Hideout**: The central tenant. All data (Builds, Stash, Checklist) is scoped to a specific Hideout ID.
- **PartyMember**: Represents a player in the hideout. Stores:
    - **Profile**: Name, Email (for invites).
    - **Build Preferences**: Restrictions (Avoided Mechanics), Likes, Dislikes.
- **Build**: A Path of Exile 2 character build.
    - Stores structured `gear_gems` and relational `build_items`.
    - `build_steps` instructions stored as JSON array.
- **Stash & Checklist**:
    - **StashItem**: Items available in player's stash.
    - **BuildItem**: Items needed for the build. Can be "checked" when acquired.

## 4. Agent Personas (Services)
The logic is distributed across specialized "Agents":
- **Build Strategist**: Analyzes stash + party preferences to generate build concepts.
- **Fact Auditor**: Enforces "Hard Stop" rules for PoE2 mechanics verification.
- **Knowledge Resolver**: Handles PoE2 entity lookup and fact validation.
- **Translation Manager**: Manages multi-language build translation.
- **Snapshot Manager**: Handles automated PoE2 knowledge snapshots.

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
- Use **"Hideout"** instead of "Kitchen".
- Use **"Build"** instead of "Recipe".
- Use **"Stash"** instead of "Pantry".
- Use **"Checklist"** instead of "Shopping List".
- Use **"Party Member"** instead of "Kitchen Member".
- Use **"Gear/Gem"** instead of "Ingredient".
- Use **"Build Archetype"** instead of "Meal Type".
- Use **"Build Cost Tier"** instead of "Difficulty".

### Localization (I18n)
- **Strict Rule**: ALL user-facing text, including **emails** and **API error messages**, MUST be localized based on the user's preferred language.
- **Implementation**:
    - Use the custom `server-i18n` helper.
    - Pass `language` context to all service functions (email service, notification service).
    - NEVER default to English without attempting to resolve the user's preference first.

## 7. PoE2-Specific Architecture
### Knowledge System
- **Evidence Pack**: Structured PoE2 facts verified against official sources (poe2db.tw, poe2wiki.net)
- **Snapshot System**: Weekly caching of PoE2 entity data for offline operation
- **Fact Validation**: Automatic verification of build mechanics claims
- **Term Grounding**: Mapping user terms to canonical PoE2 entities

### Build Generation Pipeline
1. **Term Grounding**: Validate all user-provided PoE2 terms
2. **Evidence Collection**: Gather verified facts about terms
3. **AI Generation**: Generate build with Gemini API
4. **Domain Validation**: Ensure output is PoE2 domain (not culinary)
5. **Fact Verification**: Validate all mechanics claims
6. **Correction Loop**: Auto-correct invalid claims
7. **Output Sanitization**: Final quality checks

### Error Handling
- **422 gemini.domain_mismatch**: Generated content outside PoE2 domain
- **422 gemini.fact_unverified**: Unverifiable PoE2 mechanics claims
- **422 gemini.term_unverified**: Critical user terms not verified
- **503 gemini.official_sources_unavailable**: PoE2 sources unavailable
- **429 gemini.quota_exceeded**: Gemini API quota exceeded
- **503 gemini.model_unavailable**: No Gemini model available
