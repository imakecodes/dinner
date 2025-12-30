'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { storageService } from '@/services/storageService';
import { useTranslation } from '@/hooks/useTranslation';

export default function KitchensPage() {
    const { t } = useTranslation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [newKitchenName, setNewKitchenName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const u = await storageService.getCurrentUser();
            if (u && u.user) setUser(u.user);
        } catch (err) {
            console.error("Failed to load user", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKitchen = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newKitchenName.trim()) return;

        try {
            await storageService.createKitchen(newKitchenName);
            setNewKitchenName('');
            await loadData(); // Reload list
        } catch (err) {
            console.error("Failed to create kitchen", err);
        }
    };

    const handleSwitchKitchen = async (kitchenId: string) => {
        try {
            await storageService.switchKitchen(kitchenId);
            window.location.reload();
        } catch (err) {
            console.error("Failed to switch kitchen", err);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-rose-100">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onNavigate={(view) => {
                    if (view !== 'kitchens') {
                        window.location.href = view === 'home' ? '/' : `/${view}`;
                    }
                }}
            />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="w-10 h-10 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors"
                        >
                            <i className="fas fa-bars"></i>
                        </button>
                        <h1 className="font-black text-xl tracking-tight text-slate-900">{t('kitchens.title')}</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 pt-24 pb-32 space-y-4 animate-in fade-in duration-500">
                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-bold animate-pulse">{t('kitchens.loading')}</div>
                ) : (
                    <>
                        {/* Current Membership List */}
                        <section className="space-y-4">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">{t('kitchens.yourKitchens')}</h2>
                            <div className="grid gap-4">
                                {user?.kitchenMemberships?.map((m: any) => (
                                    <div key={m.id} className={`bg-white p-4 rounded-3xl shadow-sm border-2 flex flex-col md:flex-row items-start md:items-center justify-between transition-all gap-4 ${m.kitchenId === user.currentKitchenId ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-100 hover:border-slate-200'}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${m.kitchenId === user.currentKitchenId ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <i className="fas fa-utensils"></i>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900">{m.kitchen.name}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {m.kitchenId === user.currentKitchenId && <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] uppercase font-bold rounded-full tracking-wide">{t('kitchens.active')}</span>}
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] uppercase font-bold rounded-full tracking-wide">{m.role || 'MEMBER'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 w-full md:w-auto">
                                            {/* Invite Code Section */}
                                            <div className="flex-1 md:flex-none flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{t('kitchens.inviteCode')}</span>
                                                    <span className="font-mono font-bold text-slate-700 tracking-wider text-sm">{m.kitchen.inviteCode || 'N/A'}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(m.kitchen.inviteCode || '');
                                                        // Simple alert for now, or use a toast if available
                                                        alert('Code copied!');
                                                    }}
                                                    className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                                                    title="Copy Code"
                                                >
                                                    <i className="fas fa-copy"></i>
                                                </button>
                                                {m.role === 'ADMIN' && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm(t('kitchens.regenerateConfirm'))) return;
                                                            const { refreshKitchenCode } = await import('@/app/actions');
                                                            const result = await refreshKitchenCode(m.kitchenId);
                                                            if (result.success) {
                                                                await loadData();
                                                            } else {
                                                                alert(result.error);
                                                            }
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                                                        title="Regenerate Code"
                                                    >
                                                        <i className="fas fa-sync-alt"></i>
                                                    </button>
                                                )}
                                            </div>

                                            {m.kitchenId !== user.currentKitchenId && (
                                                <button
                                                    onClick={() => handleSwitchKitchen(m.kitchenId)}
                                                    className="px-4 py-3 md:py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition-colors whitespace-nowrap"
                                                >
                                                    {t('kitchens.switch')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Create New Kitchen */}
                        <section className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 mt-4">
                            <h2 className="font-bold text-lg text-slate-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 text-sm"><i className="fas fa-plus"></i></span>
                                {t('kitchens.createTitle')}
                            </h2>
                            <form onSubmit={handleCreateKitchen} className="flex gap-3">
                                <input
                                    type="text"
                                    placeholder={t('kitchens.createPlaceholder')}
                                    className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all placeholder:text-slate-300 placeholder:font-medium"
                                    value={newKitchenName}
                                    onChange={(e) => setNewKitchenName(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    disabled={!newKitchenName.trim()}
                                    className="px-6 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-200 transition-all"
                                >
                                    {t('kitchens.create')}
                                </button>
                            </form>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}
