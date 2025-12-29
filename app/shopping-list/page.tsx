'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { storageService } from '@/services/storageService';
import { ShoppingItem } from '@/types';
import { useCurrentMember } from '@/hooks/useCurrentMember';

export default function ShoppingListPage() {
    const { isGuest } = useCurrentMember();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [loading, setLoading] = useState(true);

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

    // NOTE: Simple delete for now as "Checked"
    const handleMarkDone = async (name: string) => {
        // We don't have DELETE endpoint set up for shopping list specifically by ID/Name in storageService
        // The user request was just to LIST items.
        // I'll leave the UI for list.
    };

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
                        <h1 className="font-black text-xl tracking-tight text-slate-900">Shopping List</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-24 pb-32 space-y-4 animate-in fade-in duration-500">
                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-bold animate-pulse">Loading List...</div>
                ) : (
                    <>
                        {!isGuest && (
                            <form onSubmit={handleAddItem} className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Add item..."
                                    className="flex-1 bg-transparent px-4 font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none"
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                />
                                <button type="submit" disabled={!newItemName.trim()} className="w-10 h-10 bg-rose-600 rounded-xl text-white flex items-center justify-center shadow-lg shadow-rose-200 hover:scale-105 transition-transform">
                                    <i className="fas fa-plus"></i>
                                </button>
                            </form>
                        )}
                        {isGuest && (
                            <div className="text-center mb-4 p-4 bg-slate-100 rounded-2xl text-slate-500 text-sm font-bold">
                                Shopping List is generic for the Kitchen (Read Only)
                            </div>
                        )}

                        <div className="space-y-4">
                            {items.length === 0 && (
                                <div className="text-center py-20 opacity-50">
                                    <i className="fas fa-leaf text-4xl mb-4 text-slate-300"></i>
                                    <p className="font-bold text-slate-400">All caught up!</p>
                                </div>
                            )}

                            {items.map((item: any) => (
                                <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div
                                            onClick={() => !isGuest && handleToggleCheck(item)}
                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${!isGuest ? 'cursor-pointer' : 'cursor-default'} ${item.checked ? 'bg-rose-500 border-rose-500 text-white' : 'border-slate-200 hover:border-rose-400'}`}
                                        >
                                            {item.checked && <i className="fas fa-check text-xs"></i>}
                                        </div>
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <p className={`font-bold transition-all ${item.checked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</p>
                                                {(item.quantity || item.unit) && (
                                                    <span className={`text-xs font-medium ${item.checked ? 'text-slate-300' : 'text-slate-500'}`}>
                                                        {item.quantity} {item.unit}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2 mt-1">
                                                {item.pantryItem && (
                                                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                                                        From Pantry ({item.pantryItem.replenishmentRule})
                                                    </span>
                                                )}
                                                {item.recipeItems?.length > 0 && (
                                                    <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                        For {item.recipeItems.length} Recipe(s)
                                                    </span>
                                                )}
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
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
