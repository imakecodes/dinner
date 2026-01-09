'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '@/components/Sidebar';
import { storageService } from '@/services/storageService';
import { KitchenMember, Kitchen } from '@/types';
import { TagInput } from '@/components/ui/TagInput';
import { ConfirmDialog } from '@/components/ConfirmDialog';

import { useTranslation } from '@/hooks/useTranslation';

export default function MembersPage() {
    const { t } = useTranslation();
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [members, setMembers] = useState<KitchenMember[]>([]);
    const [kitchen, setKitchen] = useState<Kitchen | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberIsGuest, setNewMemberIsGuest] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [copied, setCopied] = useState(false);

    const [editingMember, setEditingMember] = useState<KitchenMember | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [currentUserMember, setCurrentUserMember] = useState<KitchenMember | null>(null);

    // Leave Kitchen State
    const [leaveTargetId, setLeaveTargetId] = useState<string | null>(null);
    const [isLeaving, setIsLeaving] = useState(false);

    // Controlled state for Tags
    const [likesTags, setLikesTags] = useState<string[]>([]);
    const [dislikesTags, setDislikesTags] = useState<string[]>([]);
    const [restrictionsTags, setRestrictionsTags] = useState<string[]>([]);

    useEffect(() => {
        loadMembers();
    }, []);

    const loadMembers = async () => {
        try {
            const data = await storageService.getKitchenMembers();
            setMembers(data);
            const kitchenData = await storageService.getCurrentKitchen();
            setKitchen(kitchenData);

            // Identify current user member
            const userProfile = await storageService.getCurrentUser();
            if (userProfile?.user?.id) {
                // Find member record linked to this user for the *current* kitchen
                // Note: The members list is already for the current kitchen context
                const currentMember = data.find(m => m.userId === userProfile.user.id);
                setCurrentUserMember(currentMember || null);
            }
        } catch (err) {
            console.error("Failed to load members", err);
        } finally {
            setLoading(false);
        }
    };

    // Calculate unique suggestions from existing members
    const { allLikes, allDislikes, allRestrictions } = useMemo(() => {
        const l = new Set<string>();
        const d = new Set<string>();
        const r = new Set<string>();
        members.forEach(m => {
            m.likes?.forEach(tag => l.add(tag));
            m.dislikes?.forEach(tag => d.add(tag));
            m.restrictions?.forEach(tag => r.add(tag));
        });
        return {
            allLikes: Array.from(l),
            allDislikes: Array.from(d),
            allRestrictions: Array.from(r)
        };
    }, [members]);

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemberName.trim()) return;

        setIsAdding(true);
        try {
            const memberData: any = {
                name: newMemberName,
                email: newMemberEmail || undefined,
                isGuest: newMemberIsGuest,
                likes: likesTags,
                dislikes: dislikesTags,
                restrictions: restrictionsTags
            };

            if (editingMember) {
                memberData.id = editingMember.id;
            }

            await storageService.saveMember(memberData);

            // Reset
            setNewMemberName('');
            setNewMemberEmail('');
            setNewMemberIsGuest(true);
            setEditingMember(null);
            setLikesTags([]);
            setDislikesTags([]);
            setRestrictionsTags([]);

            await loadMembers();
        } catch (err: any) {
            console.error("Failed to save member", err);
            alert(err.message || t('common.error'));
        } finally {
            setIsAdding(false);
        }
    };

    const handleEditClick = (member: KitchenMember) => {
        // Restriction: Guest can only edit themselves
        if (currentUserMember?.isGuest && currentUserMember.id !== member.id) {
            alert(t('members.guestEditError'));
            return;
        }

        setEditingMember(member);
        setNewMemberName(member.name);
        setNewMemberEmail(member.email || '');
        setNewMemberIsGuest(member.isGuest !== undefined ? member.isGuest : true);
        setLikesTags(member.likes || []);
        setDislikesTags(member.dislikes || []);
        setRestrictionsTags(member.restrictions || []);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingMember(null);
        setNewMemberName('');
        setNewMemberEmail('');
        setNewMemberIsGuest(true);
        setLikesTags([]);
        setDislikesTags([]);
        setRestrictionsTags([]);
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmDeleteId(id);
    };

    const confirmDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            await storageService.deleteMember(confirmDeleteId);
            if (editingMember?.id === confirmDeleteId) handleCancelEdit();
            await loadMembers();
        } catch (err) {
            console.error("Failed to delete member", err);
        } finally {
            setConfirmDeleteId(null);
        }
    };

    const handleShareCode = (platform: 'whatsapp' | 'telegram') => {
        if (!kitchen?.inviteCode) return;

        const text = `${t('members.shareCode')}: ${kitchen.inviteCode}`;
        const encodedText = encodeURIComponent(text);

        switch (platform) {
            case 'whatsapp': window.open(`https://wa.me/?text=${encodedText}`, '_blank'); break;
            case 'telegram': window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodedText}`, '_blank'); break;
        }
    };

    const confirmLeave = async () => {
        if (!leaveTargetId) return;
        setIsLeaving(true);
        try {
            await storageService.leaveKitchen(leaveTargetId);

            // Auto-switch logic (Fetch fresh user data to get full membership list)
            const userProfile = await storageService.getCurrentUser();
            const allMemberships = userProfile?.user?.kitchenMemberships || [];

            // We just left one, so filter it out if API hasn't cleared it yet (unlikely if we just fetched)
            // Actually, `getCurrentUser` might be slightly stale or current token issues. 
            // Better to fetch fresh? `getCurrentUser` fetches `/auth/me`.
            const remaining = allMemberships.filter((m: any) => m.id !== leaveTargetId);

            if (remaining.length > 0) {
                // Sort: ADMIN first
                const nextKitchen = remaining.sort((a: any, b: any) => {
                    if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
                    if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
                    return 0;
                })[0];

                await storageService.switchKitchen(nextKitchen.kitchenId);
                window.location.href = '/';
            } else {
                setMembers(prev => prev.filter(m => m.id !== leaveTargetId));
                window.location.reload();
            }
        } catch (err) {
            console.error("Failed to leave kitchen", err);
            alert(t('common.error'));
        } finally {
            setLeaveTargetId(null);
            setIsLeaving(false);
        }
    };

    // Fail-safe: If loading or user not found, assume guest/hidden to prevent flash
    const canShowForm = !loading && currentUserMember && (!currentUserMember.isGuest || (currentUserMember.isGuest && editingMember?.id === currentUserMember.id));

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-rose-100">
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setSidebarOpen(false)}
                onNavigate={(view) => {
                    if (view !== 'members') {
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
                        <h1 className="font-black text-xl tracking-tight text-slate-900">{t('members.title')}</h1>
                    </div>
                </div>
            </header>



            <main className="max-w-7xl mx-auto px-4 pt-24 pb-32 space-y-4 animate-in fade-in duration-500">
                {kitchen?.inviteCode && currentUserMember && !currentUserMember.isGuest && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 text-center space-y-2 mb-6">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">{t('kitchens.inviteCode')}</h3>
                        <div
                            onClick={() => {
                                navigator.clipboard.writeText(kitchen.inviteCode || '');
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="text-4xl font-black text-indigo-900 cursor-pointer hover:scale-105 transition-transform active:scale-95 flex items-center justify-center gap-3"
                            title={t('members.clickToCopy')}
                        >
                            {kitchen.inviteCode}
                            <i className={`fas ${copied ? 'fa-check text-green-500' : 'fa-copy text-indigo-300'} text-xl transition-all`}></i>
                        </div>
                        <p className="text-xs text-indigo-400 font-medium pb-2">{t('members.shareCode')}</p>

                        <div className="flex justify-center gap-3 pt-2">
                            <button
                                onClick={() => handleShareCode('whatsapp')}
                                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                            >
                                <i className="fab fa-whatsapp text-lg"></i> WhatsApp
                            </button>
                            <button
                                onClick={() => handleShareCode('telegram')}
                                className="px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
                            >
                                <i className="fab fa-telegram text-lg"></i> Telegram
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20 text-slate-400 font-bold animate-pulse">{t('common.loading')}</div>
                ) : (
                    <>
                        {/* Manage Member Form (Moved to Top) - Show if Admin OR if Guest matches Edited Member */}
                        {canShowForm ? (
                            <section className={`bg-white p-4 rounded-3xl shadow-xl border-2 transition-all ${editingMember ? 'border-rose-500 ring-4 ring-rose-50' : 'border-slate-100'}`}>
                                <h2 className="font-bold text-lg text-slate-900 mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center text-rose-600 text-sm">
                                            <i className={`fas ${editingMember ? 'fa-user-edit' : 'fa-user-plus'}`}></i>
                                        </span>
                                        {editingMember ? t('members.editMember') : t('members.addMember')}
                                    </div>
                                    {editingMember && (
                                        <button onClick={handleCancelEdit} className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider">
                                            {t('common.cancel')}
                                        </button>
                                    )}
                                </h2>
                                <form onSubmit={handleSaveMember} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Name Field */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('members.name')}</label>
                                            <input
                                                type="text"
                                                placeholder={t('members.namePlaceholder')}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all placeholder:text-slate-300 placeholder:font-medium"
                                                value={newMemberName}
                                                onChange={(e) => setNewMemberName(e.target.value)}
                                                name="name" // Added name attribute
                                                required
                                                maxLength={50}
                                            />
                                        </div>

                                        {/* Email Field */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('members.emailOptional')}</label>
                                            <input
                                                type="email"
                                                placeholder={t('members.emailPlaceholder')}
                                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 font-medium text-slate-900 focus:outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-50 transition-all placeholder:text-slate-300 placeholder:font-medium"
                                                name="email"
                                                value={newMemberEmail} // Controlled by state
                                                onChange={(e) => setNewMemberEmail(e.target.value)} // Update state
                                                maxLength={100}
                                            />
                                        </div>
                                    </div>

                                    {/* Preferences Fields - Stacked Vertical */}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('members.likes')}</label>
                                            <TagInput
                                                key={`likes-${editingMember?.id || 'new'}`}
                                                tags={likesTags}
                                                setTags={setLikesTags}
                                                suggestions={allLikes}
                                                placeholder={t('members.likesPlaceholder')}
                                                icon="fa-heart"
                                                chipColorClass="bg-emerald-100 text-emerald-700 border border-emerald-200"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('members.dislikes')}</label>
                                            <TagInput
                                                key={`dislikes-${editingMember?.id || 'new'}`}
                                                tags={dislikesTags}
                                                setTags={setDislikesTags}
                                                suggestions={allDislikes}
                                                placeholder={t('members.dislikesPlaceholder')}
                                                icon="fa-thumbs-down"
                                                chipColorClass="bg-slate-100 text-slate-600 border border-slate-200"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{t('members.restrictions')}</label>
                                            <TagInput
                                                key={`restrictions-${editingMember?.id || 'new'}`}
                                                tags={restrictionsTags}
                                                setTags={setRestrictionsTags}
                                                suggestions={allRestrictions}
                                                placeholder={t('members.restrictionsPlaceholder')}
                                                icon="fa-ban"
                                                chipColorClass="bg-rose-100 text-rose-700 border border-rose-200"
                                            />
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-2 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-slate-400 uppercase">{t('members.role')}:</span>
                                            {!currentUserMember?.isGuest ? (
                                                <>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            name="isGuest"
                                                            className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 border-gray-300"
                                                            checked={newMemberIsGuest} // Controlled by state
                                                            onChange={(e) => setNewMemberIsGuest(e.target.checked)} // Update state
                                                            disabled={editingMember?.role === 'ADMIN'}
                                                        />
                                                        <span className="text-sm font-medium text-slate-700">{t('members.guest')}</span>
                                                    </label>
                                                    {/* Helper text for Admin */}
                                                    {editingMember?.role === 'ADMIN' && (
                                                        <span className="text-[10px] uppercase font-black text-amber-500 bg-amber-50 px-2 py-1 rounded ml-2">
                                                            {t('members.adminCannotBeGuest')}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-sm font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{t('members.guest')}</span>
                                            )}
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={!newMemberName.trim() || isAdding}
                                            className={`px-4 py-4 text-white rounded-xl font-bold shadow-lg transition-all w-full md:w-auto ${editingMember ? 'bg-slate-900 hover:bg-black shadow-slate-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'} disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {isAdding ? <i className="fas fa-spinner fa-spin"></i> : (editingMember ? t('common.save') : t('members.addMember'))}
                                        </button>
                                    </div>

                                    <p className="text-center text-xs text-slate-400 font-medium">
                                        {editingMember ? t('members.saveBoxGuest') : t('members.saveBoxAdd')}
                                    </p>
                                </form>
                            </section>
                        ) : (
                            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 text-center mb-6">
                                <p className="text-blue-600 font-bold mb-2">{t('members.guestViewTitle')}</p>
                                <p className="text-xs text-blue-400">{t('members.guestViewDesc')}</p>
                            </div>
                        )}

                        {/* Member List */}
                        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">{t('members.whoIs')}</h2>
                            <div className="grid gap-4">
                                {members.length === 0 && <div className="text-slate-500 font-medium text-center py-4 bg-white rounded-3xl border border-slate-100 italic">{t('members.noMembers')}</div>}

                                {members.map((m) => (
                                    <div
                                        key={m.id}
                                        onClick={(!currentUserMember?.isGuest || currentUserMember?.id === m.id) ? () => handleEditClick(m) : undefined}
                                        className={`bg-white p-4 rounded-3xl shadow-sm border-2 transition-all ${editingMember?.id === m.id ? 'border-rose-500 bg-rose-50/30' : 'border-slate-100'} ${(!currentUserMember?.isGuest || currentUserMember?.id === m.id) ? 'cursor-pointer group hover:border-rose-200' : 'opacity-50 cursor-not-allowed'}`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner font-black ${editingMember?.id === m.id ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-600'}`}>
                                                    {m.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-xl text-slate-900">{m.name}</h3>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${m.role === 'ADMIN' ? 'bg-amber-100 text-amber-600 border-amber-200' : m.isGuest ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-indigo-100 text-indigo-600 border-indigo-200'}`}>
                                                            {m.role === 'ADMIN' ? t('members.owner') : m.isGuest ? t('members.guest') : t('members.member')}
                                                        </span>
                                                    </div>
                                                    {m.email && (
                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mt-0.5">
                                                            <i className="fas fa-envelope text-[10px]"></i>
                                                            {m.email}
                                                            {!m.userId && <span className="text-orange-500 bg-orange-50 px-1.5 rounded ml-1">{t('members.pending')}</span>}
                                                            {m.userId && <span className="text-indigo-500 bg-indigo-50 px-1.5 rounded ml-1">{t('members.linked')}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Hide Remove button for Guests */}
                                            {!currentUserMember?.isGuest && m.isGuest && m.role !== 'ADMIN' && (
                                                <button
                                                    onClick={(e) => handleDeleteClick(m.id, e)}
                                                    className="w-10 h-10 rounded-xl hover:bg-rose-100 text-slate-300 hover:text-rose-600 flex items-center justify-center transition-colors"
                                                    title={t('members.remove')}
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            )}

                                            {/* Leave Button for Current User (Non-Admin) */}
                                            {currentUserMember?.id === m.id && m.role !== 'ADMIN' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLeaveTargetId(m.id);
                                                    }}
                                                    className="w-10 h-10 rounded-xl hover:bg-amber-100 text-slate-300 hover:text-amber-600 flex items-center justify-center transition-colors"
                                                    title={t('kitchens.leave') || "Leave"}
                                                >
                                                    <i className="fas fa-sign-out-alt"></i>
                                                </button>
                                            )}
                                        </div>

                                        {/* 3-Column Preferences Grid */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100/50 pt-4 mt-2">
                                            {/* Likes */}
                                            <div className="bg-slate-50/50 rounded-xl p-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1">
                                                    <i className="fas fa-heart"></i> {t('members.likes')}
                                                </h4>
                                                <div className="flex flex-col gap-1.5">
                                                    {m.likes?.length ? m.likes.map((l, i) => (
                                                        <span key={i} className="text-xs font-bold text-emerald-800 bg-emerald-100/50 px-2 py-1 rounded-md inline-block w-fit">
                                                            {l}
                                                        </span>
                                                    )) : <span className="text-xs text-slate-300 italic">{t('members.none')}</span>}
                                                </div>
                                            </div>

                                            {/* Dislikes */}
                                            <div className="bg-slate-50/50 rounded-xl p-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-1">
                                                    <i className="fas fa-thumbs-down"></i> {t('members.dislikes')}
                                                </h4>
                                                <div className="flex flex-col gap-1.5">
                                                    {m.dislikes?.length ? m.dislikes.map((d, i) => (
                                                        <span key={i} className="text-xs font-bold text-slate-600 bg-slate-200/50 px-2 py-1 rounded-md inline-block w-fit">
                                                            {d}
                                                        </span>
                                                    )) : <span className="text-xs text-slate-300 italic">{t('members.none')}</span>}
                                                </div>
                                            </div>

                                            {/* Restrictions */}
                                            <div className="bg-slate-50/50 rounded-xl p-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-2 flex items-center gap-1">
                                                    <i className="fas fa-ban"></i> {t('members.restrictions')}
                                                </h4>
                                                <div className="flex flex-col gap-1.5">
                                                    {m.restrictions?.length ? m.restrictions.map((r, i) => (
                                                        <span key={i} className="text-xs font-bold text-rose-700 bg-rose-100/50 px-2 py-1 rounded-md inline-block w-fit">
                                                            {r}
                                                        </span>
                                                    )) : <span className="text-xs text-slate-300 italic">{t('members.safe')}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </main>

            <ConfirmDialog
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={confirmDelete}
                title={t('members.removeConfirmTitle')}
                message={t('members.removeConfirmMsg')}
            />

            {/* Leave Confirmation Modal */}
            {leaveTargetId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-xl mx-auto">
                            <i className="fas fa-sign-out-alt"></i>
                        </div>
                        <div className="text-center space-y-2">
                            <h3 className="text-lg font-bold text-slate-900">{t('kitchens.leaveTitle') || 'Leave Kitchen?'}</h3>
                            <p className="text-sm text-slate-500">{t('kitchens.leaveConfirm') || 'Are you sure you want to leave?'}</p>
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
                                {t('kitchens.leave') || 'Leave'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
