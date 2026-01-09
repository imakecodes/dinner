import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { translations } from '@/lib/translations';

type Language = keyof typeof translations;

function getTranslation(lang: string | null | undefined) {
    const validLang = (lang && ['en', 'pt-BR'].includes(lang)) ? lang as Language : 'en';
    return translations[validLang];
}

export async function POST(req: NextRequest) {
    // Get language from header for initial errors
    const acceptLang = req.headers.get('accept-language')?.split(',')[0].split('-')[0] === 'pt' ? 'pt-BR' : 'en'; // Simple detection
    // Better detection:
    const rawLang = req.headers.get('accept-language');
    const headerLang = rawLang?.includes('pt') ? 'pt-BR' : 'en';

    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            const t = getTranslation(headerLang);
            return NextResponse.json({ error: t.api.tokenRequired }, { status: 400 });
        }

        if (newPassword.length < 6) {
            const t = getTranslation(headerLang);
            return NextResponse.json({ error: t.api.passwordTooShort }, { status: 400 });
        }

        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
            },
        });

        if (!user) {
            const t = getTranslation(headerLang);
            return NextResponse.json({ error: t.api.invalidToken }, { status: 400 });
        }

        // Now we have user, use their preferred language
        const t = getTranslation(user.language || headerLang);

        // Check if token has expired
        if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
            return NextResponse.json({ error: t.api.tokenExpired }, { status: 400 });
        }

        // Hash new password
        const hashedPassword = await hashPassword(newPassword);

        // Update user password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            },
        });

        const { sendPasswordChangedEmail } = await import('@/lib/email-service');
        await sendPasswordChangedEmail(user.email, user.name || 'User', user.language || 'en');

        return NextResponse.json({
            success: true,
            message: t.api.resetSuccess
        });
    } catch (error) {
        console.error('Password reset error:', error);
        // Fallback to header lang for catch block
        const t = getTranslation(headerLang);
        return NextResponse.json({ error: t.api.internalError }, { status: 500 });
    }
}
