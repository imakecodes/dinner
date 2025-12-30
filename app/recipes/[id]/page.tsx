"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { storageService } from '@/services/storageService';
import { RecipeRecord } from '@/types';
import RecipeCard from '@/components/RecipeCard';
import { useTranslation } from '@/hooks/useTranslation';

export default function RecipeDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const { t } = useTranslation();
    const [recipe, setRecipe] = useState<RecipeRecord | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            storageService.getRecipeById(id as string).then(data => {
                if (data) {
                    setRecipe(data);
                }
                setLoading(false);
            });
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <i className="fas fa-circle-notch fa-spin text-4xl text-rose-500"></i>
            </div>
        );
    }

    if (!recipe) {
        return (
            <div className="text-center mt-20">
                <h2 className="text-2xl font-bold text-slate-700">{t('recipeDetails.notFound')}</h2>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-6 py-2 bg-rose-600 text-white rounded-xl"
                >
                    {t('recipeDetails.goBack')}
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 mt-4 pb-10 space-y-4">
            <button
                onClick={() => router.push('/recipes')}
                className="flex items-center gap-2 text-slate-500 hover:text-rose-600 font-bold transition-colors"
            >
                <i className="fas fa-arrow-left"></i> {t('recipeDetails.backToRecipes')}
            </button>

            <RecipeCard
                recipe={recipe}
                onSaved={async () => {
                    // In details view, onSaved might implicitly mean update? 
                    // Since it's already saved, maybe just re-fetch or no-op.
                    // But RecipeCard handles 'saved' state locally mostly for new recipes.
                    // For existing ones, it might just confirm 'Saved'.
                }}
            />
        </div>
    );
}
