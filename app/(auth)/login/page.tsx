'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export default function LoginPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || t('common.error'));
            }

            // Force a hard refresh to update server components/middleware state if needed,
            // or just push to home. Simple push is usually enough if middleware checks cookies.
            router.push('/');
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mb-6 shadow-lg shadow-rose-100">
                        <i className="fas fa-utensils text-2xl"></i>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('auth.loginTitle')}</h1>
                    <p className="text-slate-500 font-medium">{t('auth.loginSubtitle')}</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.email')}</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700 bg-slate-50/50"
                            placeholder={t('members.emailPlaceholder')}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.password')}</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-0 outline-none transition-colors font-medium text-slate-700 bg-slate-50/50"
                            placeholder="••••••••"
                        />
                        <div className="text-right mt-2">
                            <Link href="/recover" className="text-sm font-bold text-rose-600 hover:text-rose-700">
                                {t('auth.forgotPassword')}
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-lg shadow-rose-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <i className="fas fa-circle-notch fa-spin"></i> : t('auth.loginBtn')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <p className="text-slate-500 font-medium">
                        {t('auth.noAccount')}{' '}
                        <Link href="/register" className="text-rose-600 font-black hover:underline">
                            {t('auth.signupBtn')}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
