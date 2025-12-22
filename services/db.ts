
// Fix: Replaced class inheritance with the recommended Dexie 4 instance pattern to resolve the TypeScript error 
// where the 'version' property was not found on the inherited type.
import Dexie, { type EntityTable } from 'dexie';
import { HouseholdMember, RecipeRecord } from '../types';

interface PantryItem {
  id?: number;
  name: string;
  category?: string; // Futura expansão
}

interface TagSuggestion {
  id?: number;
  category: 'restrictions' | 'likes' | 'dislikes';
  tag: string;
}

/**
 * DinnerDatabase - Gerenciador de Banco de Dados com suporte a Migrações
 * Este schema é desenhado para ser facilmente portável para SQL (MySQL/PostgreSQL)
 */
export const db = new Dexie('DinnerDB') as Dexie & {
  household: EntityTable<HouseholdMember, 'id'>;
  pantry: EntityTable<PantryItem, 'id'>;
  recipes: EntityTable<RecipeRecord, 'id'>;
  suggestions: EntityTable<TagSuggestion, 'id'>;
};

// CONFIGURAÇÃO DE VERSÕES E MIGRAÇÕES
// Versão 1: Schema Inicial
db.version(1).stores({
  household: 'id, name, isGuest',
  pantry: '++id, &name',
  recipes: 'id, recipe_title, createdAt, isFavorite',
  suggestions: '++id, [category+tag], tag'
});

/**
 * EXEMPLO DE MIGRAÇÃO (Versão 2):
 * Caso você precise adicionar um campo novo ou mudar a estrutura:
 * 
 * db.version(2).stores({
 *   recipes: 'id, recipe_title, createdAt, isFavorite, rating' // Novo índice rating
 * }).upgrade(tx => {
 *   // Lógica de transformação de dados:
 *   return tx.table('recipes').toCollection().modify(recipe => {
 *     recipe.rating = 0; // Valor default para registros antigos
 *   });
 * });
 */
