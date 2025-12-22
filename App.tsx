
import React, { useState, useEffect } from 'react';
import { HouseholdMember, SessionContext, GeneratedRecipe, MealType, RecipeRecord, ViewState, Difficulty, PrepTimePreference } from './types';
import { generateRecipe } from './services/geminiService';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { Language, translations } from './locales/translations';
import { storageService } from './services/storageService';

import HouseholdPage from './pages/HouseholdPage';
import PantryPage from './pages/PantryPage';
import HistoryPage from './pages/HistoryPage';
import HomePage from './pages/HomePage';
import RecipeCard from './components/RecipeCard';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('pt');
  const t = translations[lang];

  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [household, setHousehold] = useState<HouseholdMember[]>([]);
  const [pantry, setPantry] = useState<string[]>([]);
  const [history, setHistory] = useState<RecipeRecord[]>([]);

  const [activeDiners, setActiveDiners] = useState<string[]>([]);
  const [mealType, setMealType] = useState<MealType>('main');
  const [difficulty, setDifficulty] = useState<Difficulty>('intermediate');
  const [prepTime, setPrepTime] = useState<PrepTimePreference>('quick');
  
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [selectedRecipeRecord, setSelectedRecipeRecord] = useState<RecipeRecord | null>(null);
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial Load
  useEffect(() => {
    const initData = async () => {
      const [h, p, r] = await Promise.all([
        storageService.getHousehold(),
        storageService.getPantry(),
        storageService.getAllRecipes()
      ]);
      setHousehold(h);
      setPantry(p);
      setHistory(r);
      setActiveDiners(h.filter(m => !m.isGuest).map(m => m.id));
      setIsLoading(false);
    };
    initData();
  }, []);

  const refreshHistory = async () => {
    const r = await storageService.getAllRecipes();
    setHistory(r);
  };

  const handleGenerateRecipe = async () => {
    if (activeDiners.length === 0) {
      setError(t.select_diners_error);
      return;
    }
    setIsGenerating(true);
    setError(null);
    setRecipe(null);
    setDishImage(null);
    setSelectedRecipeRecord(null);

    try {
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

  const handleViewRecipe = (rec: RecipeRecord) => {
    setSelectedRecipeRecord(rec);
    setCurrentView('home'); // Go to home to display the recipe card
    setRecipe(null); // Clear active generation if any
    setDishImage(rec.dishImage || null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-indigo-900 animate-pulse uppercase tracking-widest text-xs">Preparando Cozinha...</p>
        </div>
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'household':
        return <HouseholdPage household={household} setHousehold={setHousehold} lang={lang} />;
      case 'pantry':
        return <PantryPage pantry={pantry} setPantry={setPantry} lang={lang} />;
      case 'history':
        return <HistoryPage history={history} onUpdate={refreshHistory} lang={lang} onViewRecipe={handleViewRecipe} />;
      default:
        return (
          <HomePage 
            household={household}
            setHousehold={setHousehold}
            pantry={pantry}
            activeDiners={activeDiners}
            setActiveDiners={setActiveDiners}
            mealType={mealType}
            setMealType={setMealType}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            prepTime={prepTime}
            setPrepTime={setPrepTime}
            isGenerating={isGenerating}
            onGenerate={handleGenerateRecipe}
            error={error}
            recipe={recipe || selectedRecipeRecord}
            dishImage={dishImage}
            setDishImage={setDishImage}
            lang={lang}
            onSaved={refreshHistory}
            onCloseRecipe={() => { setRecipe(null); setSelectedRecipeRecord(null); setDishImage(null); }}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <Header 
        lang={lang} 
        setLang={setLang} 
        onMenuClick={() => setIsSidebarOpen(true)} 
        onHomeClick={() => { setCurrentView('home'); setRecipe(null); setSelectedRecipeRecord(null); }}
      />
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onNavigate={(view) => { setCurrentView(view); setIsSidebarOpen(false); }}
        lang={lang}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {renderView()}
      </main>

      <footer className="py-12 border-t border-slate-200 text-center opacity-50">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Dinner? &copy; 2025 Smart Culinary Assistant
        </p>
      </footer>
    </div>
  );
};

export default App;
