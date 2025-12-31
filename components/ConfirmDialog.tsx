import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

export const ConfirmDialog: React.FC<Props> = ({ isOpen, onClose, onConfirm, title, message }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
                <h3 className="text-xl font-black text-slate-800 mb-4">{title}</h3>
                <p className="text-slate-600 mb-8 leading-relaxed font-medium">
                    {message}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="px-6 py-3 rounded-xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-colors"
                    >
                        {t('common.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};
