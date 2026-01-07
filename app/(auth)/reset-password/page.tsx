'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';
import { PasswordFields } from '@/components/PasswordFields';

function ResetPasswordForm() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'verifying'>('verifying'); // Start in verifying
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage(t('auth.invalidResetLink') || 'Invalid or missing reset token.');
            return;
        }

        // Verify token immediately
        const verifyToken = async () => {
            try {
                const res = await fetch(`/api/auth/verify-token?token=${token}`);
                const data = await res.json();

                if (!res.ok || !data.valid) {
                    if (res.status === 410 || data.error?.includes('expired')) {
                        setMessage(t('auth.tokenExpired') || 'This reset link has expired.');
                    } else {
                        setMessage(t('auth.invalidResetLink') || 'Invalid or missing reset token.');
                    }
                    setStatus('error');
                } else {
                    setStatus('idle'); // Valid, show form
                }
            } catch (err) {
                setStatus('error');
                setMessage(t('common.error'));
            }
        };

        verifyToken();
    }, [token, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isPasswordValid) return;

        setStatus('loading');
        setMessage('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setMessage(data.error || t('common.error'));
                setStatus('error');
                return;
            }

            // Password reset successful, now log the user in
            setStatus('success');
            setMessage(data.message || 'Password reset successfully! Redirecting...');

            // Redirect to login after a short delay
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err) {
            setMessage(t('common.error') || 'An error occurred.');
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fas fa-check text-2xl"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-4">{t('auth.passwordResetSuccess') || 'Password Reset!'}</h2>
                    <p className="text-slate-600 mb-8">{message}</p>
                    <Link href="/login" className="block w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                        {t('auth.backToLogin') || 'Back to Login'}
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fas fa-times text-2xl"></i>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 mb-4">{t('auth.invalidResetLink') || 'Invalid Link'}</h2>
                    <p className="text-slate-600 mb-8">{message}</p>
                    <Link href="/recover" className="block w-full py-4 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 transition-colors">
                        {t('auth.requestNewLink') || 'Request New Link'}
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'verifying') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="font-bold text-slate-500 animate-pulse">{t('auth.verifyingToken') || 'Verifying link...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{t('auth.resetPasswordTitle') || 'Reset Password'}</h1>
                    <p className="text-slate-500 font-medium">{t('auth.resetPasswordSubtitle') || 'Enter your new password below.'}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <PasswordFields
                        onChange={(isValid, val) => {
                            setIsPasswordValid(isValid);
                            setPassword(val);
                        }}
                    />



                    <button
                        type="submit"
                        disabled={status === 'loading' || !isPasswordValid}
                        className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-lg shadow-rose-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                    >
                        {status === 'loading' ? <i className="fas fa-circle-notch fa-spin"></i> : (t('auth.resetPassword') || 'Reset Password')}
                    </button>
                </form>

                <div className="mt-4 text-center">
                    <Link href="/login" className="text-slate-400 font-bold hover:text-slate-600 text-sm">
                        &larr; {t('auth.backToLogin') || 'Back to Login'}
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 border border-slate-100 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse"></div>
                    <div className="h-8 bg-slate-100 rounded-xl mb-4 animate-pulse"></div>
                    <div className="h-4 bg-slate-100 rounded-xl animate-pulse"></div>
                </div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    );
}
