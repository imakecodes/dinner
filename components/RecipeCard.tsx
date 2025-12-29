
import React, { useState, useEffect } from 'react';
import { GeneratedRecipe, RecipeRecord, Difficulty } from '../types';
import Link from 'next/link';
import Image from 'next/image';
import { storageService } from '../services/storageService';
import { useCurrentMember } from '@/hooks/useCurrentMember';

interface Props {
  recipe: RecipeRecord;
  onSaved?: () => void;
}

const RecipeCard: React.FC<Props> = ({ recipe: initialRecipe, onSaved }) => {
  const { isGuest } = useCurrentMember();
  const [recipe, setRecipe] = useState<RecipeRecord>(initialRecipe);
  // Initial favorite state comes from the record itself now
  const [isFavorite, setIsFavorite] = useState(initialRecipe.isFavorite);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // State for adding to pantry with logic
  const [itemToAdd, setItemToAdd] = useState<string | null>(null);

  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    setRecipe(initialRecipe);
  }, [initialRecipe]);

  const toggleFavorite = async () => {
    try {
      await storageService.toggleFavorite(recipe.id);
      const newStatus = !isFavorite;
      setIsFavorite(newStatus);

      // Update local recipe state too so if we translate/save image it has correct status
      setRecipe(prev => ({ ...prev, isFavorite: newStatus }));

      if (onSaved) onSaved(); // Refreshes history list in parent
    } catch (err) {
      console.error("Error toggling favorite:", err);
    }
  };

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'email' | 'copy') => {
    const list = recipe.shopping_list.map(item => `${item.quantity} ${item.unit} ${item.name}`).join('\n- ');
    const text = `*Shopping List for ${recipe.recipe_title}*\n\n- ${list}`;
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
    // Commented out to allow "Copied!" feedback to be visible in the menu
    // setShowShareMenu(false);
  };

  const confirmAddToPantry = async (rule: string) => {
    if (!itemToAdd) return;
    try {
      // Add to pantry as tracked item (inStock=false since we need to buy it)
      await storageService.addPantryItem(itemToAdd, rule, false);
      setItemToAdd(null);
    } catch (err) {
      console.error("Error adding to pantry:", err);
    }
  };

  return (
    <article className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-700">
      {/* Dynamic Header Area */}
      <div className="relative bg-slate-900 flex flex-col p-4 md:p-14 h-auto min-h-[400px] justify-center">

        {/* Persistent Dark Gradient for Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-slate-900/60 opacity-90 pointer-events-none z-1"></div>

        {/* Background Image */}
        {recipe.image_base64 && (
          <Image
            src={recipe.image_base64}
            alt={recipe.recipe_title}
            data-testid="recipe-bg-image"
            fill
            className="object-cover z-0"
          />
        )}

        <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col gap-10">

          {/* Top Bar: Badges & Actions */}
          <div className="flex flex-col-reverse md:flex-row justify-between items-center gap-4">
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <div className="inline-flex px-3 py-1 bg-white/10 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                Today&apos;s Suggestion
              </div>
              <div className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 text-white ${recipe.difficulty === 'easy' ? 'bg-green-500/80' :
                recipe.difficulty === 'intermediate' ? 'bg-yellow-500/80' :
                  recipe.difficulty === 'chef' ? 'bg-slate-900 border-rose-500/50' : 'bg-red-500/80'
                }`}>
                {recipe.difficulty === 'chef' ? <><i className="fas fa-hat-chef mr-1"></i> CHEF</> : recipe.difficulty}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isGuest && (
                <Link
                  href={`/recipes/${recipe.id}/edit`}
                  className="px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all tracking-widest bg-white text-slate-900 hover:bg-slate-100 border border-slate-200"
                >
                  <i className="fas fa-edit mr-2"></i> Edit
                </Link>
              )}
              <button
                onClick={toggleFavorite}
                className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all tracking-widest ${isFavorite ? 'bg-pink-500 text-white hover:bg-pink-600' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
              >
                {isFavorite ? (
                  <><i className="fas fa-heart-broken mr-2"></i>Unfavorite</>
                ) : (
                  <><i className="fas fa-heart mr-2"></i>Favorite</>
                )}
              </button>
            </div>
          </div>

          {/* Main Title & Description */}
          <div className="text-center space-y-4">
            <h3 className="text-4xl md:text-5xl lg:text-7xl font-black text-white tracking-tighter leading-tight drop-shadow-2xl">
              {recipe.recipe_title}
            </h3>

            <div className="bg-slate-800/90 p-4 md:p-10 rounded-3xl border border-slate-700 max-w-3xl mx-auto shadow-xl">
              <p className="text-slate-200 text-lg md:text-xl font-medium leading-relaxed">
                {recipe.match_reasoning}
              </p>
            </div>
          </div>

        </div>
      </div>

      <div className="p-4 md:p-14">
        {isDev && (
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-3xl mb-12">
            <h4 className="font-black text-slate-400 text-[10px] uppercase tracking-widest mb-2 flex items-center gap-2">
              <i className="fas fa-terminal"></i> Auditor Log (Dev Only)
            </h4>
            <p className="text-slate-600 text-sm italic font-medium">&quot;{recipe.analysis_log}&quot;</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
          <div className="md:col-span-5 space-y-12">
            <div>
              <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-6">
                <i className="fas fa-shopping-basket text-amber-500"></i>
                From Pantry
              </h4>
              <ul className="space-y-3">
                {recipe.ingredients_from_pantry.map((rawIng, idx) => {
                  const ing = (() => {
                    let item = typeof rawIng === 'string' ? (() => {
                      try {
                        const parsed = JSON.parse(rawIng);
                        return typeof parsed === 'object' ? parsed : { name: rawIng };
                      } catch (e) { return { name: rawIng }; }
                    })() : rawIng;

                    // Deep parse if name is still JSON
                    if (item && typeof item.name === 'string' && item.name.startsWith('{')) {
                      try {
                        const parsedName = JSON.parse(item.name);
                        item = {
                          ...item,
                          name: parsedName.name || item.name,
                          quantity: item.quantity || parsedName.quantity || '',
                          unit: item.unit || parsedName.unit || ''
                        };
                      } catch (e) { }
                    }
                    return item;
                  })();

                  return (
                    <li key={idx} className="flex items-center gap-3 text-slate-700 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-sm font-bold group hover:bg-emerald-100 transition-colors">
                      <i className="fas fa-check-circle text-emerald-500"></i>
                      <div className="flex flex-col text-left">
                        {(ing.quantity || ing.unit) && (
                          <span className="text-[10px] text-emerald-600/70 uppercase tracking-tighter leading-none mb-0.5">
                            {ing.quantity} {ing.unit}
                          </span>
                        )}
                        <span className="leading-tight">{ing.name}</span>
                      </div>
                      <span className="ml-auto text-[8px] font-black uppercase bg-white px-2 py-1 rounded-full text-emerald-600 border border-emerald-200 shadow-sm opacity-60 group-hover:opacity-100 transition-opacity">Pantry</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {recipe.shopping_list.length > 0 && (
              <div className="bg-orange-50/30 p-4 rounded-[2rem] border-2 border-dashed border-orange-200 relative">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-black text-orange-900 flex items-center gap-3">
                    <i className="fas fa-cart-plus"></i>
                    To Buy
                  </h4>

                  <div className="flex gap-2 relative">
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="w-10 h-10 bg-white border border-orange-200 text-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-all shadow-sm"
                    >
                      <i className="fas fa-share-alt"></i>
                    </button>

                    {showShareMenu && (
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => handleShare('whatsapp')} className="w-full flex items-center gap-3 p-4 hover:bg-emerald-50 rounded-xl text-xs font-black text-slate-700 transition-colors">
                          <i className="fab fa-whatsapp text-emerald-500 text-lg"></i> WhatsApp
                        </button>
                        <button onClick={() => handleShare('telegram')} className="w-full flex items-center gap-3 p-4 hover:bg-sky-50 rounded-xl text-xs font-black text-slate-700 transition-colors">
                          <i className="fab fa-telegram text-sky-500 text-lg"></i> Telegram
                        </button>
                        <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-3 p-4 hover:bg-rose-50 rounded-xl text-xs font-black text-rose-600 transition-colors">
                          <i className="fas fa-copy text-lg"></i> {copyFeedback ? 'Copied!' : 'Copy to Clipboard'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-3">
                  {recipe.shopping_list.map((rawIng, idx) => {
                    const ing = (() => {
                      let item = typeof rawIng === 'string' ? (() => {
                        try {
                          const parsed = JSON.parse(rawIng);
                          return typeof parsed === 'object' ? parsed : { name: rawIng };
                        } catch (e) { return { name: rawIng }; }
                      })() : rawIng;

                      // Deep parse if name is still JSON
                      if (item && typeof item.name === 'string' && item.name.startsWith('{')) {
                        try {
                          const parsedName = JSON.parse(item.name);
                          item = {
                            ...item,
                            name: parsedName.name || item.name,
                            quantity: item.quantity || parsedName.quantity || '',
                            unit: item.unit || parsedName.unit || ''
                          };
                        } catch (e) { }
                      }
                      return item;
                    })();

                    return (
                      <li key={idx} className="flex items-center justify-between text-orange-950 text-sm font-bold bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md hover:bg-white transition-all group/item">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          {!isGuest && (
                            <button
                              onClick={() => setItemToAdd(ing.name)}
                              className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-200 hover:scale-110 active:scale-95 transition-all outline-none"
                              title="Add to Shopping List"
                            >
                              <i className="fas fa-cart-shopping text-xs"></i>
                            </button>
                          )}
                          <div className="flex flex-col min-w-0">
                            {(ing.quantity || ing.unit) && (
                              <span className="text-[10px] text-orange-600 uppercase tracking-tighter leading-none mb-0.5">
                                {ing.quantity} {ing.unit}
                              </span>
                            )}
                            <span className="leading-tight truncate pr-2">
                              {ing.name}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div className="md:col-span-7">
            <h4 className="text-xl font-black text-slate-900 flex items-center gap-3 mb-10">
              <i className="fas fa-list-ol text-rose-500"></i>
              Step by Step
            </h4>
            <div className="space-y-12 relative">
              <div className="absolute left-[15px] top-4 bottom-4 w-0.5 bg-slate-100"></div>
              {recipe.step_by_step.map((stepData, idx) => {
                const stepText = typeof stepData === 'string' ? stepData : (stepData as any)?.text || '';
                return (
                  <div key={idx} className="relative pl-14">
                    <div className="absolute left-0 w-8 h-8 bg-white border-4 border-rose-500 rounded-full flex items-center justify-center font-black text-xs text-rose-600 z-10 shadow-lg">{idx + 1}</div>
                    <p className="text-slate-700 text-lg leading-relaxed font-medium pt-0.5">{stepText}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {itemToAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-4 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-xl font-black text-slate-900">Add &quot;{itemToAdd}&quot; to List?</h3>
              <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-wide">Select how to track this item</p>
            </div>

            <div className="grid gap-3">
              <button onClick={() => confirmAddToPantry('ALWAYS')} className="p-4 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 flex items-center gap-3 transition-all border border-indigo-100">
                <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700"><i className="fas fa-sync"></i></div>
                <div className="text-left">
                  <div className="text-sm">Always Replenish</div>
                  <div className="text-[10px] opacity-70">Auto-add to list when empty</div>
                </div>
              </button>
              <button onClick={() => confirmAddToPantry('ONE_SHOT')} className="p-4 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 flex items-center gap-3 transition-all border border-emerald-100">
                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700"><i className="fas fa-check"></i></div>
                <div className="text-left">
                  <div className="text-sm">One Shot</div>
                  <div className="text-[10px] opacity-70">Buy heavily once</div>
                </div>
              </button>
              <button onClick={() => confirmAddToPantry('NEVER')} className="p-4 rounded-xl bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 flex items-center gap-3 transition-all border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600"><i className="fas fa-ban"></i></div>
                <div className="text-left">
                  <div className="text-sm">Just Track</div>
                  <div className="text-[10px] opacity-70">Don&apos;t replenish automatically</div>
                </div>
              </button>
            </div>

            <button onClick={() => setItemToAdd(null)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 text-sm uppercase tracking-wide">Cancel</button>
          </div>
        </div>
      )}
    </article>
  );
};

export default RecipeCard;
