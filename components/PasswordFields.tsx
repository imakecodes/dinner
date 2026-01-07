"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface PasswordFieldsProps {
    onChange: (isValid: boolean, passwordValue: string) => void;
    showLabels?: boolean;
}

export const PasswordFields: React.FC<PasswordFieldsProps> = ({ onChange, showLabels = true }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        let isValid = false;
        let errorMessage: string | null = null;

        if (password.length > 0) {
            if (password.length < 6) {
                errorMessage = t('auth.passwordTooShort') || 'Password must be at least 6 characters.';
            } else if (confirmPassword.length > 0 && password !== confirmPassword) {
                errorMessage = t('auth.passwordMismatch') || 'Passwords do not match.';
            } else if (confirmPassword.length > 0 && password === confirmPassword) {
                isValid = true;
            }
        }

        setError(errorMessage);
        onChange(isValid, password);
    }, [password, confirmPassword, onChange, t]);

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                {showLabels && <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.newPassword') || 'New Password'}</label>}
                <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-700 transition-colors pr-12"
                        placeholder="••••••••"
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                {showLabels && <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.confirmPassword') || 'Confirm Password'}</label>}
                 <div className="relative">
                    <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-700 transition-colors pr-12"
                        placeholder="••••••••"
                        minLength={6}
                    />
                     <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl flex items-center gap-2 border border-red-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    <i className="fas fa-exclamation-circle"></i>
                    {error}
                </div>
            )}
        </div>
    );
};
