'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { storageService } from '@/services/storageService';
import { useApp } from './Providers';
import { Language } from '@/types';

export const UserMenu: React.FC = () => {
    const router = useRouter();
    const { t, lang } = useTranslation();
    const { setLanguage } = useApp();
    const [user, setUser] = useState<any>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredKitchens = user?.kitchenMemberships?.filter((m: any) =>
        m.kitchen.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        loadUser();

        const handleKitchensUpdated = () => loadUser();
        window.addEventListener('kitchens-updated', handleKitchensUpdated);

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('kitchens-updated', handleKitchensUpdated);
        };
    }, []);

    const loadUser = async () => {
        try {
            const u = await storageService.getCurrentUser();
            if (u && u.user) setUser(u.user);
        } catch (err) {
            console.error("Failed to load user info", err);
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

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    if (!user) return null;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger */}
            <div
                className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-slate-100"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-bold shadow-sm border border-rose-200">
                    {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{user.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium truncate max-w-[100px]">
                        {user.kitchenMemberships?.find((m: any) => m.kitchenId === user.currentKitchenId)?.kitchen?.name || 'No Kitchen'}
                    </p>
                </div>
                <i className={`fas fa-chevron-down text-[10px] text-slate-300 transition-transform ${isDropdownOpen ? 'rotate-180' : ''} ml-1`}></i>
            </div>

            {/* Dropdown */}
            {isDropdownOpen && (
                <div className="absolute top-full right-0 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 zoom-in-95 z-50">
                    {/* User Info Header (Mobile/Extra) */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 block sm:hidden">
                        <p className="font-bold text-slate-900">{user.name} {user.surname}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                    </div>

                    {/* Kitchen Switcher */}
                    <div className="p-3 bg-white border-b border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('nav.switchKitchen')}</span>
                            <button
                                onClick={() => { setIsDropdownOpen(false); router.push('/kitchens'); }}
                                className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-lg"
                            >
                                <i className="fas fa-plus mr-1"></i>
                                {t('nav.newKitchen')}
                            </button>
                        </div>
                        {/* Search Input */}
                        <div className="relative">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                            <input
                                type="text"
                                placeholder={t('nav.searchKitchens')}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 pl-8 pr-3 text-xs font-bold text-slate-700 outline-none focus:border-rose-500 transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                        {filteredKitchens?.length === 0 ? (
                            <div className="p-4 text-center text-xs text-slate-400 font-medium italic">
                                No kitchens found
                            </div>
                        ) : (
                            // Limit to 10 results to avoid overwhelming the user
                            filteredKitchens?.slice(0, 10).map((m: any) => (
                                <button
                                    key={m.id}
                                    onClick={() => handleSwitchKitchen(m.kitchenId)}
                                    className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-rose-50 transition-colors flex items-center justify-between ${m.kitchenId === user.currentKitchenId ? 'text-rose-600 bg-rose-50/50' : 'text-slate-600'}`}
                                >
                                    <span className="truncate mr-2">{m.kitchen.name}</span>
                                    {m.kitchenId === user.currentKitchenId && <i className="fas fa-check text-rose-500 text-xs"></i>}
                                </button>
                            ))
                        )}
                        {filteredKitchens?.length > 10 && (
                            <div className="p-2 text-center text-[10px] text-slate-400 font-medium border-t border-slate-50">
                                ...and {filteredKitchens.length - 10} more. Search to find.
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-slate-100 my-0"></div>

                    {/* Actions */}
                    <div className="p-2 space-y-1">
                        {/* Language Selector */}
                        <div className="px-4 py-2 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">{t('nav.language') || 'Language'}</span>
                            <select
                                value={lang}
                                onChange={(e) => {
                                    const newLang = e.target.value as Language;
                                    setLanguage(newLang);
                                    if (user) {
                                        const { name, surname, measurementSystem } = user;
                                        storageService.updateProfile({ name, surname, measurementSystem, language: newLang }).catch(console.error);
                                    }
                                }}
                                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 py-1 pl-2 pr-6 outline-none focus:border-rose-500 hover:border-slate-300 transition-colors cursor-pointer appearance-none"
                                style={{ backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.25rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1rem' }}
                            >
                                <option value="en">🇺🇸 English</option>
                                <option value="pt-BR">🇧🇷 Português</option>
                            </select>
                        </div>

                        <button
                            onClick={() => { setIsDropdownOpen(false); router.push('/settings'); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                        >
                            <i className="fas fa-cog w-4 text-center text-slate-400"></i>
                            {t('nav.settings')}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-rose-600 font-bold hover:bg-rose-50 transition-colors text-sm"
                        >
                            <i className="fas fa-sign-out-alt w-4 text-center"></i>
                            {t('nav.logout')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
