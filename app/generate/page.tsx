"use client";

import { useState } from 'react';
import { useApp } from '../../components/Providers';
import { SessionContext, MealType, RecipeRecord, Difficulty } from '../../types';
import { storageService } from '../../services/storageService';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';

export default function GenerateRecipePage() {
    const router = useRouter();
    const { t } = useTranslation();
    const {
        members,
        pantry,
        activeDiners, setActiveDiners,
        difficulty, setDifficulty,
        prepTime,
        language
    } = useApp();

    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [observation, setObservation] = useState('');
    const [mealType, setMealType] = useState<MealType>('main');

    const handleGenerateRecipe = async () => {
        if (activeDiners.length === 0) {
            setError(t('generate.selectDinersError'));
            return;
        }
        setIsGenerating(true);
        setError(null);

        try {
            const context: SessionContext = {
                who_is_eating: activeDiners,
                pantry_ingredients: pantry.filter(i => i.inStock).map(i => i.name),
                requested_type: mealType,
                difficulty_preference: difficulty,
                prep_time_preference: prepTime,
                observation: observation
            };

            const result = await fetch('/api/recipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members, context, language: language || 'en' }),
            }).then(res => {
                if (!res.ok) throw new Error('API request failed');
                return res.json();
            });

            const newRecord: RecipeRecord = {
                ...result,
                id: Date.now().toString(),
                isFavorite: false,
                createdAt: Date.now(),
                language: language || 'en'
            };

            const savedRecipe = await storageService.saveRecipe(newRecord);

            // Redirect to the new recipe
            router.push(`/recipes/${savedRecipe.id}`);

        } catch (err: any) {
            setError(t('common.error'));
            console.error(err);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-rose-100 pb-20">
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
                    <Link href="/" className="text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="fas fa-arrow-left text-xl"></i>
                    </Link>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                        {t('generate.title')}
                    </h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">

                {/* Who (Simplified Select) */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('generate.whoIsEating')}</label>
                    <div className="flex flex-wrap gap-2">
                        {members.map(m => (
                            <button
                                key={m.id}
                                onClick={() => setActiveDiners(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${activeDiners.includes(m.id) ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                            >
                                {m.name}
                            </button>
                        ))}
                        {members.length === 0 && <Link href="/kitchens" className="text-sm text-rose-600 font-bold underline">{t('generate.addMembersFirst')}</Link>}
                    </div>
                </div>

                {/* Type & Difficulty */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('generate.mealType')}</label>
                        <div className="flex gap-2 flex-wrap">
                            {['appetizer', 'main', 'dessert', 'snack'].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setMealType(val as MealType)}
                                    className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border-2 uppercase ${mealType === val ? 'bg-rose-100 border-rose-500 text-rose-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                    {val === 'main' ? t('recipeForm.mainCourse') : val === 'appetizer' ? t('recipeForm.appetizer') : val === 'dessert' ? t('recipeForm.dessert') : t('recipeForm.snack')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('generate.difficulty')}</label>
                        <div className="flex gap-2 flex-wrap">
                            {['easy', 'intermediate', 'advanced'].map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDifficulty(d as Difficulty)}
                                    className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border-2 uppercase ${difficulty === d ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                    {d === 'easy' ? t('recipeForm.easy') : d === 'intermediate' ? t('recipeForm.intermediate') : t('recipeForm.advanced')}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Observation */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{t('generate.specialRequests')}</label>
                    <textarea
                        value={observation}
                        onChange={e => setObservation(e.target.value)}
                        placeholder={t('generate.specialRequestsPlaceholder')}
                        className="w-full h-32 p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm focus:border-rose-500 outline-none resize-none"
                    />
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerateRecipe}
                    disabled={isGenerating}
                    className="w-full py-6 bg-rose-600 rounded-3xl text-white font-black text-xl shadow-xl shadow-rose-200 hover:bg-rose-700 hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                >
                    {isGenerating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
                    {isGenerating ? t('generate.generating') : t('generate.generateBtn')}
                </button>

                <div className="text-center">
                    <span className="text-slate-400 font-medium text-sm"> {t('generate.or')} </span>
                    <Link href="/recipes/create" className="block mt-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-slate-600 font-bold hover:border-slate-300 hover:bg-slate-50 transition-all">
                        <i className="fas fa-pen-to-square mr-2"></i> {t('generate.createManually')}
                    </Link>
                </div>

                {error && <div className="p-4 bg-red-50 text-red-600 rounded-2xl font-bold text-center border border-red-100">{error}</div>}
            </main>
        </div>
    );
}
