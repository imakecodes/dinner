import React, { useState } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface ShareButtonsProps {
    text: string;
    url?: string;
    layout?: 'icons' | 'menu-items';
}

export const ShareButtons: React.FC<ShareButtonsProps> = ({ 
    text, 
    url = process.env.NEXT_PUBLIC_APP_URL || 'https://dinner.app', 
    layout = 'icons'
}) => {
    const { t } = useTranslation();

    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    
    // WhatsApp: Text usually includes the URL if needed, but we can append it cleanly
    // Format: "Message https://link"
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
    
    // Telegram: Separetes URL and Text
    const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

    // Email
    const emailSubject = 'Shared from Dinner App';
    const emailBody = `${text}\n\n${url}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    if (layout === 'menu-items') {
        return (
            <>
                <a 
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-4 hover:bg-emerald-50 rounded-xl text-xs font-black text-slate-700 transition-colors"
                >
                    <i className="fab fa-whatsapp text-emerald-500 text-lg"></i> {t('recipeCard.whatsapp') || 'WhatsApp'}
                </a>
                <a 
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 p-4 hover:bg-sky-50 rounded-xl text-xs font-black text-slate-700 transition-colors"
                >
                    <i className="fab fa-telegram text-sky-500 text-lg"></i> {t('recipeCard.telegram') || 'Telegram'}
                </a>
                
                <CopyButton text={text} />
            </>
        );
    }

    // Default: Icons layout
    return (
        <div className="flex gap-2">
            <a 
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 bg-[#DCF8C6] hover:bg-[#d0f0ba] text-[#128C7E] rounded-lg transition-colors shadow-sm"
                title="WhatsApp"
            >
                <i className="fab fa-whatsapp text-lg"></i>
            </a>
            <a 
                href={telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 bg-[#E3F2FD] hover:bg-[#d0e9fc] text-[#0088CC] rounded-lg transition-colors shadow-sm"
                title="Telegram"
            >
                <i className="fab fa-telegram-plane text-lg"></i>
            </a>
        </div>
    );
};

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button 
            onClick={handleCopy}
            className="w-full flex items-center gap-3 p-4 hover:bg-rose-50 rounded-xl text-xs font-black text-rose-600 transition-colors"
        >
            <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-lg`}></i> 
            {copied ? (t('recipeCard.copied') || 'Copied!') : (t('recipeCard.copyClipboard') || 'Copy')}
        </button>
    );
};
