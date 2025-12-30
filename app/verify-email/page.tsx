'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { t } = useTranslation();

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage(t('auth.invalidLink'));
            return;
        }

        const verify = async () => {
            try {
                const res = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });

                const data = await res.json();

                if (res.ok) {
                    setStatus('success');
                } else {
                    setStatus('error');
                    setMessage(data.error || t('auth.verifyFailed'));
                }
            } catch (err) {
                setStatus('error');
                setMessage(t('auth.networkError'));
            }
        };

        verify();
    }, [token, router, t]);

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
            <h1 className="text-2xl font-bold mb-4 text-slate-800">{t('auth.verifyTitle')}</h1>

            {status === 'verifying' && (
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-slate-600">{t('auth.verifying')}</p>
                </div>
            )}

            {status === 'success' && (
                <div className="text-green-600">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-lg font-bold text-slate-800">{t('auth.accountVerified')}</p>
                    <p className="text-slate-600 mt-2 mb-6">{t('auth.verifiedMsg')}</p>

                    <Link
                        href="/login"
                        className="inline-block w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md transition-colors"
                    >
                        {t('auth.goToLogin')}
                    </Link>
                </div>
            )}

            {status === 'error' && (
                <div className="text-red-500">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">{t('auth.verifyFailed')}</p>
                    <p className="text-slate-600 mt-2">{message}</p>
                    <Link href="/login" className="mt-6 inline-block text-orange-600 hover:text-orange-700 font-medium">
                        {t('auth.backToLogin')}
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background decoration matching login/register */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-orange-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 w-full flex justify-center px-4">
                <Suspense fallback={<div className="text-center text-slate-500">Loading...</div>}>
                    <VerifyEmailContent />
                </Suspense>
            </div>
        </div>
    );
}
