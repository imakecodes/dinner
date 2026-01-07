"use client";

import React, { useEffect, useState, useCallback } from 'react';

import { storageService } from '../../services/storageService';
import { MeasurementSystem, Language } from '../../types';
import { useTranslation } from '@/hooks/useTranslation';
import { useApp } from '@/components/Providers';
import { PasswordFields } from '@/components/PasswordFields';
import { PasswordInput } from '@/components/PasswordInput';

export default function SettingsPage() {
    const [, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { t } = useTranslation();
    const { setLanguage: setGlobalLanguage, language: globalLanguage } = useApp();

    // Form State
    const [name, setName] = useState('');
    const [surname, setSurname] = useState('');
    const [email, setEmail] = useState('');
    const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('METRIC');
    const [language, setLanguage] = useState<Language>('en');
    const [password, setPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(true); 
    const [formResetKey, setFormResetKey] = useState(0); // Default true because empty is valid for settings

    const loadUser = useCallback(async () => {
        try {
            const data = await storageService.getCurrentUser();
            if (data && data.user) {
                setUser(data.user);
                setName(data.user.name);
                setSurname(data.user.surname);
                setEmail(data.user.email);
                setMeasurementSystem(data.user.measurementSystem || 'METRIC');
                setLanguage(data.user.language || 'en');
                setGlobalLanguage(data.user.language || 'en'); // Sync global state
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [setGlobalLanguage]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    // Sync from Global State -> Local Form State
    useEffect(() => {
        if (globalLanguage && globalLanguage !== language) {
            setLanguage(globalLanguage);
        }
    }, [globalLanguage, language]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setSaving(true);

        // Logic: 
        // 1. If password field is empty, isPasswordValid might be false (default from component if empty?), 
        //    BUT we want to allow saving if no password change is intended.
        //    However, our state `password` is updated.
        //    If `password` is NOT empty, we check `isPasswordValid`.
        //    If `password` IS empty, we proceed (no password update).
        
        if (password && !isPasswordValid) {
             // If password has content but is invalid (mismatch/short), blocking.
             // Rely on component to show error, but we also block here.
             setMessage({ type: 'error', text: t('settings.updateError') || 'Please fix the errors.' });
             setSaving(false);
             return;
        }

        try {
            const updates = {
                name,
                surname,
                measurementSystem,
                language,
                password: password || undefined,
                currentPassword: password ? currentPassword : undefined
            };

            await storageService.updateProfile(updates);
            setGlobalLanguage(language); // Update app state immediately

            setMessage({ type: 'success', text: t('settings.updateSuccess') });
            setPassword('');
            setCurrentPassword('');
            setFormResetKey(prev => prev + 1);
            
            // Reload to ensure sync
            loadUser();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || t('settings.updateError') });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <i className="fas fa-circle-notch fa-spin text-4xl text-rose-500"></i>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 mt-8 pb-20 space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('settings.title')}</h1>
                <p className="text-slate-500 font-medium">{t('settings.subtitle')}</p>
            </header>


            {message && (
                <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} text-lg`}></i>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">

                {/* Personal Information */}
                <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <i className="fas fa-user-circle text-rose-500"></i>
                        {t('settings.profile')}
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.firstName')}</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-700"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.lastName')}</label>
                            <input
                                type="text"
                                value={surname}
                                onChange={e => setSurname(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-700"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.email')}</label>
                        <input
                            type="email"
                            value={email}
                            disabled
                            className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 font-bold cursor-not-allowed"
                        />
                        <p className="text-[10px] text-slate-400 font-bold">{t('settings.emailNote')}</p>
                    </div>
                </section>

                {/* Preferences */}
                <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <i className="fas fa-sliders-h text-indigo-500"></i>
                        {t('settings.preferences')}
                    </h2>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.language')}</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setLanguage('en');
                                    setGlobalLanguage('en');
                                }}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all font-black flex flex-col items-center gap-2 ${language === 'en'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                                    }`}
                            >
                                <span className="text-2xl">🇺🇸</span>
                                English
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setLanguage('pt-BR');
                                    setGlobalLanguage('pt-BR');
                                }}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all font-black flex flex-col items-center gap-2 ${language === 'pt-BR'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                                    }`}
                            >
                                <span className="text-2xl">🇧🇷</span>
                                Português
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.measurement')}</label>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setMeasurementSystem('METRIC')}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all font-black flex flex-col items-center gap-2 ${measurementSystem === 'METRIC'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                                    }`}
                            >
                                <span className="text-2xl">⚖️</span>
                                Metric (g, ml)
                            </button>
                            <button
                                type="button"
                                onClick={() => setMeasurementSystem('IMPERIAL')}
                                className={`flex-1 p-4 rounded-xl border-2 transition-all font-black flex flex-col items-center gap-2 ${measurementSystem === 'IMPERIAL'
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-slate-100 bg-white text-slate-400 hover:border-slate-300'
                                    }`}
                            >
                                <span className="text-2xl">lbs</span>
                                Imperial (oz, lbs)
                            </button>
                        </div>
                    </div>
                </section>

                {/* Security */}
                <section className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                        <i className="fas fa-lock text-emerald-500"></i>
                        {t('settings.security')}
                    </h2>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('settings.currentPassword')}</label>
                        <PasswordInput 
                             value={currentPassword}
                             onChange={(e) => setCurrentPassword(e.target.value)}
                             placeholder="••••••••"
                             className="bg-slate-50"
                        />
                        <p className="text-[10px] text-slate-400 font-bold">{t('settings.currentPasswordNote')}</p>
                    </div>

                    <PasswordFields 
                        key={formResetKey}
                        showLabels={true}
                        onChange={(isValid, val) => {
                            setPassword(val);
                            setIsPasswordValid(isValid);
                        }} 
                    />
                </section>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving || (password.length > 0 && (!isPasswordValid || currentPassword.length === 0))}
                        className="px-8 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-colors shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                    >
                        {saving && <i className="fas fa-circle-notch fa-spin"></i>}
                        {saving ? t('common.loading') : t('common.save')}
                    </button>
                </div>

            </form>
        </div>
    );
}
