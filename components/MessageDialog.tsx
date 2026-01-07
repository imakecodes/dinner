import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    message: string;
    type?: 'info' | 'error' | 'success';
}

export const MessageDialog: React.FC<Props> = ({ isOpen, onClose, title, message, type = 'info' }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'error': return 'fa-circle-xmark text-red-500';
            case 'success': return 'fa-circle-check text-emerald-500';
            default: return 'fa-circle-info text-blue-500';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div
                className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-300 relative overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative background element */}
                <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-5 ${type === 'error' ? 'bg-red-500' : 'bg-rose-500'}`}></div>

                <div className="text-center">
                    <div className={`w-20 h-20 rounded-3xl mb-6 mx-auto flex items-center justify-center text-4xl shadow-sm ${type === 'error' ? 'bg-red-50' : 'bg-rose-50'
                        }`}>
                        <i className={`fas ${getIcon()}`}></i>
                    </div>

                    <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">{title}</h3>
                    <p className="text-slate-600 mb-8 leading-relaxed font-medium">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className={`w-full py-4 rounded-2xl font-black text-lg transition-all shadow-lg active:scale-95 ${type === 'error'
                                ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200'
                                : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                            }`}
                    >
                        {t('common.ok') || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};
