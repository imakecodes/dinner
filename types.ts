
export type MealType = 'appetizer' | 'main' | 'dessert' | 'snack';
export type Difficulty = 'easy' | 'intermediate' | 'advanced' | 'chef';
export type PrepTimePreference = 'quick' | 'plenty';
export type ReplenishmentRule = 'ALWAYS' | 'ONE_SHOT' | 'NEVER';
export type MeasurementSystem = 'METRIC' | 'IMPERIAL';

// --- User & Kitchen ---

export interface Kitchen {
  id: string;
  name: string;
  createdAt?: string | number | Date;
}

export interface KitchenMember {
  id: string;
  name: string;
  email?: string;
  isGuest?: boolean;
  userId?: string;
  kitchenId: string;
  kitchen?: Kitchen;
  restrictions?: string[];
  likes?: string[];
  dislikes?: string[];
  role?: 'ADMIN' | 'MEMBER';
}

// --- Pantry & Shopping ---

export interface PantryItem {
  id: string;
  name: string;
  inStock: boolean;
  replenishmentRule: ReplenishmentRule;
  shoppingItemId?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  checked: boolean;
  pantryItemId?: string;
  recipeItems?: any[];
  pantryItem?: PantryItem;
}

export interface Ingredient {
  id: string;
  name: string;
}

export interface SessionContext {
  who_is_eating: string[];
  pantry_ingredients: string[];
  requested_type: MealType;
  difficulty_preference: Difficulty;
  prep_time_preference: PrepTimePreference;
  observation?: string;
  measurement_system?: MeasurementSystem;
}

// Raw output from the AI Generator
export interface GeneratedRecipe {
  analysis_log: string;
  recipe_title: string;
  match_reasoning: string;
  ingredients_from_pantry: { name: string; quantity: string; unit: string }[];
  shopping_list: { name: string; quantity: string; unit: string }[];
  step_by_step: string[];
  safety_badge: boolean;
  meal_type: MealType;
  difficulty: Difficulty;
  prep_time: string;
}

// Frontend record extending generated data with DB fields
export interface RecipeRecord extends GeneratedRecipe {
  id: string;
  isFavorite: boolean; // Computed for the current member/user
  createdAt: number;
  dishImage?: string;
  language?: string;
  image_base64?: string;
}

export type ViewState = 'home' | 'members' | 'pantry' | 'history' | 'shopping_list';
