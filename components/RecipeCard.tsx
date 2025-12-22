
import React, { useState } from 'react';
import { GeneratedRecipe, ImageSize, AspectRatio, RecipeRecord } from '../types';
import { generateDishImage } from '../services/geminiService';
import { Language, translations } from '../locales/translations';
import { storageService } from '../services/storageService';

interface Props {
  recipe: GeneratedRecipe;
  dishImage: string | null;
  setDishImage: React.Dispatch<React.SetStateAction<string | null>>;
  lang: Language;
  onSaved?: () => void;
}

const RecipeCard: React.FC<Props> = ({ recipe, dishImage, setDishImage, lang, onSaved }) => {
  const t = translations[lang];
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const isDev = process.env.NODE_ENV === 'development';

  const handleGenerateImage = async () => {
    // @ts-ignore
    if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
    setIsGeneratingImage(true);
    try {
      const img = await generateDishImage(recipe.recipe_title, ImageSize.S1K, AspectRatio.A1_1);
      setDishImage(img);
    } catch (err: any) {
      console.error("Image generation error:", err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSave = () => {
    const record: RecipeRecord = {
      ...recipe,
      id: Date.now().toString(),
      isFavorite: false,
      createdAt: Date.now(),
      dishImage: dishImage
    };
    storageService.save(record);
    setIsSaved(true);
    if (onSaved) onSaved();
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'email' | 'copy') => {
    const list = recipe.shopping_list.join('\n- ');
    const text = `*${t.shopping_list_title} ${recipe.recipe_title}*\n\n- ${list}`;
    const encodedText = encodeURIComponent(text);

    switch (platform) {
      case 'whatsapp': window.open(`https://wa.me/?text=${encodedText}`, '_blank'); break;
      case 'telegram': window.open(`https://t.me/share/url?url=${encodedText}`, '_blank'); break;
      case 'email': window.location.href = `mailto:?subject=${recipe.recipe_title}&body=${encodedText}`; break;
      case 'copy':
        navigator.clipboard.writeText(text);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
        break;
    }
    setShowShareMenu(false);
  };

  return (
    <article className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Dynamic Header Area */}
      <div className="relative min-h-[450px] bg-slate-900 flex flex-col items-center justify-center p-10">
        {dishImage && (
          <img 
            src={dishImage} 
            alt={recipe.recipe_title} 
            className="absolute inset-0 w-full h-full object-cover opacity-60 transition-opacity duration-1000" 
          />
        )}
        
        {/* Title and Info Overlay (Persistent) */}
        <div className="relative z-10 text-center space-y-6 max-w-2xl px-4">
          <div className="inline-flex px-3 py-1 bg-white/10 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
            {isGeneratingImage ? t.generating_photo : t.recipe_suggestion}
          </div>
          <h3 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none drop-shadow-2xl">
            {recipe.recipe_title}
          </h3>
          <p className="text-slate-200 text-base md:text-lg font-medium max-w-md mx-auto drop-shadow-lg opacity-90">
            {recipe.match_reasoning}
          </p>
          
          <div className="pt-8 flex gap-4 justify-center flex-wrap">
            <button 
              onClick={handleGenerateImage} 
              disabled={isGeneratingImage} 
              className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black hover:bg-indigo-50 transition-all text-xs uppercase shadow-2xl flex items-center gap-3 group"
            >
              {isGeneratingImage ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-magic group-hover:rotate-12 transition-transform"></i>}
              {isGeneratingImage ? t.generating_photo : t.generate_photo}
            </button>
          </div>
        </div>

        {/* Persistent Dark Gradient for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/60 opacity-90 pointer-events-none"></div>
        
        <div className="absolute top-8 right-8 z-20">
          <button 
            disabled={isSaved}
            onClick={handleSave} 
            className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all tracking-widest ${isSaved ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
          >
            {isSaved ? <><i className="fas fa-check mr-2"></i>Saved</> : t.save_recipe}
          </button>
        </div>
      </div>

      <div className="p-8 md:p-14">
        {isDev && (
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl mb-12">
            <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
              <i className="fas fa-terminal"></i> {t.auditor_log}
            </h4>
            <p className="text-slate-600 text-sm italic font-medium">"{recipe.analysis_log}"</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="md:col-span-5 space-y-12">
            <div>
              <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-6">
                <i className="fas fa-shopping-basket text-amber-500"></i>
                {t.from_pantry}
              </h4>
              <ul className="space-y-3">
                {recipe.ingredients_from_pantry.map((ing, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm font-bold">
                    <i className="fas fa-check text-emerald-500"></i> {ing}
                  </li>
                ))}
              </ul>
            </div>

            {recipe.shopping_list.length > 0 && (
              <div className="bg-orange-50/30 p-8 rounded-[2rem] border-2 border-dashed border-orange-200 relative">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-black text-orange-900 flex items-center gap-3">
                    <i className="fas fa-cart-plus"></i>
                    {t.to_buy}
                  </h4>
                  
                  <div className="relative">
                    <button 
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="w-10 h-10 bg-white border border-orange-200 text-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-all shadow-sm"
                    >
                      <i className="fas fa-share-alt"></i>
                    </button>
                    
                    {showShareMenu && (
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => handleShare('whatsapp')} className="w-full flex items-center gap-3 p-4 hover:bg-emerald-50 rounded-xl text-xs font-black text-slate-700 transition-colors">
                          <i className="fab fa-whatsapp text-emerald-500 text-lg"></i> {t.whatsapp}
                        </button>
                        <button onClick={() => handleShare('telegram')} className="w-full flex items-center gap-3 p-4 hover:bg-sky-50 rounded-xl text-xs font-black text-slate-700 transition-colors">
                          <i className="fab fa-telegram text-sky-500 text-lg"></i> {t.telegram}
                        </button>
                        <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-3 p-4 hover:bg-indigo-50 rounded-xl text-xs font-black text-indigo-600 transition-colors">
                          <i className="fas fa-copy text-lg"></i> {copyFeedback ? t.copied : t.copy_clipboard}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-3">
                  {recipe.shopping_list.map((ing, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-orange-800 text-sm font-bold">
                      <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="md:col-span-7">
            <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-10">
              <i className="fas fa-list-ol text-indigo-500"></i>
              {t.step_by_step}
            </h4>
            <div className="space-y-12 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
              {recipe.step_by_step.map((step, idx) => (
                <div key={idx} className="relative pl-14">
                  <div className="absolute left-0 w-8 h-8 bg-white border-4 border-indigo-500 rounded-full flex items-center justify-center font-black text-xs text-indigo-600 z-10 shadow-lg">{idx + 1}</div>
                  <p className="text-slate-700 text-lg leading-relaxed font-medium pt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default RecipeCard;
