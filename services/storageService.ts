import { RecipeRecord, HouseholdMember } from '../types';

/**
 * SERVICE: StorageService
 * Responsável pela persistência dos dados através da API do Next.js.
 * Utiliza o banco de dados configurado no servidor (MySQL ou SQLite).
 */

const API_BASE = '/api';

async function apiRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `Erro na API: ${response.status}`);
  }

  return response.json();
}

export const storageService = {
  // --- Recipes / History ---
  getAllRecipes: async (): Promise<RecipeRecord[]> => {
    const recipes = await apiRequest('/recipes');
    return recipes.map((r: any) => ({
      ...r,
      ingredients_from_pantry: JSON.parse(r.ingredients_from_pantry),
      shopping_list: JSON.parse(r.shopping_list),
      step_by_step: JSON.parse(r.step_by_step),
      createdAt: new Date(r.createdAt).getTime(),
    }));
  },

  saveRecipe: async (recipe: any): Promise<void> => {
    await apiRequest('/recipes', {
      method: 'POST',
      body: JSON.stringify({
        ...recipe,
        ingredients_from_pantry: JSON.stringify(recipe.ingredients_from_pantry),
        shopping_list: JSON.stringify(recipe.shopping_list),
        step_by_step: JSON.stringify(recipe.step_by_step),
      }),
    });
  },

  deleteRecipe: async (id: string): Promise<void> => {
    await apiRequest(`/recipes/${id}`, { method: 'DELETE' });
  },

  toggleFavorite: async (id: string): Promise<void> => {
    await apiRequest(`/recipes/${id}/favorite`, { method: 'PATCH' });
  },

  // --- Household ---
  getHousehold: async (): Promise<HouseholdMember[]> => {
    const members = await apiRequest('/household');
    return members.map((m: any) => ({
      ...m,
      restrictions: JSON.parse(m.restrictions),
      likes: JSON.parse(m.likes),
      dislikes: JSON.parse(m.dislikes),
    }));
  },

  saveMember: async (member: HouseholdMember): Promise<void> => {
    await apiRequest('/household', {
      method: 'POST',
      body: JSON.stringify({
        ...member,
        restrictions: JSON.stringify(member.restrictions),
        likes: JSON.stringify(member.likes),
        dislikes: JSON.stringify(member.dislikes),
      }),
    });
  },

  deleteMember: async (id: string): Promise<void> => {
    await apiRequest(`/household/${id}`, { method: 'DELETE' });
  },

  // --- Pantry ---
  getPantry: async (): Promise<string[]> => {
    return apiRequest('/pantry');
  },

  addPantryItem: async (name: string): Promise<void> => {
    await apiRequest('/pantry', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  removePantryItem: async (name: string): Promise<void> => {
    await apiRequest(`/pantry/${encodeURIComponent(name)}`, { method: 'DELETE' });
  },

  editPantryItem: async (oldName: string, newName: string): Promise<void> => {
    await apiRequest(`/pantry/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName }),
    });
  },

  // --- Suggestions ---
  getTags: async (category: string): Promise<string[]> => {
    return apiRequest(`/tags?category=${category}`);
  },

  saveTag: async (category: string, tag: string): Promise<void> => {
    await apiRequest('/tags', {
      method: 'POST',
      body: JSON.stringify({ category, tag }),
    });
  }
};
