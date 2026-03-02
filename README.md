# POE2 Genie ⚔️
**Plan smarter builds for your hideout party.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1.x-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blueviolet)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%20API-orange)

**POE2 Genie** is an intelligent, AI-powered Path of Exile 2 companion for building stronger characters. It combines Hideout Party profiles, Stash tracking, Checklist management, and an AI build strategist to turn your available resources into practical, personalized builds.

---

## ✨ Features

### 🧠 AI Build Strategist
*   **Intelligent Crafting**: Creates practical builds from what you *actually* have in your Stash.
*   **Party-Aware**: Respects Party restrictions, preferred archetypes, and setup time preferences.
*   **Cost-Aware Planning**: Supports budget tiers from cheap setups to mirror-level planning.
*   **Global Translation**: Instantly translate any build to your preferred language (English/Portuguese).
*   **Deterministic Fact Validation**: Grounds user terms against canonical PoE2 entities before interpreting mechanics.

### 🏠 Connected Hideouts
*   **Party Sync**: Invite friends to your Hideout and manage shared context.
*   **Shared Management**: Everyone sees the same Stash and Checklist.
*   **Role Control**: Manage permissions with Party Leader and Party Member roles.

### 🛒 Checklist Workflow
*   **Seamless Flow**: Add missing Gear/Gems from builds directly to Checklist.
*   **Status Clarity**: Organize items by Pending and Completed tabs.
*   **Easy Sharing**: Copy filtered Checklist items for WhatsApp or text.

### 📦 Stash Tracking
*   **Track Inventory**: Keep your Stash visibility up to date.
*   **Paste Import**: Import Path of Exile 2 item clipboard content directly into Stash.
*   **Smarter Suggestions**: AI prioritizes what you already have before suggesting new items.

---

## 🛠️ Tech Stack

Built with modern web technologies for performance and scale:

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
*   **Database**: [MariaDB](https://mariadb.org/) & [Prisma ORM](https://www.prisma.io/)
*   **AI Engine**: [Google Gemini API](https://deepmind.google/technologies/gemini/) (configurable models)
*   **Styling**: [TailwindCSS](https://tailwindcss.com/)
*   **Authentication**: Custom JWT with secure password recovery flow.
*   **Infrastructure**: Docker & Docker Compose ready.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Docker & Docker Compose (for the database)
*   Google Gemini API key

### Quick Start (Development)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/DefRuivo/POE2_Genie.git
    cd POE2_Genie
    ```

2.  **Set up environment**:
    ```bash
    cp .env-sample .env
    # Edit .env with your GEMINI_API_KEY and database credentials
    ```
    Keep `GEMINI_MODEL_FALLBACK` on a `generateContent`-compatible model (recommended: `gemini-2.5-flash`).
    `AI_CONTEXT_FILE_PATH` is optional. If it is unset or points to a missing file, runtime falls back to `.ai/ai-context.template.md`.
    Create `.ai/ai-context.local.md` only when you need local prompt overrides.
    Fact-validation defaults to strict PoE2 mechanics checks (`POE_FACT_VALIDATION_MODE=strict`) and can return `422 gemini.fact_unverified` when critical claims remain unverifiable after one corrective retry. Source outages use `POE_OFFICIAL_SOURCE_CONFLICT_STRATEGY=degrade_warn` by default (best-effort output with explicit uncertainty), or `fail_503` to return `503 gemini.official_sources_unavailable`.
    Critical unresolved user terms now return `422 gemini.term_unverified` in strict mode.
    Tune lookup behavior with `POE_KNOWLEDGE_CACHE_TTL_MIN`, `POE_KNOWLEDGE_FETCH_TIMEOUT_MS`, and `POE_KNOWLEDGE_LOOKUP_MODE` (`snapshot_first`, `snapshot_only`, `online_first`).
    Weekly snapshot controls: `ENABLE_POE_SNAPSHOT_CRON`, `POE_SNAPSHOT_CRON_SCHEDULE`, `POE_SNAPSHOT_MAX_PAGES_PER_RUN`.

3.  **Start the database**:
    ```bash
    docker compose up -d
    ```

4.  **Install dependencies & push schema**:
    ```bash
    pnpm install
    pnpm db:push
    ```
    For production changes, generate/apply Prisma migrations instead of relying on push-only workflows.

5.  **Run the app**:
    ```bash
    pnpm dev
    ```

Visit `http://localhost:3000` to start crafting builds.

---

## 🧾 PoE Evidence Snapshot

The knowledge resolver supports local weekly snapshots to reduce dependence on live source availability.

*   **Snapshot Data**: Stored in Prisma tables `PoeSnapshotRun`, `PoeEntitySnapshot`, and `PoeAliasSnapshot`.
*   **Default Lookup Mode**: `snapshot_first` (local snapshot first, then official providers).
*   **Cron Schedule**: Weekly on Monday at 03:00 by default (`0 3 * * 1`).
*   **Providers**: `poe2db.tw` and `poe2wiki.net`.

---

## 🧭 Canonical Routes

*   `/hideouts`
*   `/party`
*   `/builds`
*   `/stash`
*   `/checklist`

---

## 🔒 Security Checks

Security and CI policy references:

*   [CI Security Checks](docs/ci-security-checks.md)
*   [Canonical Migration Guide](MIGRATION.md)

---

## 🤝 Contributing

We welcome contributions. Whether you're fixing a bug or adding a new build-planning feature, feel free to open a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
