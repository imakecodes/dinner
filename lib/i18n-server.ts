import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { translations } from './translations';

export type supportedLangs = keyof typeof translations;

export function getServerTranslator(req?: NextRequest | Headers) {
    let acceptLanguage: string | null = null;

    if (req) {
        if (req instanceof NextRequest || req instanceof Request) {
            acceptLanguage = req.headers.get('accept-language');
        } else if (typeof req.get === 'function') {
            // Handle generic Headers object if passed
            acceptLanguage = req.get('accept-language');
        }
    }

    // Simple language detection logic
    // Matches 'pt-BR', 'pt', 'en', etc.
    let lang: supportedLangs = 'en';

    if (acceptLanguage) {
        if (acceptLanguage.toLowerCase().startsWith('pt')) {
            lang = 'pt-BR';
        }
        // Add other languages here
    }

    const t = (key: string) => {
        const keys = key.split('.');
        // Check for 'lang' first, falling back to 'en'
        // Type assertion needed because TS doesn't know exact keys of potentially different translation structures 
        // (though they should match)
        let value: any = (translations[lang] as any) || translations['en'];

        for (const k of keys) {
            if (value && typeof value === 'object') {
                value = value[k];
            } else {
                return key;
            }
        }

        return (typeof value === 'string' ? value : key);
    };

    return { t, lang };
}
