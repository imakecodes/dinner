"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HistorySection from '../../components/HistorySection';

import { storageService } from '../../services/storageService';
import { RecipeRecord } from '../../types';

import { useCurrentMember } from '@/hooks/useCurrentMember';
import { useTranslation } from '@/hooks/useTranslation';

export default function HistoryPage() {
    const router = useRouter();
    const { t, lang } = useTranslation();
    const { isGuest } = useCurrentMember();
    const [history, setHistory] = useState<RecipeRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        storageService.getAllRecipes(lang).then(setHistory);
    }, [lang]);

    const refreshHistory = async () => {
        const data = await storageService.getAllRecipes(lang);
        setHistory(data);
    };

    const filteredHistory = history.filter(recipe => {
        const term = searchTerm.toLowerCase();
        const titleMatch = recipe.recipe_title.toLowerCase().includes(term);
        // Assuming ingredients_from_pantry is array of strings. 
        // Need to be careful if it's stringified JSON in some contexts, but frontend type says string[].
        // Let's safe check checking if it's array.
        const ingredientsMatch = Array.isArray(recipe.ingredients_from_pantry) &&
            recipe.ingredients_from_pantry.some((ing: any) => {
                const name = typeof ing === 'string' ? ing : (ing?.name || '');
                return name.toLowerCase().includes(term);
            });

        const shoppingMatch = Array.isArray(recipe.shopping_list) &&
            recipe.shopping_list.some((ing: any) => {
                const name = typeof ing === 'string' ? ing : (ing?.name || '');
                return name.toLowerCase().includes(term);
            });

        return titleMatch || ingredientsMatch || shoppingMatch;
    });

    return (
        <div className="max-w-4xl mx-auto px-4 mt-4 space-y-4">

            {/* Search Bar */}
            <div className="relative">
                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                <input
                    type="text"
                    placeholder={t('recipes.searchPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                />
            </div>

            {filteredHistory.length > 0 ? (
                <HistorySection
                    history={filteredHistory}
                    onUpdate={refreshHistory}
                    onViewRecipe={(recipe) => router.push(`/recipes/${recipe.id}`)}
                    isGuest={isGuest}
                />
            ) : (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl text-rose-500">
                        <i className="fas fa-search"></i>
                    </div>
                    <h3 className="text-lg font-bold text-slate-700 mb-2">{t('recipes.noResults')}</h3>
                    <p className="text-slate-500 max-w-xs mx-auto">
                        {searchTerm ? t('recipes.noResultsSearch').replace('{term}', searchTerm) : t('recipes.empty')}
                    </p>
                    {!searchTerm && !isGuest && (
                        <button
                            onClick={() => router.push('/generate')}
                            className="mt-6 px-6 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors"
                        >
                            {t('actions.generateTitle')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
