import { en } from './locales/en';
import { ptBR } from './locales/pt-BR';

export const translations = {
    en,
    'pt-BR': ptBR
};

export type TranslationKey = keyof typeof translations.en;
