
import Dexie, { type EntityTable } from 'dexie';
import { HouseholdMember, RecipeRecord } from '../types';

interface PantryItem {
  id?: number;
  name: string;
  category?: string;
}

interface TagSuggestion {
  id?: number;
  category: 'restrictions' | 'likes' | 'dislikes';
  tag: string;
}

export const db = new Dexie('DinnerDB') as Dexie & {
  household: EntityTable<HouseholdMember, 'id'>;
  pantry: EntityTable<PantryItem, 'id'>;
  recipes: EntityTable<RecipeRecord, 'id'>;
  suggestions: EntityTable<TagSuggestion, 'id'>;
};

// CONFIGURATION & MIGRATIONS
db.version(1).stores({
  household: 'id, name, isGuest',
  pantry: '++id, &name',
  recipes: 'id, recipe_title, createdAt, isFavorite',
  suggestions: '++id, [category+tag], tag'
});

// Version 2: Added difficulty and prep_time fields for better searching/filtering
db.version(2).stores({
  recipes: 'id, recipe_title, createdAt, isFavorite, difficulty, prep_time'
});
