
import React from 'react';
import { RecipeRecord } from '../types';
import { Language, translations } from '../locales/translations';
import { storageService } from '../services/storageService';

interface Props {
  history: RecipeRecord[];
  onUpdate: () => void;
  lang: Language;
}

const HistoryPage: React.FC<Props> = ({ history, onUpdate, lang }) => {
  const t = translations[lang];

  const toggleFavorite = (id: string) => {
    storageService.toggleFavorite(id);
    onUpdate();
  };

  const removeRecipe = (id: string) => {
    storageService.delete(id);
    onUpdate();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{t.history_title}</h2>
        <p className="text-slate-500 font-medium">Suas descobertas gastronômicas favoritas.</p>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-slate-200">
           <i className="fas fa-book-open text-6xl text-slate-100 mb-6"></i>
           <p className="text-slate-400 font-black uppercase tracking-widest">{t.no_history}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {history.map(recipe => (
            <div key={recipe.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group flex flex-col">
              <div className="relative h-64 overflow-hidden">
                {recipe.dishImage ? (
                  <img src={recipe.dishImage} alt={recipe.recipe_title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                    <i className="fas fa-utensils text-slate-800 text-6xl"></i>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="flex gap-2 mb-2">
                    <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                      {recipe.meal_type}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight">{recipe.recipe_title}</h3>
                </div>

                <button 
                  onClick={() => toggleFavorite(recipe.id)}
                  className={`absolute top-6 right-6 w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-xl transition-all ${recipe.isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/40'}`}
                >
                  <i className={`fas fa-heart ${recipe.isFavorite ? '' : 'far'}`}></i>
                </button>
              </div>

              <div className="p-8 flex-1 flex flex-col">
                <p className="text-slate-500 text-sm line-clamp-3 font-medium mb-8 leading-relaxed">
                  {recipe.match_reasoning}
                </p>

                <div className="mt-auto flex justify-between items-center pt-6 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {new Date(recipe.createdAt).toLocaleDateString()}
                  </span>
                  <button 
                    onClick={() => removeRecipe(recipe.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <i className="fas fa-trash-alt mr-2"></i>
                    {t.delete_recipe}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
