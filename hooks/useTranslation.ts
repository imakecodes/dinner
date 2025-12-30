
"use client";

import { useApp } from '@/components/Providers';
import { translations } from '@/lib/translations';

export function useTranslation() {
    const { language } = useApp();

    // Default to English if something goes wrong
    const lang = language || 'en';

    const t = (key: string) => {
        const keys = key.split('.');
        let value: any = translations[lang as keyof typeof translations] || translations['en'];

        for (const k of keys) {
            if (value) {
                value = value[k];
            } else {
                return key;
            }
        }

        return value || key;
    };

    return { t, lang };
}
