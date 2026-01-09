'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import { storageService } from '@/services/storageService';
import { useTranslation } from '@/hooks/useTranslation';
import { ShareButtons } from '@/components/ShareButtons';

export default function KitchensPage() {
    const { t } = useTranslation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [newKitchenName, setNewKitchenName] = useState('');
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

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
        } finally {
            window.dispatchEvent(new Event('kitchens-updated'));
        }
    };

    const handleSwitchKitchen = async (kitchenId: string) => {
        try {
            await storageService.switchKitchen(kitchenId);
            window.location.href = '/';
        } catch (err) {
            console.error("Failed to switch kitchen", err);
        }
    };

    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Leave Kitchen State
    const [leaveTargetId, setLeaveTargetId] = useState<string | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);

    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [editingKitchenId, setEditingKitchenId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const handleEditStart = (kitchen: any) => {
        setEditingKitchenId(kitchen.id);
        setEditName(kitchen.name);
    };

    const handleEditSave = async (kitchenId: string) => {
        try {
            await storageService.updateKitchen(kitchenId, editName);
            setEditingKitchenId(null);
            await loadData();
            window.dispatchEvent(new Event('kitchens-updated'));
        } catch (err) {
            console.error("Failed to update kitchen", err);
            setErrorMessage(t('common.error') || "Failed to update kitchen");
            setTimeout(() => setErrorMessage(null), 3000);
        }
    };

    const handleDeleteClick = (kitchenId: string) => {
        setDeleteTargetId(kitchenId);
    };

    const confirmDelete = async () => {
        if (!deleteTargetId) return;
        setIsDeleting(true);
        try {
            await storageService.deleteKitchen(deleteTargetId);
            await loadData();
            window.dispatchEvent(new Event('kitchens-updated'));
            if (user?.currentKitchenId === deleteTargetId) {
                window.location.reload();
            }
            setDeleteTargetId(null);
        } catch (err) {
            console.error("Failed to delete kitchen", err);
            setErrorMessage(t('common.error') || "Failed to delete kitchen");
            setTimeout(() => setErrorMessage(null), 3000);
        } finally {
            setIsDeleting(false);
        }
    };

    const confirmLeave = async () => {
        if (!leaveTargetId) return;
        setIsLeaving(true);
        try {
            await storageService.leaveKitchen(leaveTargetId);

            // Auto-switch logic
            // We need updated memberships. Since query is stale, we filter locally from `user.kitchenMemberships`
            const remaining = user?.kitchenMemberships?.filter((m: any) => m.id !== leaveTargetId) || [];

            if (remaining.length > 0) {
                // Sort: ADMIN first, then others. Assuming existing order is chronological or ID based.
                const nextKitchen = remaining.sort((a: any, b: any) => {
                    if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
                    if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
                    return 0;
                })[0];

                await storageService.switchKitchen(nextKitchen.kitchenId);
                window.location.href = '/';
            } else {
                // No kitchens left
                await loadData();
                window.location.reload();
            }

            setLeaveTargetId(null);
        } catch (err) {
            console.error("Failed to leave kitchen", err);
            setErrorMessage(t('common.error') || "Failed to leave kitchen");
            setTimeout(() => setErrorMessage(null), 3000);
        } finally {
            setIsLeaving(false);
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

            {/* Error Toast */}
            {errorMessage && (
                <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg animate-in slide-in-from-top-2 fade-in duration-300 flex items-center gap-2">
                    <i className="fas fa-exclamation-circle"></i>
                    {errorMessage}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTargetId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xl mx-auto">
                            <i className="fas fa-trash-alt"></i>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-slate-900">{t('kitchens.deleteTitle')}</h3>
                            <p className="text-sm text-slate-500">{t('kitchens.deleteConfirm')}</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setDeleteTargetId(null)}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting && <i className="fas fa-spinner fa-spin"></i>}
                                {t('common.delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Confirmation Modal */}
            {leaveTargetId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xl mx-auto">
                            <i className="fas fa-sign-out-alt"></i>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-slate-900">{t('kitchens.leaveTitle')}</h3>
                            <p className="text-sm text-slate-500">{t('kitchens.leaveConfirm')}</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setLeaveTargetId(null)}
                                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmLeave}
                                disabled={isLeaving}
                                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLeaving && <i className="fas fa-spinner fa-spin"></i>}
                                {t('kitchens.leave')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            <main className="max-w-7xl mx-auto px-4 pt-24 pb-32 space-y-4 animate-in fade-in duration-500">
                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-bold animate-pulse">{t('kitchens.loading')}</div>
                ) : (
                    <>
                        {/* Create New Kitchen */}
                        <section className="max-w-3xl mx-auto bg-white p-4 rounded-3xl shadow-xl border border-slate-100 mb-8 w-full">
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

                        {/* Current Membership List */}
                        <section className="space-y-4">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">{t('kitchens.yourKitchens')}</h2>
                            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-2">
                                {user?.kitchenMemberships?.filter((m: any) => !m.kitchen.deletedAt).map((m: any) => (
                                    <div key={m.id} className={`bg-white p-6 rounded-3xl shadow-sm border-2 flex flex-col gap-6 transition-all ${m.kitchenId === user.currentKitchenId ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-100 hover:border-slate-200'}`}>

                                        {/* Row 1: Header (Icon + Info + Actions) */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner flex-shrink-0 ${m.kitchenId === user.currentKitchenId ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <i className="fas fa-utensils"></i>
                                                </div>
                                                <div className="flex-1">
                                                    {editingKitchenId === m.kitchen.id ? (
                                                        <div className="flex flex-col gap-2 min-w-[200px]">
                                                            <input
                                                                className="bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-900 text-base w-full focus:border-rose-500 focus:outline-none transition-colors"
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleEditSave(m.kitchen.id);
                                                                    if (e.key === 'Escape') setEditingKitchenId(null);
                                                                }}
                                                            />
                                                            <div className="flex gap-2">
                                                                <button onClick={() => handleEditSave(m.kitchen.id)} className="px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-bold transition-colors">
                                                                    <i className="fas fa-check mr-1"></i> {t('common.save')}
                                                                </button>
                                                                <button onClick={() => setEditingKitchenId(null)} className="px-3 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">
                                                                    <i className="fas fa-times mr-1"></i> {t('common.cancel')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <h3 className="font-bold text-lg text-slate-900 leading-tight">{m.kitchen.name}</h3>
                                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                {m.kitchenId === user.currentKitchenId && <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] uppercase font-bold rounded-full tracking-wide">{t('kitchens.active')}</span>}
                                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] uppercase font-bold rounded-full tracking-wide">{m.role || 'MEMBER'}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions (Switch, Edit, Delete) - Grouped to right */}
                                            <div className="flex items-center gap-2">
                                                {m.role === 'ADMIN' && !editingKitchenId && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditStart(m.kitchen)}
                                                            className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
                                                            title="Edit Kitchen"
                                                        >
                                                            <i className="fas fa-pen"></i>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(m.kitchen.id)}
                                                            className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-rose-50 border border-slate-200 rounded-xl text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors"
                                                            title="Delete Kitchen"
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </>
                                                )}
                                                {m.kitchenId !== user.currentKitchenId && !editingKitchenId && (
                                                    <button
                                                        onClick={() => handleSwitchKitchen(m.kitchenId)}
                                                        className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors whitespace-nowrap"
                                                    >
                                                        {t('kitchens.switch')}
                                                    </button>
                                                )}
                                            </div>
                                            {m.role !== 'ADMIN' && !editingKitchenId && (
                                                <button
                                                    onClick={() => setLeaveTargetId(m.id)}
                                                    className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-red-50 border border-slate-200 rounded-xl text-slate-400 hover:text-red-600 hover:border-red-200 transition-colors"
                                                    title={t('kitchens.leave') || "Leave Kitchen"}
                                                >
                                                    <i className="fas fa-sign-out-alt"></i>
                                                </button>
                                            )}
                                        </div>

                                        {/* Row 2: Invite Code (Full Width or block) */}
                                        {/* Hide for guests */}
                                        {!m.isGuest && (
                                            <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">{t('kitchens.inviteCode')}</span>
                                                    <span className="font-mono font-bold text-slate-800 tracking-wider text-base select-all">{m.kitchen.inviteCode || 'N/A'}</span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(m.kitchen.inviteCode);
                                                            setCopiedId(m.id);
                                                            setTimeout(() => setCopiedId(null), 2000);
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm active:scale-95"
                                                        title={t('members.clickToCopy')}
                                                    >
                                                        <i className={`fas ${copiedId === m.id ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                                                    </button>

                                                    {/* Social Share Buttons */}
                                                    <ShareButtons
                                                        text={`${t('members.shareCode')} ${m.kitchen.inviteCode}`}
                                                    />

                                                    {m.role === 'ADMIN' && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!confirm(t('kitchens.regenerateConfirm'))) return;
                                                                const { refreshKitchenCode } = await import('@/app/actions');
                                                                const result = await refreshKitchenCode(m.kitchenId);
                                                                if (result.success) {
                                                                    await loadData();
                                                                } else {
                                                                    console.error(result.error);
                                                                }
                                                            }}
                                                            className="w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm"
                                                            title="Regenerate Code"
                                                        >
                                                            <i className="fas fa-sync-alt"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Member Management Shortcut (Active Kitchen Only) */}
                                        {m.kitchenId === user.currentKitchenId && (
                                            <div className="flex justify-end pt-2 border-t border-slate-100">
                                                <a
                                                    href="/members"
                                                    className="flex items-center gap-2 text-rose-500 hover:text-rose-600 text-sm font-bold transition-colors group"
                                                >
                                                    <span className="group-hover:underline">{t('nav.members')}</span>
                                                    <i className="fas fa-arrow-right transform group-hover:translate-x-1 transition-transform"></i>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>


                    </>
                )}
            </main>
        </div>
    );
}
