
import React, { useState, useEffect } from 'react';
import { RecipeRecord } from '../types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { storageService } from '../services/storageService';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import { useTranslation } from '@/hooks/useTranslation';
import { useApp } from './Providers';

interface Props {
  recipe: RecipeRecord;
  onSaved?: () => void;
}

const RecipeCard: React.FC<Props> = ({ recipe: initialRecipe, onSaved }) => {
  const { t, lang } = useTranslation();
  const { isGuest } = useCurrentMember();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeRecord>(initialRecipe);
  const [originalRecipe, setOriginalRecipe] = useState<RecipeRecord | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);
  // Initial favorite state comes from the record itself now
  const [isFavorite, setIsFavorite] = useState(initialRecipe.isFavorite);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // State for adding to pantry with logic
  const [itemToAdd, setItemToAdd] = useState<string | null>(null);
  
  const shareMenuRef = React.useRef<HTMLDivElement>(null);

  const isDev = process.env.NODE_ENV === 'development';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  useEffect(() => {
    setRecipe(initialRecipe);
    setHasTranslated(false);
    setOriginalRecipe(null);
  }, [initialRecipe]);

  // ... (handleTranslate, toggleFavorite code) ...

  const handleShare = (platform: 'whatsapp' | 'telegram' | 'email' | 'copy') => {
    // ... (implementation) ...
    // ...
    // Commented out to allow "Copied!" feedback to be visible in the menu
    // setShowShareMenu(false);
    if (platform !== 'copy') setShowShareMenu(false); // Close for external links, keep for copy feedback
  };

  // ...

  return (
    // ...
            {recipe.shopping_list.length > 0 && (
              <div className="bg-orange-50/30 p-4 rounded-[2rem] border-2 border-dashed border-orange-200 relative">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-lg font-black text-orange-900 flex items-center gap-3">
                    <i className="fas fa-cart-plus"></i>
                    {t('recipeCard.toBuy')}
                  </h4>

                  <div className="flex gap-2 relative" ref={shareMenuRef}>
                    <button
                      onClick={() => setShowShareMenu(!showShareMenu)}
                      className="w-10 h-10 bg-white border border-orange-200 text-orange-600 rounded-xl flex items-center justify-center hover:bg-orange-100 transition-all shadow-sm"
                    >
                      <i className="fas fa-share-alt"></i>
                    </button>

                    {showShareMenu && (
                      <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                        <button onClick={() => handleShare('whatsapp')} className="w-full flex items-center gap-3 p-4 hover:bg-emerald-50 rounded-xl text-xs font-black text-slate-700 transition-colors">
                          <i className="fab fa-whatsapp text-emerald-500 text-lg"></i> {t('recipeCard.whatsapp')}
                        </button>
                        <button onClick={() => handleShare('telegram')} className="w-full flex items-center gap-3 p-4 hover:bg-sky-50 rounded-xl text-xs font-black text-slate-700 transition-colors">
                          <i className="fab fa-telegram text-sky-500 text-lg"></i> {t('recipeCard.telegram')}
                        </button>
                        <button onClick={() => handleShare('copy')} className="w-full flex items-center gap-3 p-4 hover:bg-rose-50 rounded-xl text-xs font-black text-rose-600 transition-colors">
                          <i className="fas fa-copy text-lg"></i> {copyFeedback ? t('recipeCard.copied') : t('recipeCard.copyClipboard')}
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
                              title={t('recipeCard.addToShoppingList')}
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
              {t('recipeCard.stepByStep')}
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
              <h3 className="text-xl font-black text-slate-900">{t('recipeCard.addToListTitle').replace('{item}', itemToAdd)}</h3>
              <p className="text-slate-500 text-xs font-medium mt-1 uppercase tracking-wide">{t('recipeCard.trackItem')}</p>
            </div>

            <div className="grid gap-3">
              <button onClick={() => confirmAddToPantry('ALWAYS')} className="p-4 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 flex items-center gap-3 transition-all border border-indigo-100">
                <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700"><i className="fas fa-sync"></i></div>
                <div className="text-left">
                  <div className="text-sm">{t('recipeCard.alwaysReplenish')}</div>
                  <div className="text-[10px] opacity-70">{t('recipeCard.alwaysReplenishDesc')}</div>
                </div>
              </button>
              <button onClick={() => confirmAddToPantry('ONE_SHOT')} className="p-4 rounded-xl bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 flex items-center gap-3 transition-all border border-emerald-100">
                <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700"><i className="fas fa-check"></i></div>
                <div className="text-left">
                  <div className="text-sm">{t('recipeCard.oneShot')}</div>
                  <div className="text-[10px] opacity-70">{t('recipeCard.oneShotDesc')}</div>
                </div>
              </button>
              <button onClick={() => confirmAddToPantry('NEVER')} className="p-4 rounded-xl bg-slate-50 text-slate-700 font-bold hover:bg-slate-100 flex items-center gap-3 transition-all border border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600"><i className="fas fa-ban"></i></div>
                <div className="text-left">
                  <div className="text-sm">{t('recipeCard.justTrack')}</div>
                  <div className="text-[10px] opacity-70">{t('recipeCard.justTrackDesc')}</div>
                </div>
              </button>
            </div>

            <button onClick={() => setItemToAdd(null)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 text-sm uppercase tracking-wide">{t('recipeCard.cancel')}</button>
          </div>
        </div>
      )}
    </article>
  );
};

export default RecipeCard;
