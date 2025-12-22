import { RecipeRecord, HouseholdMember } from '../types';

/**
 * SERVICE: StorageService
 * Communicates with Next.js API routes which interface with MySQL via Prisma.
 */

const API_BASE = '/api';

async function fetchApi(path: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json', // Explicitly ask for JSON
        ...options.headers,
      },
    });

    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        throw new Error(errorData.message || `API Error: ${response.status}`);
      } else {
        const textError = await response.text();
        console.error('Non-JSON error response:', textError);
        throw new Error(`Server returned ${response.status}: ${response.statusText}. Check server logs.`);
      }
    }

    if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but received:', text);
        throw new Error('Server returned non-JSON response. Ensure API routes are correctly configured.');
    }

    return await response.json();
  } catch (error) {
    console.error(`Fetch error on ${path}:`, error);
    throw error;
  }
}

export const storageService = {
  // --- Recipes / History ---
  getAllRecipes: async (): Promise<RecipeRecord[]> => {
    return fetchApi('/recipes');
  },

  saveRecipe: async (recipe: any): Promise<void> => {
    return fetchApi('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  },

  deleteRecipe: async (id: string): Promise<void> => {
    return fetchApi(`/recipes/${id}`, {
      method: 'DELETE',
    });
  },

  toggleFavorite: async (id: string): Promise<void> => {
    return fetchApi(`/recipes/${id}/favorite`, {
      method: 'PATCH',
    });
  },

  // --- Household ---
  getHousehold: async (): Promise<HouseholdMember[]> => {
    return fetchApi('/household');
  },

  saveMember: async (member: HouseholdMember): Promise<void> => {
    return fetchApi('/household', {
      method: 'POST',
      body: JSON.stringify(member),
    });
  },

  deleteMember: async (id: string): Promise<void> => {
    return fetchApi(`/household/${id}`, {
      method: 'DELETE',
    });
  },

  // --- Pantry ---
  getPantry: async (): Promise<string[]> => {
    return fetchApi('/pantry');
  },

  addPantryItem: async (name: string): Promise<void> => {
    return fetchApi('/pantry', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  removePantryItem: async (name: string): Promise<void> => {
    return fetchApi(`/pantry/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },

  editPantryItem: async (oldName: string, newName: string): Promise<void> => {
    return fetchApi(`/pantry/${encodeURIComponent(oldName)}`, {
      method: 'PUT',
      body: JSON.stringify({ name: newName }),
    });
  },

  // --- Suggestions ---
  getTags: async (category: 'restrictions' | 'likes' | 'dislikes'): Promise<string[]> => {
    return fetchApi(`/tags?category=${category}`);
  },

  saveTag: async (category: 'restrictions' | 'likes' | 'dislikes', tag: string): Promise<void> => {
    return fetchApi('/tags', {
      method: 'POST',
      body: JSON.stringify({ category, tag }),
    });
  }
};
