import { RecipeRecord, KitchenMember, PantryItem, ShoppingItem } from '../types';

/**
 * SERVICE: StorageService
 * Responsável pela persistência dos dados. 
 * Tenta se comunicar com a API do servidor (Next.js/Prisma).
 */

const API_BASE = '/api';

async function apiRequest(path: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Endpoint ${path} not found.`);
        return null;
      }
      const errorData = await response.json().catch(() => ({ message: `HTTP Error ${response.status}` }));
      throw new Error(errorData.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error(`API Call failed [${path}]:`, error);
    throw error;
  }
}

export const storageService = {
  // --- Recipes / History ---
  getAllRecipes: async (): Promise<RecipeRecord[]> => {
    const data = await apiRequest('/recipes');
    return data || [];
  },

  getCurrentKitchen: async (): Promise<any> => {
    return await apiRequest('/kitchens');
  },

  joinKitchen: async (code: string): Promise<{ kitchenId: string; name: string }> => {
    return await apiRequest('/kitchens/join', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  },


  saveRecipe: async (recipe: any): Promise<void> => {
    await apiRequest('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  },

  getRecipeById: async (id: string): Promise<RecipeRecord | null> => {
    const data = await apiRequest(`/recipes/${id}`);
    return data || null;
  },

  deleteRecipe: async (id: string): Promise<void> => {
    await apiRequest(`/recipes/${id}`, { method: 'DELETE' });
  },

  toggleFavorite: async (id: string): Promise<void> => {
    await apiRequest(`/recipes/${id}/favorite`, { method: 'PATCH' });
  },

  // --- Kitchen Members ---
  getKitchenMembers: async (): Promise<KitchenMember[]> => {
    const data = await apiRequest('/kitchen-members');
    return data || [];
  },

  saveMember: async (member: KitchenMember): Promise<void> => {
    await apiRequest('/kitchen-members', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  deleteMember: async (id: string): Promise<void> => {
    await apiRequest(`/kitchen-members/${id}`, { method: 'DELETE' });
  },

  // --- Pantry ---
  getPantry: async (): Promise<PantryItem[]> => {
    const data = await apiRequest('/pantry');
    return data || [];
  },

  addPantryItem: async (name: string, replenishmentRule?: string, inStock?: boolean): Promise<PantryItem | null> => {
    return await apiRequest('/pantry', {
      method: 'POST',
      body: JSON.stringify({ name, replenishmentRule, inStock }),
    });
  },

  removePantryItem: async (name: string): Promise<void> => {
    await apiRequest(`/pantry/${encodeURIComponent(name)}`, { method: 'DELETE' });
  },

  editPantryItem: async (currentName: string, updates: { name?: string; inStock?: boolean; replenishmentRule?: string }): Promise<void> => {
    await apiRequest(`/pantry/${encodeURIComponent(currentName)}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // --- Shopping List ---
  getShoppingList: async (): Promise<ShoppingItem[]> => {
    const data = await apiRequest('/shopping-list');
    return data || [];
  },

  addToShoppingList: async (name: string): Promise<void> => {
    await apiRequest('/shopping-list', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  updateShoppingItem: async (id: string, updates: { checked?: boolean; quantity?: string }): Promise<void> => {
    await apiRequest(`/shopping-list/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  deleteShoppingItem: async (id: string): Promise<void> => {
    await apiRequest(`/shopping-list/${id}`, { method: 'DELETE' });
  },

  // --- Suggestions ---
  getTags: async (category: string): Promise<string[]> => {
    const data = await apiRequest(`/tags?category=${category}`);
    return data || [];
  },

  saveTag: async (category: string, tag: string): Promise<void> => {
    await apiRequest('/tags', {
      method: 'POST',
      body: JSON.stringify({ category, tag }),
    });
  },

  // --- User / Kitchen Context ---
  createKitchen: async (name: string): Promise<void> => {
    await apiRequest('/kitchens', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  },

  getCurrentUser: async (): Promise<any> => {
    return await apiRequest('/auth/me');
  },

  updateProfile: async (data: { name: string; surname: string; measurementSystem: string; password?: string }): Promise<any> => {
    return await apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  switchKitchen: async (kitchenId: string): Promise<void> => {
    await apiRequest('/auth/switch-context', {
      method: 'POST',
      body: JSON.stringify({ kitchenId })
    });
  }
};
