export type BuildArchetype = 'league_starter' | 'mapper' | 'bossing' | 'hybrid';
export type BuildCostTier = 'cheap' | 'medium' | 'expensive' | 'mirror_of_kalandra';
/** @deprecated Use BuildCostTier. */
export type BuildComplexity = BuildCostTier;
export type SetupTimePreference = 'quick' | 'plenty';
export type BuildItemStatus = 'pending' | 'completed';
/** @deprecated Use BuildArchetype. */
export type MealType = 'appetizer' | 'main' | 'dessert' | 'snack';
/** @deprecated Use BuildCostTier. */
export type Difficulty = 'easy' | 'intermediate' | 'advanced' | 'ascendant' | 'chef';
/** @deprecated Use SetupTimePreference. */
export type PrepTimePreference = SetupTimePreference;
export type ReplenishmentRule = 'ALWAYS' | 'ONE_SHOT' | 'NEVER';
export type MeasurementSystem = 'METRIC' | 'IMPERIAL';
export type Language = 'en' | 'pt-BR';

// --- User & Kitchen ---

export interface Kitchen {
  id: string;
  name: string;
  inviteCode?: string;
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

// --- Stash & Checklist ---

export interface PantryItem {
  id: string;
  name: string;
  inStock: boolean;
  quantity?: string;
  unit?: string;
  unitDetails?: string;
  replenishmentRule: ReplenishmentRule;
  shoppingItemId?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string; // from DB
  unit?: string;     // from DB
  checked: boolean;
  pantryItemId?: string;
  recipeItems?: any[];
  pantryItem?: PantryItem;
}

export interface Ingredient {
  id: string;
  name: string;
}

export interface BuildEntry {
  name: string;
  quantity: string;
  unit: string;
}

export interface BuildSessionContext {
  party_member_ids: string[];
  stash_gear_gems: string[];
  requested_archetype: BuildArchetype;
  cost_tier_preference: BuildCostTier;
  setup_time_preference: SetupTimePreference;
  build_notes?: string;
  language?: string;
  /** @deprecated Use cost_tier_preference. */
  build_complexity?: BuildComplexity;
}

/**
 * @deprecated Legacy compatibility shape accepted by old craft payloads.
 * Use BuildSessionContext.
 */
export interface SessionContext {
  who_is_eating?: string[];
  pantry_ingredients?: string[];
  requested_type?: MealType | BuildArchetype;
  difficulty_preference?: Difficulty | BuildCostTier;
  prep_time_preference?: PrepTimePreference;
  observation?: string;
  measurement_system?: MeasurementSystem;
  language?: string;
  party_member_ids?: string[];
  stash_gear_gems?: string[];
  requested_archetype?: BuildArchetype;
  cost_tier_preference?: BuildCostTier;
  /** @deprecated Use cost_tier_preference. */
  build_complexity?: BuildComplexity;
  setup_time_preference?: SetupTimePreference;
  build_notes?: string;
}

// Raw output from AI (canonical)
export interface GeneratedBuild {
  analysis_log: string;
  build_title: string;
  build_reasoning: string;
  gear_gems: BuildEntry[];
  build_items: BuildEntry[];
  build_steps: string[];
  compliance_badge: boolean;
  build_archetype: BuildArchetype;
  build_cost_tier: BuildCostTier;
  setup_time: string;
  setup_time_minutes?: number | null;
  build_image?: string;
  language?: string;
  /** @deprecated Use build_cost_tier. */
  build_complexity?: BuildComplexity;
}

/**
 * @deprecated Legacy compatibility payload.
 * Use GeneratedBuild.
 */
export interface GeneratedRecipe {
  analysis_log: string;
  recipe_title: string;
  match_reasoning: string;
  ingredients_from_pantry: BuildEntry[];
  shopping_list: BuildEntry[];
  step_by_step: string[];
  safety_badge: boolean;
  meal_type: MealType | BuildArchetype;
  difficulty: Difficulty | BuildCostTier;
  prep_time: string;
  prep_time_minutes?: number | null;
  build_title?: string;
  build_reasoning?: string;
  gear_gems?: BuildEntry[];
  build_items?: BuildEntry[];
  build_steps?: string[];
  compliance_badge?: boolean;
  build_archetype?: BuildArchetype;
  build_cost_tier?: BuildCostTier;
  /** @deprecated Use build_cost_tier. */
  build_complexity?: BuildComplexity;
  setup_time?: string;
  setup_time_minutes?: number | null;
  build_image?: string;
}

// Frontend record extending legacy generated data with DB fields
export interface RecipeRecord extends GeneratedRecipe {
  id: string;
  isFavorite: boolean; // Computed for the current member/user
  createdAt: number;
  dishImage?: string;
  language?: Language;
  image_base64?: string;
  originalRecipeId?: string | null;
  translations?: {
    id: string;
    language: Language;
    recipe_title: string;
    build_title?: string;
  }[];
  prep_time_minutes?: number | null;
}

export interface CanonicalBuildRecord extends GeneratedBuild {
  id: string;
  isFavorite: boolean;
  createdAt: number;
  image_base64?: string;
  originalBuildId?: string | null;
  translations?: {
    id: string;
    language: Language;
    build_title: string;
    recipe_title?: string;
  }[];
}

// --- Canonical PoE aliases ---
export interface Hideout extends Kitchen {}
export interface PartyMember extends KitchenMember {}
export interface StashItem extends PantryItem {}
export interface BuildItem extends ShoppingItem {}
export type BuildRecord = RecipeRecord &
  Partial<Omit<CanonicalBuildRecord, 'translations'>> & {
    translations?: {
      id: string;
      language: Language;
      build_title?: string;
      recipe_title?: string;
    }[];
  };

export type ViewState =
  | 'home'
  | 'party'
  | 'stash'
  | 'builds'
  | 'build_items'
  | 'members'
  | 'pantry'
  | 'history'
  | 'shopping_list';
