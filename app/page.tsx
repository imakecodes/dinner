"use client";

import { useState, useEffect } from 'react';
import { useApp } from '../components/Providers';
import Footer from '../components/Footer';
import { RecipeRecord, Kitchen, ShoppingItem } from '../types';
import { storageService } from '../services/storageService';
import Link from 'next/link';
import { CodeInput } from '../components/ui/CodeInput';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import { useTranslation } from '@/hooks/useTranslation';
import { MessageDialog } from '../components/MessageDialog';

export default function Home() {
  const { isGuest } = useCurrentMember();
  const {
    members,
    pantry,
  } = useApp();
  const { t } = useTranslation();

  const [history, setHistory] = useState<RecipeRecord[]>([]);
  const [kitchen, setKitchen] = useState<Kitchen | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [errorDialog, setErrorDialog] = useState({ isOpen: false, message: '', title: '' });

  useEffect(() => {
    Promise.all([
      storageService.getAllRecipes(),
      storageService.getCurrentKitchen(),
      storageService.getShoppingList()
    ])
      .then(([recipes, kitchenData, shoppingData]) => {
        setHistory(recipes);
        setKitchen(kitchenData);
        setShoppingList(shoppingData);
      })
      .catch(err => {
        if (err.message.includes('Unauthorized') || err.message.includes('401')) {
          // Redirect explicitly just in case Providers didn't catch it fast enough
          window.location.href = '/login';
        } else {
          console.error("Failed to load data", err);
        }
      });
  }, []);

  // Stats
  const activeCount = members.length;
  const shoppingCount = shoppingList.filter(i => !i.checked).length;
  const recipesCount = history.length;

  return (
    <div className="min-h-screen pb-10 bg-slate-50 selection:bg-rose-100">

      {/* Dashboard Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2 flex items-center gap-3">
            {t('home.welcome')}, Chef! <span className="text-rose-500">👨‍🍳</span>
            {kitchen && (
              <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-widest font-bold border border-slate-700 shadow-sm animate-in fade-in slide-in-from-left-4">
                <i className="fas fa-utensils mr-2 text-rose-500"></i>
                {kitchen.name}
              </span>
            )}
          </h1>
          <p className="text-slate-500 font-medium">{t('actions.generateDesc')}</p>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <Link href="/members" className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 text-center hover:bg-rose-50 transition-colors block">
              <div className="text-2xl font-black text-rose-600">{activeCount}</div>
              <div className="text-xs font-bold text-rose-400 uppercase tracking-wider">{t('nav.members')}</div>
            </Link>
            <Link href="/shopping-list" className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center hover:bg-emerald-50 transition-colors block">
              <div className="text-2xl font-black text-emerald-600">{shoppingCount}</div>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{t('nav.shopping')}</div>
            </Link>
            <Link href="/recipes" className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 text-center hover:bg-indigo-50 transition-colors block">
              <div className="text-2xl font-black text-indigo-600">{recipesCount}</div>
              <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{t('nav.recipes')}</div>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-4 space-y-4">

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!isGuest && (
            <Link
              href="/generate"
              className="p-4 bg-white rounded-3xl border-2 border-slate-200 shadow-sm hover:border-rose-500 hover:shadow-rose-100 transition-all group text-left block"
            >
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 text-xl mb-4 group-hover:scale-110 transition-transform">
                <i className="fas fa-wand-magic-sparkles"></i>
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-1">{t('actions.generateTitle')}</h3>
              <p className="text-sm text-slate-500 font-medium">{t('actions.generateDesc')}</p>
            </Link>
          )}

          <Link href="/pantry" className="p-4 bg-white rounded-3xl border-2 border-slate-200 shadow-sm hover:border-emerald-500 hover:shadow-emerald-100 transition-all group text-left">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-carrot"></i>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">{t('actions.pantryTitle')}</h3>
            <p className="text-sm text-slate-500 font-medium">{t('actions.pantryDesc')}</p>
          </Link>

          <Link href="/kitchens" className="p-4 bg-white rounded-3xl border-2 border-slate-200 shadow-sm hover:border-indigo-500 hover:shadow-indigo-100 transition-all group text-left">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xl mb-4 group-hover:scale-110 transition-transform">
              <i className="fas fa-utensils"></i>
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-1">{t('actions.kitchenTitle')}</h3>
            <p className="text-sm text-slate-500 font-medium">{t('actions.kitchenDesc')}</p>
          </Link>
        </div>

        {/* Join Kitchen Section */}
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
            <i className="fas fa-ticket-alt text-amber-500"></i>
            {t('actions.haveCode')}
          </h3>
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1">
              <CodeInput
                onChange={setJoinCode}
                disabled={joining}
              />
            </div>
            <button
              onClick={async () => {
                if (joinCode.length !== 6) return;
                setJoining(true);
                try {
                  const res = await storageService.joinKitchen(joinCode);
                  if (!res || !res.kitchenId) {
                    throw new Error(t('actions.failedJoin'));
                  }
                  // Automatically switch context
                  await storageService.switchKitchen(res.kitchenId);
                  // Refresh page to load new context
                  window.location.reload();
                } catch (err: any) {
                  setErrorDialog({
                    isOpen: true,
                    title: t('common.error'),
                    message: t(err.message)
                  });
                } finally {
                  setJoining(false);
                }
              }}
              disabled={joining || joinCode.length !== 6}
              className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-xl font-black uppercase tracking-wide shadow-lg shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {joining ? <i className="fas fa-spinner fa-spin"></i> : t('actions.joinCode')}
            </button>
          </div>
        </div>

        {/* Recent History */}
        {history.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-black text-slate-800 mb-6">{t('actions.recent')}</h3>
            <div className="space-y-4">
              {history.slice(0, 3).map(rec => (
                <Link href={`/recipes/${rec.id}`} key={rec.id} className="block bg-white p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex justify-between items-center group">
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-rose-600 transition-colors">{rec.recipe_title}</h4>
                    <p className="text-xs text-slate-500">{new Date(rec.createdAt).toLocaleDateString()} • {rec.meal_type}</p>
                  </div>
                  <i className="fas fa-chevron-right text-slate-300 group-hover:text-rose-400"></i>
                </Link>
              ))}
            </div>
          </div>
        )}

      </main>
      <Footer />
      <MessageDialog
        isOpen={errorDialog.isOpen}
        onClose={() => setErrorDialog({ ...errorDialog, isOpen: false })}
        title={errorDialog.title}
        message={errorDialog.message}
        type="error"
      />
    </div>
  );
}
