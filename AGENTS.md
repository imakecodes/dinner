# Dinner? - Culinary Intelligence Agents

This project utilizes a multi-layered reasoning approach powered by Gemini 3 Pro to solve the "what's for dinner" dilemma while ensuring absolute food safety.

## 1. The Executive Chef Agent
**Role:** Recipe Creation & Creative Synthesis.
**Reasoning Process:**
- **Pantry Analysis:** Scans the available ingredients and prioritizes their use to minimize waste.
- **Preference Matching:** Cross-references the likes and dislikes of all active diners to find a "Culinary Sweet Spot."
- **Cultural Adaptation:** Adjusts the recipe style based on the requested meal type (Appetizer, Main, Dessert, or Snack) and complexity settings.

## 2. The Safety Auditor Agent
**Role:** Critical Risk Assessment.
**Reasoning Process:**
- **Restriction Aggregation:** Compiles a master list of all medical restrictions and allergies for the selected group.
- **Ingredient Filtering:** Performs a "Hard Stop" check. If a pantry item or a required ingredient violates a safety rule (e.g., Peanut Allergy vs. Peanuts in pantry), it is strictly excluded.
- **Explanation Logic:** Provides the `analysis_log`, explaining why certain ingredients were skipped and how the substitution maintains safety.

## 3. The Visual Stylist Agent
**Role:** Multi-modal Image Generation.
**Reasoning Process:**
- **Contextual Prompting:** Converts the generated recipe title into a high-fidelity photographic prompt.
- **Aesthetic Control:** Uses Gemini's image generation capabilities to produce professional, magazine-quality culinary photography that matches the dish's description.
