# Dinner? | Smart Culinary Assistant

A world-class AI-powered culinary engine designed to combat decision fatigue and food waste while ensuring absolute safety for dietary restrictions.

## Features
- **Intelligent Recipe Generation:** Uses Gemini 3 Pro to create safe recipes based on your pantry.
- **Safety Auditor:** Explains exactly why ingredients were chosen or excluded.
- **Image Generation:** Visualizes your future meal with professional AI photography.
- **Persistent Storage:** Local IndexedDB (via Dexie) for offline-first capabilities.
- **Multi-lingual Support:** English and Portuguese.

## How to Run

1.  **Environment Setup**: Ensure you have an `API_KEY` for Google Gemini API configured in your environment.
2.  **Installation**:
    ```bash
    npm install
    ```
3.  **Development**:
    ```bash
    npm run dev
    ```

## Database Configuration

### SQLite (Current Implementation)
The application uses **Dexie.js** with **IndexedDB**. This provides a persistent, transactional, and relational-like experience inside the browser. It behaves like a local SQLite database, supporting schemas and migrations.

### MySQL (Transitioning to a Backend)
To transition this application to MySQL:
1.  **Environment Variables**: You would typically set a `DATABASE_URL` (e.g., `mysql://user:pass@localhost:3306/dinnerdb`).
2.  **Architecture**: Since MySQL cannot be accessed directly from the browser for security reasons, you would need to implement a thin API layer (Node.js/Express or Next.js API Routes).
3.  **ORM**: We recommend using **Prisma** or **Sequelize**. The schema defined in `services/db.ts` is already structured to be mapped 1:1 to SQL tables.

## Complexity & Prep Time
You can now customize your culinary experience:
- **Difficulty**: Easy, Intermediate, Advanced.
- **Prep Time**: Quick (< 30 min) or Plenty of Time.
