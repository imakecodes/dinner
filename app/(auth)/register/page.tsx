'use client';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

function RegisterForm() {
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    // Populate email from URL if present
    useEffect(() => {
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setFormData(prev => ({ ...prev, email: emailParam }));
        }
    }, [searchParams]);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError(t('settings.passwordsMismatch'));
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    surname: formData.surname,
                    email: formData.email,
                    password: formData.password
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || t('common.error'));
            }

            // Show success message
            setSuccess(true);
            setFormData({ name: '', surname: '', email: '', password: '', confirmPassword: '' });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center">
                    <div className="mb-6">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">{t('auth.checkEmailTitle')}</h1>
                        <p className="text-slate-600">
                            {t('auth.checkEmailSent').replace('{email}', formData.email)}
                        </p>
                    </div>
                    <div className="space-y-4">
                        <p className="text-sm text-slate-500">
                            {t('auth.checkEmailSpam')}
                        </p>
                        <Link href="/login" className="block w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors">
                            {t('auth.backToLogin')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-10">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('auth.registerTitle')}</h1>
                    <p className="text-slate-500 font-medium">{t('auth.registerSubtitle')}</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.firstName')}</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700 bg-slate-50/50"
                                placeholder={t('members.namePlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.lastName')}</label>
                            <input
                                type="text"
                                required
                                value={formData.surname}
                                onChange={(e) => setFormData({ ...formData, surname: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700 bg-slate-50/50"
                                placeholder={t('members.namePlaceholder').replace("Grandma", "Doe")}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.email')}</label>
                        <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700 bg-slate-50/50"
                            placeholder={t('members.emailPlaceholder')}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.password')}</label>
                            <input
                                type="password"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700 bg-slate-50/50"
                                placeholder="••••••••"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.confirmPassword')}</label>
                            <input
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700 bg-slate-50/50"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? <i className="fas fa-circle-notch fa-spin"></i> : t('auth.signupBtn')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-slate-500 font-medium">
                        {t('auth.hasAccount')}{' '}
                        <Link href="/login" className="text-rose-600 font-black hover:underline">
                            {t('auth.loginBtn')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <i className="fas fa-circle-notch fa-spin text-4xl text-rose-500"></i>
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}

