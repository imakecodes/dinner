
export type MealType = 'appetizer' | 'main' | 'dessert';

export interface HouseholdMember {
  id: string;
  name: string;
  restrictions: string[];
  likes: string[];
  dislikes: string[];
}

export interface SessionContext {
  who_is_eating: string[];
  pantry_ingredients: string[];
  requested_type: MealType;
}

export interface GeneratedRecipe {
  analysis_log: string;
  recipe_title: string;
  match_reasoning: string;
  ingredients_from_pantry: string[];
  shopping_list: string[];
  step_by_step: string[];
  safety_badge: boolean;
  meal_type: MealType;
}

/**
 * Represents a saved recipe in the database.
 */
export interface RecipeRecord extends GeneratedRecipe {
  id: string;
  isFavorite: boolean;
  createdAt: number;
  dishImage?: string | null;
}

export enum ImageSize {
  S1K = '1K',
  S2K = '2K',
  S4K = '4K'
}

export enum AspectRatio {
  A1_1 = '1:1',
  A3_4 = '3:4',
  A4_3 = '4:3',
  A9_16 = '9:16',
  A16_9 = '16:9'
}
