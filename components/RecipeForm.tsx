"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { MealType, Difficulty, RecipeRecord } from '../types';

interface RecipeFormProps {
    initialData?: Partial<RecipeRecord>;
    onSubmit: (data: any) => Promise<void>;
    isSubmitting: boolean;
    title: string;
}

export default function RecipeForm({ initialData, onSubmit, isSubmitting, title }: RecipeFormProps) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        recipe_title: initialData?.recipe_title || '',
        meal_type: initialData?.meal_type || 'main' as MealType,
        difficulty: initialData?.difficulty || 'intermediate' as Difficulty,
        prep_time: initialData?.prep_time || '',
        ingredients_from_pantry: (initialData?.ingredients_from_pantry as any[]) || [],
        shopping_list: (initialData?.shopping_list as any[]) || [],
        step_by_step: initialData?.step_by_step
            ? initialData.step_by_step.map((s: any, i: number) => {
                if (typeof s === 'string') return { step: i + 1, text: s };
                return s || { step: i + 1, text: '' }; // Handle potential nulls
            })
            : [{ step: 1, text: '' }],
    });

    const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '', unit: '' });
    const [newShoppingItem, setNewShoppingItem] = useState({ name: '', quantity: '', unit: '' });

    // Handlers for basic fields
    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Ingredient Handlers
    const addIngredient = () => {
        if (!newIngredient.name.trim()) return;
        setFormData(prev => ({
            ...prev,
            ingredients_from_pantry: [...prev.ingredients_from_pantry, { ...newIngredient }]
        }));
        setNewIngredient({ name: '', quantity: '', unit: '' });
    };

    const removeIngredient = (idx: number) => {
        setFormData(prev => ({
            ...prev,
            ingredients_from_pantry: prev.ingredients_from_pantry.filter((_, i) => i !== idx)
        }));
    };

    // Shopping List Handlers
    const addShoppingItem = () => {
        if (!newShoppingItem.name.trim()) return;
        setFormData(prev => ({
            ...prev,
            shopping_list: [...prev.shopping_list, { ...newShoppingItem }]
        }));
        setNewShoppingItem({ name: '', quantity: '', unit: '' });
    };

    const removeShoppingItem = (idx: number) => {
        setFormData(prev => ({
            ...prev,
            shopping_list: prev.shopping_list.filter((_, i) => i !== idx)
        }));
    };

    // Step Handlers
    const handleStepChange = (idx: number, text: string) => {
        const newSteps = [...formData.step_by_step];
        newSteps[idx] = { ...newSteps[idx], text };
        setFormData(prev => ({ ...prev, step_by_step: newSteps }));
    };

    const addStep = () => {
        setFormData(prev => ({
            ...prev,
            step_by_step: [...prev.step_by_step, { step: prev.step_by_step.length + 1, text: '' }]
        }));
    };

    const removeStep = (idx: number) => {
        const newSteps = formData.step_by_step.filter((_, i) => i !== idx)
            .map((s, i) => ({ ...s, step: i + 1 })); // Re-index
        setFormData(prev => ({ ...prev, step_by_step: newSteps }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Normalize steps to string[] before submitting to match expectations
        const finalData = {
            ...formData,
            step_by_step: formData.step_by_step.map(s => s.text)
        };
        onSubmit(finalData);
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
            <h2 className="text-2xl font-black text-slate-900 mb-6">{title}</h2>

            <form onSubmit={handleSubmit} className="space-y-8">

                {/* Basic Info */}
                <div className="space-y-4">
                    <label htmlFor="recipe_title" className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t('recipeForm.recipeTitle')}</label>

                    <input
                        id="recipe_title"
                        type="text"
                        placeholder={t('recipeForm.recipeTitlePlaceholder')}
                        value={formData.recipe_title}
                        onChange={e => handleChange('recipe_title', e.target.value)}
                        className="w-full text-lg font-bold p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 outline-none"
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <select
                            value={formData.meal_type}
                            onChange={e => handleChange('meal_type', e.target.value)}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        >
                            <option value="main">{t('recipeForm.mainCourse')}</option>
                            <option value="appetizer">{t('recipeForm.appetizer')}</option>
                            <option value="dessert">{t('recipeForm.dessert')}</option>
                            <option value="snack">{t('recipeForm.snack')}</option>
                        </select>

                        <select
                            value={formData.difficulty}
                            onChange={e => handleChange('difficulty', e.target.value)}
                            className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        >
                            <option value="easy">{t('recipeForm.easy')}</option>
                            <option value="intermediate">{t('recipeForm.intermediate')}</option>
                            <option value="advanced">{t('recipeForm.advanced')}</option>
                            <option value="chef">{t('recipeForm.chefMode')}</option>
                        </select>
                    </div>

                    <input
                        type="text"
                        placeholder={t('recipeForm.prepTimePlaceholder')}
                        value={formData.prep_time}
                        onChange={e => handleChange('prep_time', e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-rose-500 outline-none"
                    />
                </div>

                {/* Ingredients */}
                <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t('recipeForm.ingredients')}</label>
                    <div className="grid grid-cols-12 gap-2">
                        <input
                            type="text"
                            placeholder={t('recipeForm.qty')}
                            value={newIngredient.quantity}
                            onChange={e => setNewIngredient(prev => ({ ...prev, quantity: e.target.value }))}
                            className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                        <input
                            type="text"
                            placeholder={t('recipeForm.unit')}
                            value={newIngredient.unit}
                            onChange={e => setNewIngredient(prev => ({ ...prev, unit: e.target.value }))}
                            className="col-span-3 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                        <input
                            type="text"
                            placeholder={t('recipeForm.ingredientName')}
                            value={newIngredient.name}
                            onChange={e => setNewIngredient(prev => ({ ...prev, name: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addIngredient())}
                            className="col-span-4 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                        <button type="button" onClick={addIngredient} className="col-span-3 bg-emerald-100 text-emerald-600 rounded-xl font-bold hover:bg-emerald-200 flex items-center justify-center gap-2">
                            <i className="fas fa-plus"></i>
                            <span className="hidden sm:inline">{t('recipeForm.add')}</span>
                        </button>
                    </div>
                    <ul className="space-y-2">
                        {formData.ingredients_from_pantry.map((ing: any, i) => (
                            <li key={i} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                                <span className="font-medium text-slate-700">
                                    {typeof ing === 'string' ? ing : `${ing.quantity} ${ing.unit} ${ing.name}`}
                                </span>
                                <button type="button" onClick={() => removeIngredient(i)} className="text-red-400 hover:text-red-600">
                                    <i className="fas fa-times"></i>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Shopping List */}
                <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t('recipeForm.shoppingList')}</label>
                    <div className="grid grid-cols-12 gap-2">
                        <input
                            type="text"
                            placeholder={t('recipeForm.qty')}
                            value={newShoppingItem.quantity}
                            onChange={e => setNewShoppingItem(prev => ({ ...prev, quantity: e.target.value }))}
                            className="col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                        <input
                            type="text"
                            placeholder={t('recipeForm.unit')}
                            value={newShoppingItem.unit}
                            onChange={e => setNewShoppingItem(prev => ({ ...prev, unit: e.target.value }))}
                            className="col-span-3 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                        <input
                            type="text"
                            placeholder={t('recipeForm.itemName')}
                            value={newShoppingItem.name}
                            onChange={e => setNewShoppingItem(prev => ({ ...prev, name: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addShoppingItem())}
                            className="col-span-4 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                        />
                        <button type="button" onClick={addShoppingItem} className="col-span-3 bg-orange-100 text-orange-600 rounded-xl font-bold hover:bg-orange-200 flex items-center justify-center gap-2">
                            <i className="fas fa-plus"></i>
                            <span className="hidden sm:inline">{t('recipeForm.add')}</span>
                        </button>
                    </div>
                    <ul className="space-y-2">
                        {formData.shopping_list.map((item: any, i) => (
                            <li key={i} className="flex justify-between items-center bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
                                <span className="font-medium text-slate-700">
                                    {typeof item === 'string' ? item : `${item.quantity} ${item.unit} ${item.name}`}
                                </span>
                                <button type="button" onClick={() => removeShoppingItem(i)} className="text-red-400 hover:text-red-600">
                                    <i className="fas fa-times"></i>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Steps */}
                <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">{t('recipeForm.instructions')}</label>
                    <div className="space-y-4">
                        {formData.step_by_step.map((step, i) => (
                            <div key={i} className="flex gap-3">
                                <div className="w-8 h-8 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold shrink-0">
                                    {i + 1}
                                </div>
                                <textarea
                                    value={step.text}
                                    onChange={e => handleStepChange(i, e.target.value)}
                                    placeholder={t('recipeForm.stepPlaceholder').replace('{n}', (i + 1).toString())}
                                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none resize-none h-20"
                                />
                                <button type="button" onClick={() => removeStep(i)} aria-label={`Remove step ${i + 1}`} className="self-center text-red-400 hover:text-red-600 px-2">
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={addStep} className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-slate-400 hover:text-slate-600">
                        + {t('recipeForm.addStep')}
                    </button>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-5 bg-rose-600 rounded-2xl text-white font-black text-lg shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-3"
                >
                    {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                    {isSubmitting ? t('recipeForm.saving') : t('recipeForm.saveRecipe')}
                </button>

            </form>
        </div>
    );
}
