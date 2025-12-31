'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

export default function RecoverPage() {
    const { t, lang } = useTranslation();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        // Simulate API call
        try {
            const res = await fetch('/api/auth/recover', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, language: lang }),
            });
            const data = await res.json();
            setMessage(data.message);
            setStatus('success');
        } catch (e) {
            setMessage(t('common.error'));
            setStatus('idle'); // Or error state
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fas fa-check text-2xl"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-4">{t('auth.checkEmailTitle')}</h2>
                    <p className="text-slate-600 mb-8">{message}</p>
                    <Link href="/login" className="block w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                        {t('auth.backToLogin')}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('auth.recoverTitle')}</h1>
                    <p className="text-slate-500 font-medium">{t('auth.recoverSubtitle')}</p>
                </div>

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

                    <button
                        type="submit"
                        disabled={status === 'loading'}
                        className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-lg shadow-rose-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {status === 'loading' ? <i className="fas fa-circle-notch fa-spin"></i> : t('auth.sendInstructions')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <Link href="/login" className="text-slate-400 font-bold hover:text-slate-600 text-sm">
                        &larr; {t('auth.backToLogin')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
