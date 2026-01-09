import { headers } from 'next/headers';
import { NextRequest } from 'next/server';
import { translations } from './translations';

export type supportedLangs = keyof typeof translations;

export function getServerTranslator(req?: NextRequest | Headers, preferredLang?: string | null) {
    // 1. Check preferred user language first
    if (preferredLang && Object.keys(translations).includes(preferredLang)) {
        const lang = preferredLang as supportedLangs;
        return createTranslator(lang);
    }

    let acceptLanguage: string | null = null;

    if (req) {
        if (req instanceof NextRequest || req instanceof Request) {
            acceptLanguage = req.headers.get('accept-language');
        } else if (typeof req.get === 'function') {
            // Handle generic Headers object if passed
            acceptLanguage = req.get('accept-language');
        }
    }

    // 2. Check Accept-Language header
    // Dynamic matching against supported languages
    let lang: supportedLangs = 'en'; // Default

    if (acceptLanguage) {
        const requestedLangs = acceptLanguage.split(',').map(l => l.split(';')[0].trim());
        const supported = Object.keys(translations);

        for (const reqLang of requestedLangs) {
            // Try exact match
            if (supported.includes(reqLang)) {
                lang = reqLang as supportedLangs;
                break;
            }
            // Try prefix match (e.g. 'pt' matching 'pt-BR')
            // We prioritize exact matches, but if not found, we look for prefix
            const prefixMatch = supported.find(s => s.startsWith(reqLang.split('-')[0]));
            if (prefixMatch) {
                lang = prefixMatch as supportedLangs;
                break;
            }
        }
    }

    return createTranslator(lang);
}

function createTranslator(lang: supportedLangs) {
    const t = (key: string) => {
        const keys = key.split('.');
        // Check for 'lang' first, falling back to 'en'
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
