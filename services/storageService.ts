
import { RecipeRecord, HouseholdMember } from '../types';
import { db } from './db';

export const storageService = {
  // --- Recipes / History ---
  getAllRecipes: async (): Promise<RecipeRecord[]> => {
    return await db.recipes.orderBy('createdAt').reverse().toArray();
  },

  saveRecipe: async (recipe: RecipeRecord): Promise<void> => {
    await db.recipes.put(recipe); // put faz insert ou update se ID existir
  },

  deleteRecipe: async (id: string): Promise<void> => {
    await db.recipes.delete(id);
  },

  toggleFavorite: async (id: string): Promise<void> => {
    const recipe = await db.recipes.get(id);
    if (recipe) {
      await db.recipes.update(id, { isFavorite: !recipe.isFavorite });
    }
  },

  // --- Household (Residentes e Convidados) ---
  getHousehold: async (): Promise<HouseholdMember[]> => {
    const members = await db.household.toArray();
    if (members.length === 0) {
      // Seed inicial apenas se o banco for novo
      const initial: HouseholdMember[] = [
        { id: 'h1', name: 'Carlos', restrictions: ['Diabetes'], likes: ['Carne'], dislikes: ['Legumes cozidos'], isGuest: false },
        { id: 'h2', name: 'Bia', restrictions: ['Vegetariana'], likes: ['Pasta'], dislikes: ['Coentro'], isGuest: false }
      ];
      await db.household.bulkAdd(initial);
      return initial;
    }
    return members;
  },

  saveMember: async (member: HouseholdMember): Promise<void> => {
    await db.household.put(member);
    
    // Salva automaticamente novos termos nas sugestões para o autocomplete aprender
    for (const tag of [...member.restrictions]) await storageService.saveTag('restrictions', tag);
    for (const tag of [...member.likes]) await storageService.saveTag('likes', tag);
    for (const tag of [...member.dislikes]) await storageService.saveTag('dislikes', tag);
  },

  deleteMember: async (id: string): Promise<void> => {
    await db.household.delete(id);
  },

  // --- Pantry (Despensa com suporte a busca e edição) ---
  getPantry: async (): Promise<string[]> => {
    const items = await db.pantry.toArray();
    return items.map(i => i.name).sort();
  },

  addPantryItem: async (name: string): Promise<void> => {
    try {
      await db.pantry.add({ name });
    } catch (e) {
      // Duplicata ignorada pelo índice &name
    }
  },

  removePantryItem: async (name: string): Promise<void> => {
    const item = await db.pantry.where('name').equals(name).first();
    if (item?.id) await db.pantry.delete(item.id);
  },

  editPantryItem: async (oldName: string, newName: string): Promise<void> => {
    const item = await db.pantry.where('name').equals(oldName).first();
    if (item?.id) await db.pantry.update(item.id, { name: newName });
  },

  // --- Suggestions (Dicionário de Tags / Autocomplete) ---
  getTags: async (category: 'restrictions' | 'likes' | 'dislikes'): Promise<string[]> => {
    const tags = await db.suggestions.where('category').equals(category).toArray();
    return tags.map(t => t.tag);
  },

  saveTag: async (category: 'restrictions' | 'likes' | 'dislikes', tag: string): Promise<void> => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    try {
      // Tenta adicionar a combinação única de categoria+tag
      await db.suggestions.add({ category, tag: trimmed });
    } catch (e) {
      // Já existe
    }
  }
};
