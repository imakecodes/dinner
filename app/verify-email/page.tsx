'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenFromParams = searchParams.get('token');
    // Fallback to window.location.search for better compatibility
    const token = tokenFromParams || 
        (typeof window !== 'undefined' 
            ? new URLSearchParams(window.location.search).get('token')
            : null);
    const { t } = useTranslation();

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('');
    const verificationAttempted = useRef(false);

    useEffect(() => {
        console.log('[VerifyEmail] useEffect triggered, token:', token ? 'present' : 'null/undefined');
        
        if (!token) {
            console.log('[VerifyEmail] No token found, showing error');
            setStatus('error');
            setMessage(t('auth.invalidLink'));
            return;
        }

        if (verificationAttempted.current) {
            console.log('[VerifyEmail] Verification already attempted, skipping');
            return;
        }
        verificationAttempted.current = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.warn('[VerifyEmail] Verification timeout (30s), aborting');
            controller.abort();
        }, 30000);

        const verify = async () => {
            console.log('[VerifyEmail] Starting verification with token:', token.substring(0, 8) + '...');
            
            try {
                const fetchUrl = '/api/auth/verify';
                console.log('[VerifyEmail] Fetching:', fetchUrl);
                
                const res = await fetch(fetchUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                    signal: controller.signal,
                });

                console.log('[VerifyEmail] Response status:', res.status);
                // Log a few important headers
                const headers: Record<string, string> = {};
                if (res.headers.has('content-type')) headers['content-type'] = res.headers.get('content-type')!;
                if (res.headers.has('content-length')) headers['content-length'] = res.headers.get('content-length')!;
                console.log('[VerifyEmail] Response headers:', headers);
                
                const data = await res.json();
                console.log('[VerifyEmail] Response data:', data);

                if (res.ok) {
                    console.log('[VerifyEmail] Verification successful');
                    setStatus('success');
                } else {
                    console.error('[VerifyEmail] Verification failed with error:', data.error);
                    setStatus('error');
                    setMessage(data.error || t('auth.verifyFailed'));
                }
            } catch (err: any) {
                console.error('[VerifyEmail] Verification error:', err);
                if (err.name === 'AbortError') {
                    setStatus('error');
                    setMessage(t('auth.networkError') + ' (timeout)');
                } else {
                    setStatus('error');
                    setMessage(t('auth.networkError'));
                }
            } finally {
                clearTimeout(timeoutId);
            }
        };

        verify();

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [token, t]); // removed router dependency as it's not used in the effect

    return (
        <div className="poe-surface p-8 rounded-xl shadow-lg w-full max-w-md text-center border border-poe-borderStrong">
            <h1 className="text-2xl font-bold mb-4 text-poe-text1">{t('auth.verifyTitle')}</h1>

            {status === 'verifying' && (
                <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poe-sectionSettings mb-4"></div>
                    <p className="text-poe-text2">{t('auth.verifying')}</p>
                </div>
            )}

            {status === 'success' && (
                <div className="text-poe-success">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-lg font-bold text-poe-text1">{t('auth.accountVerified')}</p>
                    <p className="text-poe-text2 mt-2 mb-6">{t('auth.verifiedMsg')}</p>

                    <Link
                        href="/login"
                        className="inline-block w-full py-3 poe-btn-primary poe-focus-ring rounded-xl font-bold shadow-md transition-colors"
                    >
                        {t('auth.goToLogin')}
                    </Link>
                </div>
            )}

            {status === 'error' && (
                <div className="text-poe-danger">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg font-medium">{t('auth.verifyFailed')}</p>
                    <p className="text-poe-text2 mt-2">{message}</p>
                    <Link href="/login" className="mt-6 inline-block text-poe-sectionSettings hover:text-poe-info font-medium">
                        {t('auth.backToLogin')}
                    </Link>
                </div>
            )}
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background decoration matching login/register */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-poe-sectionHideouts rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                <div className="absolute top-[20%] -left-[10%] w-[50vw] h-[50vw] bg-poe-sectionBuilds rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-poe-sectionStash rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div className="relative z-10 w-full flex justify-center px-4">
                <Suspense fallback={<div className="text-center text-poe-text2">Loading...</div>}>
                    <VerifyEmailContent />
                </Suspense>
            </div>
        </div>
    );
}
