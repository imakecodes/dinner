"use client";

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { PasswordInput } from './PasswordInput';

interface PasswordFieldsProps {
    onChange: (isValid: boolean, passwordValue: string) => void;
    showLabels?: boolean;
    disabled?: boolean;
}

export const PasswordFields: React.FC<PasswordFieldsProps> = ({ onChange, showLabels = true, disabled = false }) => {
    const { t } = useTranslation();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

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
                <PasswordInput
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    disabled={disabled}
                />
            </div>

            <div className="space-y-2">
                {showLabels && <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">{t('auth.confirmPassword') || 'Confirm Password'}</label>}
                <PasswordInput
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    disabled={disabled}
                />
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
