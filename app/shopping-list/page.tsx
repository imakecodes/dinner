'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { storageService } from '@/services/storageService';
import { ShoppingItem } from '@/types';
import { useCurrentMember } from '@/hooks/useCurrentMember';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';

export default function ShoppingListPage() {
    const { isGuest } = useCurrentMember();
    const { t } = useTranslation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // UI State
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'manual' | 'recipe'>('all');
    const [selectedRecipeId, setSelectedRecipeId] = useState<string>('all');
    const [copied, setCopied] = useState(false);

    // Get unique recipes from items
    const uniqueRecipes = Array.from(new Map(
        items.flatMap(item => item.recipeItems?.map(ri => [ri.recipe.id, ri.recipe]) || [])
    ).values());

    useEffect(() => {
        loadList();
    }, []);

    const loadList = async () => {
        try {
            const list = await storageService.getShoppingList();
            setItems(list);
        } catch (err) {
            console.error("Failed to load shopping list", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItemName.trim()) return;

        try {
            await storageService.addToShoppingList(newItemName);
            setNewItemName('');
            await loadList();
        } catch (err) {
            console.error("Failed to add item", err);
        }
    };

    const handleToggleCheck = async (item: ShoppingItem | any) => {
        try {
            // Optimistic update
            const newChecked = !item.checked;
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, checked: newChecked } : i));

            await storageService.updateShoppingItem(item.id, { checked: newChecked });

            // If checked, it moved to pantry, reload lists?
            // User might want it to disappear or just stay checked.
            // Current list logic allows showing checked items.
        } catch (err) {
            console.error(err);
            // Revert on error
            loadList();
        }
    };

    const handleRemove = async (id: string) => {
        try {
            setItems(prev => prev.filter(i => i.id !== id));
            await storageService.deleteShoppingItem(id);
        } catch (err) {
            console.error(err);
            loadList();
        }
    };

    const handleClearList = async () => {
        try {
            // Optimistic clear
            const oldItems = [...items];
            setItems([]);
            setShowClearConfirm(false);

            await storageService.clearShoppingList();
            await loadList(); // Reload to see if anything remained (e.g. failures or server logic)
        } catch (err) {
            console.error(err);
            loadList(); // Revert
            alert(t('common.error'));
        }
    };

    const handleShareList = () => {
        const text = filteredItems.map(i => {
            let line = `[${i.checked ? 'x' : ' '}] ${i.name}`;
            return line;
        }).join('\n');

        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const filteredItems = items.filter(item => {
        // Search
        if (searchQuery) {
            if (!item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        }

        // Filter tabs
        if (filter === 'manual') {
            return (!item.recipeItems || item.recipeItems.length === 0);
        }
        if (filter === 'recipe') {
            if (selectedRecipeId !== 'all') {
                return item.recipeItems?.some((ri: any) => ri.recipe.id === selectedRecipeId);
            }
            return (item.recipeItems && item.recipeItems.length > 0);
        }

        return true;
    });



    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-rose-100">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onNavigate={(view) => {
                    if (view !== 'shoppingList') {
                        window.location.href = view === 'home' ? '/' : `/${view}`;
                    }
                }}
            />

            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                        >
                            <i className="fas fa-bars"></i>
                        </button>
                        <h1 className="font-black text-xl tracking-tight text-slate-900">{t('shopping.title')}</h1>
                    </div>
                    {!isGuest && items.length > 0 && (
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {t('shopping.clearAll')}
                        </button>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 pt-24 pb-32 space-y-4 animate-in fade-in duration-500">
                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-bold animate-pulse">{t('shopping.loading')}</div>
                ) : (
                    <>
                        <div className="space-y-4 mb-6">
                            {/* Search and Share */}
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                    <input
                                        type="text"
                                        placeholder={t('shopping.searchPlaceholder') || 'Search items...'}
                                        className="w-full pl-10 pr-4 py-3 bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-700 transition-colors"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={handleShareList}
                                    className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 transition-colors flex items-center gap-2"
                                    title={t('shopping.shareTooltip') || "Copy list to clipboard"}
                                >
                                    {copied ? <i className="fas fa-check"></i> : <i className="fas fa-share-alt"></i>}
                                </button>
                            </div>

                            {/* Filters */}
                            <div className="flex p-1 bg-slate-200/50 rounded-xl">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t('shopping.filterAll') || 'All'}
                                </button>
                                <button
                                    onClick={() => setFilter('manual')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t('shopping.filterMyList') || 'My List'}
                                </button>
                                <button
                                    onClick={() => setFilter('recipe')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'recipe' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    {t('shopping.filterRecipes') || 'Recipes'}
                                </button>
                            </div>

                            {/* Specific Recipe Filter Dropdown */}
                            {filter === 'recipe' && uniqueRecipes.length > 0 && (
                                <div className="mt-2 animate-in slide-in-from-top-2 duration-200">
                                    <select
                                        value={selectedRecipeId}
                                        onChange={(e) => setSelectedRecipeId(e.target.value)}
                                        className="w-full p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    >
                                        <option value="all">{t('shopping.allRecipes') || 'All Recipes'}</option>
                                        {uniqueRecipes.map(recipe => (
                                            <option key={recipe.id} value={recipe.id}>
                                                {recipe.recipe_title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Add Item Form (Only show on 'all' or 'manual') */}
                            {!isGuest && (filter === 'all' || filter === 'manual') && (
                                <form onSubmit={handleAddItem} className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder={t('shopping.addItem')}
                                        className="flex-1 bg-transparent px-4 font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                    />
                                    <button type="submit" disabled={!newItemName.trim()} className="w-10 h-10 bg-rose-600 rounded-xl text-white flex items-center justify-center shadow-lg shadow-rose-200 hover:scale-105 transition-transform">
                                        <i className="fas fa-plus"></i>
                                    </button>
                                </form>
                            )}
                        </div>

                        {isGuest && (
                            <div className="text-center mb-4 p-4 bg-slate-100 rounded-2xl text-slate-500 text-sm font-bold">
                                {t('shopping.readOnly')}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredItems.length === 0 && (
                                <div className="col-span-full text-center py-20 opacity-50">
                                    <i className="fas fa-leaf text-4xl mb-4 text-slate-300"></i>
                                    <p className="font-bold text-slate-400">{items.length === 0 ? t('shopping.empty') : (t('shopping.noResults') || 'No items found')}</p>
                                </div>
                            )}

                            {filteredItems.map((item: any) => (
                                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {!isGuest && (
                                                <div
                                                    onClick={() => handleToggleCheck(item)}
                                                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors cursor-pointer ${item.checked ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-200 hover:border-rose-400'}`}
                                                >
                                                    {item.checked && <i className="fas fa-check text-xs"></i>}
                                                </div>
                                            )}
                                            <div>
                                                <div className="flex items-baseline gap-2">
                                                    <p className={`font-bold transition-all ${item.checked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {!isGuest && (
                                            <button
                                                onClick={() => handleRemove(item.id)}
                                                className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 px-2"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        )}
                                    </div>

                                    {/* Item Badges/Context */}
                                    {(item.pantryItem || (item.recipeItems && item.recipeItems.length > 0)) && (
                                        <div className="flex flex-wrap gap-2 pl-10">
                                            {item.pantryItem && (
                                                <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                                    <i className="fas fa-box-open mr-1"></i>
                                                    {t('shopping.fromPantry')}
                                                </span>
                                            )}
                                            {item.recipeItems?.map((ri: any) => (
                                                <Link
                                                    key={ri.recipe.id}
                                                    href={`/recipes/${ri.recipe.id}`}
                                                    className="text-[10px] lowercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors"
                                                    title={ri.recipe.recipe_title}
                                                >
                                                    <i className="fas fa-utensil-spoon mr-1"></i>
                                                    {ri.recipe.recipe_title.length > 20 ? ri.recipe.recipe_title.substring(0, 20) + '...' : ri.recipe.recipe_title}
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </main>

            {/* Clear Confirmation Dialog */}
            {showClearConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        <div className="text-center space-y-2">
                            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500 text-xl mb-4">
                                <i className="fas fa-trash-alt"></i>
                            </div>
                            <h3 className="text-xl font-black text-slate-900">{t('shopping.clearConfirmTitle')}</h3>
                            <p className="text-slate-500 text-sm font-medium">{t('shopping.clearConfirmDesc')}</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="flex-1 py-3 text-slate-600 font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={handleClearList}
                                className="flex-1 py-3 text-white font-bold bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors shadow-lg shadow-rose-200"
                            >
                                {t('common.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
