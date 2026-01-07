
# Dinner? 🥗
**Eliminate decision fatigue and cook smarter.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-blueviolet)
![Gemini AI](https://img.shields.io/badge/AI-Gemini%201.5-orange)

**Dinner?** is an intelligent, AI-powered kitchen assistant designed to solve the eternal question: *"What are we eating today?"*. It combines a digital pantry, collaborative shopping lists, and a powerful AI Chef to turn your available ingredients into delicious, personalized recipes.

---

## ✨ Features

### 👨‍🍳 AI Executive Chef
*   **Intelligent Generation**: Creates unique recipes based on what you *actually* have in your pantry.
*   **Personalized**: Respects dietary restrictions, meal types (Quick, Fancy, Snack), and prep time preferences.
*   **Chef Mode**: Step-by-step interactive cooking guide to keep you on track.
*   **Global Kitchen**: Instantly translate any recipe into your preferred language (English/Portuguese).

### 🏠 Connected Kitchens
*   **Family Sync**: Invite family members or roommates to your digital kitchen.
*   **Shared Management**: Everyone sees the same pantry and shopping list.
*   **Role Control**: Manage permissions with Admin and Member roles.

### 🛒 Smart Shopping
*   **Seamless Workflow**: Add ingredients from recipes directly to your shopping list.
*   **Smart Sorting**: Organize items by category or recipe source.
*   **Easy Sharing**: Copy your filtered list to clipboard to share via WhatsApp or text.

### 🍱 Digital Pantry
*   **Track Inventory**: Know exactly what's in your fridge without opening the door.
*   **Minimize Waste**: The AI prioritizes ingredients you already have, saving you money and reducing food waste.

---

## 🛠️ Tech Stack

Built with modern web technologies for performance and scale:

*   **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions)
*   **Database**: [MariaDB](https://mariadb.org/) & [Prisma ORM](https://www.prisma.io/)
*   **AI Engine**: [Google Gemini 1.5](https://deepmind.google/technologies/gemini/) (Pro & Flash)
*   **Styling**: [TailwindCSS](https://tailwindcss.com/)
*   **Authentication**: Custom JWT with secure password recovery flow.
*   **Infrastructure**: Docker & Docker Compose ready.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+
*   Docker & Docker Compose (for the database)
*   Google Gemini API Key

### Quick Start (Development)

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/imakecodes/dinner.git
    cd dinner
    ```

2.  **Set up environment**:
    ```bash
    cp .env.example .env
    # Edit .env with your GEMINI_API_KEY and database credentials
    ```

3.  **Start the database**:
    ```bash
    docker compose up -d
    ```

4.  **Install dependencies & push schema**:
    ```bash
    pnpm install
    pnpm db:push
    ```

5.  **Run the app**:
    ```bash
    pnpm dev
    ```

Visit `http://localhost:3000` to start cooking!

---

## 🤝 Contributing

We welcome contributions! Whether you're fixing a bug (like our recent UTF-8 encoding improvements!) or adding a new feature (like our new specific recipe filters), feel free to open a Pull Request.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
