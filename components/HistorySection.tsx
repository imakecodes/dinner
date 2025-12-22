
import React from 'react';
import { RecipeRecord } from '../types';
import { Language, translations } from '../locales/translations';
import { storageService } from '../services/storageService';

interface Props {
  history: RecipeRecord[];
  onUpdate: () => void;
  lang: Language;
}

const HistorySection: React.FC<Props> = ({ history, onUpdate, lang }) => {
  const t = translations[lang];

  const toggleFavorite = (id: string) => {
    storageService.toggleFavorite(id);
    onUpdate();
  };

  const removeRecipe = (id: string) => {
    storageService.delete(id);
    onUpdate();
  };

  if (history.length === 0) return null;

  return (
    <section className="bg-slate-50 rounded-[2.5rem] p-10 border border-slate-200">
      <h2 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
        <i className="fas fa-history text-indigo-500"></i>
        {t.history_title}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {history.map(recipe => (
          <div key={recipe.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col group hover:shadow-xl transition-all duration-300">
            {recipe.dishImage && (
              <div className="aspect-video rounded-2xl overflow-hidden mb-4 relative">
                <img src={recipe.dishImage} alt="" className="w-full h-full object-cover" />
                <button 
                  onClick={() => toggleFavorite(recipe.id)}
                  className={`absolute top-3 right-3 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${recipe.isFavorite ? 'bg-red-500 text-white' : 'bg-white/80 text-slate-400 hover:text-red-500'}`}
                >
                  <i className={`fas fa-heart ${recipe.isFavorite ? '' : 'far'}`}></i>
                </button>
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase">
                  {recipe.meal_type}
                </span>
                <span className="text-slate-400 text-[10px] font-bold">
                  {new Date(recipe.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-black text-slate-900 text-lg tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">
                {recipe.recipe_title}
              </h3>
              <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                {recipe.match_reasoning}
              </p>
            </div>

            <div className="mt-6 flex justify-between items-center pt-4 border-t border-slate-50">
              <button 
                onClick={() => removeRecipe(recipe.id)}
                className="text-slate-300 hover:text-red-500 text-xs font-bold transition-colors"
              >
                {t.delete_recipe}
              </button>
              {!recipe.dishImage && (
                <button 
                  onClick={() => toggleFavorite(recipe.id)}
                  className={`text-xs font-black ${recipe.isFavorite ? 'text-red-500' : 'text-slate-400 hover:text-red-500'}`}
                >
                  <i className={`fas fa-heart mr-1 ${recipe.isFavorite ? '' : 'far'}`}></i>
                  {recipe.isFavorite ? t.unfavorite_btn : t.favorite_btn}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default HistorySection;
