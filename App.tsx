
import React, { useState, useEffect } from 'react';
import { HouseholdMember, SessionContext, GeneratedRecipe, MealType, RecipeRecord, ViewState } from './types';
import { generateRecipe } from './services/geminiService';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import RecipeCard from './components/RecipeCard';
import { Language, translations } from './locales/translations';
import { storageService } from './services/storageService';

// Paginas/Componentes para as Views
import HouseholdPage from './pages/HouseholdPage';
import PantryPage from './pages/PantryPage';
import HistoryPage from './pages/HistoryPage';
import HomePage from './pages/HomePage';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('pt');
  const t = translations[lang];

  // --- Global State ---
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [household, setHousehold] = useState<HouseholdMember[]>(() => {
    const saved = localStorage.getItem('dinner_household');
    return saved ? JSON.parse(saved) : [
      { id: 'h1', name: 'Carlos', restrictions: ['Diabetes'], likes: ['Carne'], dislikes: ['Legumes cozidos'] },
      { id: 'h2', name: 'Bia', restrictions: ['Vegetariana'], likes: ['Pasta'], dislikes: ['Coentro'] }
    ];
  });

  const [pantry, setPantry] = useState<string[]>(() => {
    const saved = localStorage.getItem('dinner_pantry');
    return saved ? JSON.parse(saved) : ['Ovos', 'Arroz', 'Feijão', 'Azeite'];
  });

  const [activeDiners, setActiveDiners] = useState<string[]>(['h1', 'h2']);
  const [mealType, setMealType] = useState<MealType>('main');
  
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [dishImage, setDishImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RecipeRecord[]>([]);

  // Persistência básica via useEffect (em um app real seria storageService)
  useEffect(() => {
    localStorage.setItem('dinner_household', JSON.stringify(household));
  }, [household]);

  useEffect(() => {
    localStorage.setItem('dinner_pantry', JSON.stringify(pantry));
  }, [pantry]);

  useEffect(() => {
    setHistory(storageService.getAll());
  }, [currentView]);

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
      const context: SessionContext = {
        who_is_eating: activeDiners,
        pantry_ingredients: pantry,
        requested_type: mealType
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

  const renderView = () => {
    switch (currentView) {
      case 'household':
        return <HouseholdPage household={household} setHousehold={setHousehold} lang={lang} />;
      case 'pantry':
        return <PantryPage pantry={pantry} setPantry={setPantry} lang={lang} />;
      case 'history':
        return <HistoryPage history={history} onUpdate={() => setHistory(storageService.getAll())} lang={lang} />;
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
            isGenerating={isGenerating}
            onGenerate={handleGenerateRecipe}
            error={error}
            recipe={recipe}
            dishImage={dishImage}
            setDishImage={setDishImage}
            lang={lang}
            onSaved={() => setHistory(storageService.getAll())}
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
        onHomeClick={() => { setCurrentView('home'); setRecipe(null); }}
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
