"use client";

import React, { useState } from 'react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ className, ...props }) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            <input
                {...props}
                type={showPassword ? "text" : "password"}
                className={`w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-bold text-slate-700 transition-colors pr-12 ${className || ''}`}
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                tabIndex={-1} // Prevent tabbing to this button usually? Or keep it accessible. Keeping accessible is better.
                aria-label={showPassword ? "Hide password" : "Show password"}
            >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
        </div>
    );
};
