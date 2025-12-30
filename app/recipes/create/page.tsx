"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import RecipeForm from '@/components/RecipeForm';
import { storageService } from '@/services/storageService';
import { useTranslation } from '@/hooks/useTranslation';

export default function CreateRecipePage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (formData: any) => {
        setIsSubmitting(true);
        try {
            // Prepare data for API
            const newRecipe = {
                ...formData,
                isFavorite: false, // Default
                dishImage: '', // Placeholder
                // Ensure array structure is what API expects if using JSON in Prisma for reading
                // The API POST route creates relations from these arrays
            };

            const savedRecipe = await storageService.saveRecipe(newRecipe);
            router.push(`/recipes/${savedRecipe.id}`);
            // Note: Ideally redirect to the specific recipe, but ID is generated on server for POST. 
            // We could await result and get ID if storageService returns it.
            // For now home/history is fine.
        } catch (error) {
            console.error("Failed to create recipe:", error);
            alert(t('common.error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-rose-100 pb-20">
            <header className="bg-white border-b border-slate-200 mb-8">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="fas fa-arrow-left text-xl"></i>
                    </Link>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {t('recipeForm.titleCreate')}
                    </h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4">
                <RecipeForm
                    title={t('recipeForm.titleCreate')}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                />
            </main>
        </div>
    );
}
