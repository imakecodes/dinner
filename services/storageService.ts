
import { RecipeRecord } from '../types';

/**
 * Storage Service - handles data persistence.
 * Currently using LocalStorage, can be migrated to SQLite/Postgres easily.
 */
const STORAGE_KEY = 'dinner_recipes_db';

export const storageService = {
  /**
   * Fetches all stored recipes.
   */
  getAll: (): RecipeRecord[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Saves a new recipe to the database.
   */
  save: (recipe: RecipeRecord): void => {
    const all = storageService.getAll();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([recipe, ...all]));
  },

  /**
   * Deletes a recipe by ID.
   */
  delete: (id: string): void => {
    const all = storageService.getAll();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(r => r.id !== id)));
  },

  /**
   * Toggles the favorite status of a recipe.
   */
  toggleFavorite: (id: string): void => {
    const all = storageService.getAll();
    const updated = all.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  /**
   * Updates a recipe record (e.g., adding an image).
   */
  update: (id: string, updates: Partial<RecipeRecord>): void => {
    const all = storageService.getAll();
    const updated = all.map(r => r.id === id ? { ...r, ...updates } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};
