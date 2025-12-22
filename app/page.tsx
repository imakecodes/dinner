"use client";

import React, { useState, useEffect } from 'react';
// Fix: Added Difficulty and PrepTimePreference to imports from types
import { HouseholdMember, SessionContext, GeneratedRecipe, MealType, RecipeRecord, Difficulty, PrepTimePreference } from '../types';
import { generateRecipe } from '../services/geminiService';
import Header from '../components/Header';
import HouseholdSection from '../components/HouseholdSection';
import PantrySection from '../components/PantrySection';
import RecipeCard from '../components/RecipeCard';
import HistorySection from '../components/HistorySection';
import Footer from '../components/Footer';
import { Language, translations } from '../locales/translations';
import { storageService } from '../services/storageService';

export default function Home() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  // --- App State ---
  const [household, setHousehold] = useState<HouseholdMember[]>([
    { id: 'pai', name: 'Carlos', restrictions: ['Diabetes Type 2'], likes: ['Beef', 'BBQ'], dislikes: ['Cooked vegetables'] },
    { id: 'filha', name: 'Bia', restrictions: ['Vegetarian', 'Peanut Allergy'], likes: ['Pasta', 'Mushrooms'], dislikes: ['Cilantro'] }
  ]);
  const [pantry, setPantry] = useState<string[]>(['Traditional Pasta', 'Tomato Sauce', 'Sugar', 'Zucchini', 'Eggs', 'Parmesan Cheese', 'Roasted Peanuts']);
  const [activeDiners, setActiveDiners] = useState<string[]>(['pai', 'filha']);
  const [mealType, setMealType] = useState<MealType>('main');
  // Fix: Added missing difficulty and prepTime state to satisfy SessionContext requirements
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [prepTime, setPrepTime] = useState<PrepTimePreference>('quick');
  
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RecipeRecord[]>([]);

  // Load history on mount
  // Fix: Corrected storageService.getAll() to storageService.getAllRecipes() and handled the promise result.
  useEffect(() => {
    storageService.getAllRecipes().then(setHistory);
  }, []);

  // Fix: Corrected storageService.getAll() to storageService.getAllRecipes() and awaited the result.
  const refreshHistory = async () => {
    const data = await storageService.getAllRecipes();
    setHistory(data);
  };

  /**
   * Triggers the recipe generation logic with selected meal type.
   */
  const handleGenerateRecipe = async () => {
    if (activeDiners.length === 0) {
      setError(t.select_diners_error);
      return;
    }
    setIsGenerating(true);
    setError(null);
    setRecipe(null);
    setDishImage(null);

    try {
      // Fix: Added missing difficulty_preference and prep_time_preference to satisfy SessionContext interface
      const context: SessionContext = {
        who_is_eating: activeDiners,
        pantry_ingredients: pantry,
        requested_type: mealType,
        difficulty_preference: difficulty,
        prep_time_preference: prepTime
      };
      const result = await generateRecipe(household, context, lang);
      setRecipe(result);
    } catch (err: any) {
      setError(t.generate_error);
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 selection:bg-indigo-100">
      <Header lang={lang} setLang={setLang} />
      
      <main className="max-w-4xl mx-auto px-4 mt-8 space-y-8">
        <HouseholdSection 
          household={household} 
          setHousehold={setHousehold} 
          activeDiners={activeDiners} 
          setActiveDiners={setActiveDiners} 
          lang={lang}
        />
        
        <PantrySection 
          pantry={pantry} 
          setPantry={setPantry} 
          lang={lang}
        />

        {/* Meal Type Selection */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">
            {t.meal_type_label}
          </h3>
          <div className="flex flex-wrap gap-4">
            {(['appetizer', 'main', 'dessert'] as MealType[]).map(type => (
              <button
                key={type}
                onClick={() => setMealType(type)}
                className={`px-8 py-4 rounded-2xl font-black text-sm uppercase transition-all flex items-center gap-3 border-2 ${
                  mealType === type 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                }`}
              >
                <i className={`fas ${
                  type === 'appetizer' ? 'fa-cheese' : type === 'main' ? 'fa-hamburger' : 'fa-ice-cream'
                }`}></i>
                {t[type as keyof typeof t]}
              </button>
            ))}
          </div>
        </section>

        {/* Main Action Button */}
        <div className="flex flex-col items-center gap-4 py-4">
          <button 
            disabled={isGenerating || activeDiners.length === 0}
            onClick={handleGenerateRecipe}
            className="w-full md:w-auto px-16 py-6 rounded-3xl text-xl font-black transition-all flex items-center justify-center gap-4 btn-primary group"
          >
            {isGenerating ? (
              <><i className="fas fa-brain fa-spin"></i> {t.generating_btn}</>
            ) : (
              <><i className="fas fa-hat-chef group-hover:rotate-12 transition-transform"></i> {t.generate_btn}</>
            )}
          </button>
          {error && (
            <div className="bg-red-50 px-6 py-3 rounded-2xl border border-red-200 text-red-600 font-bold text-xs tracking-wider animate-bounce uppercase">
              {error}
            </div>
          )}
        </div>

        {/* Recipe Result display */}
        {recipe && (
          <RecipeCard 
            recipe={recipe} 
            dishImage={dishImage} 
            setDishImage={setDishImage} 
            lang={lang}
            onSaved={refreshHistory}
          />
        )}

        {/* History / Favorites Browsing */}
        <HistorySection history={history} onUpdate={refreshHistory} lang={lang} />
      </main>

      <Footer lang={lang} />
    </div>
  );
}
