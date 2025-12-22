
import { RecipeRecord } from '../types';

const STORAGE_KEY = 'dinner_recipes_db';
const TAGS_KEY = 'dinner_tags_suggestions';

export const storageService = {
  getAll: (): RecipeRecord[] => {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  save: (recipe: RecipeRecord): void => {
    const all = storageService.getAll();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([recipe, ...all]));
  },

  delete: (id: string): void => {
    const all = storageService.getAll();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all.filter(r => r.id !== id)));
  },

  toggleFavorite: (id: string): void => {
    const all = storageService.getAll();
    const updated = all.map(r => r.id === id ? { ...r, isFavorite: !r.isFavorite } : r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  },

  // Tag Suggestions Logic
  getTags: (category: 'restrictions' | 'likes' | 'dislikes'): string[] => {
    const data = localStorage.getItem(TAGS_KEY);
    const tags = data ? JSON.parse(data) : { restrictions: [], likes: [], dislikes: [] };
    return tags[category] || [];
  },

  saveTag: (category: 'restrictions' | 'likes' | 'dislikes', tag: string): void => {
    const data = localStorage.getItem(TAGS_KEY);
    const tags = data ? JSON.parse(data) : { restrictions: [], likes: [], dislikes: [] };
    if (!tags[category].includes(tag)) {
      tags[category].push(tag);
      localStorage.setItem(TAGS_KEY, JSON.stringify(tags));
    }
  }
};
