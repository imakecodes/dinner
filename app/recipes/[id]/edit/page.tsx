"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import RecipeForm from '@/components/RecipeForm';
import { storageService } from '@/services/storageService';
import { RecipeRecord } from '@/types';

export default function EditRecipePage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [recipe, setRecipe] = useState<RecipeRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (id) {
            storageService.getRecipeById(id)
                .then(setRecipe)
                .catch(err => console.error("Failed to load recipe", err))
                .finally(() => setLoading(false));
        }
    }, [id]);

    const handleSubmit = async (formData: any) => {
        setIsSubmitting(true);
        try {
            await fetch(`/api/recipes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            router.push(`/recipes/${id}`);
        } catch (error) {
            console.error("Failed to update recipe:", error);
            alert("Failed to update recipe.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold text-slate-400">Loading recipe...</div>;
    if (!recipe) return <div className="p-10 text-center font-bold text-slate-400">Recipe not found.</div>;

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-rose-100 pb-20">
            <header className="bg-white border-b border-slate-200 mb-8">
                <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href={`/recipes/${id}`} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="fas fa-arrow-left text-xl"></i>
                    </Link>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        Edit Recipe
                    </h1>
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4">
                <RecipeForm
                    title={`Editing: ${recipe.recipe_title}`}
                    initialData={recipe}
                    onSubmit={handleSubmit}
                    isSubmitting={isSubmitting}
                />
            </main>
        </div>
    );
}
