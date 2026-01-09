import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { getServerTranslator } from '@/lib/i18n-server';

export async function POST(req: NextRequest) {
    // Get translator (initially by header, will refine with user language later)
    let { t } = getServerTranslator(req);

    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: t('api.tokenRequired') }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: t('api.passwordTooShort') }, { status: 400 });
        }

        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
            },
        });

        if (!user) {
            return NextResponse.json({ error: t('api.invalidToken') }, { status: 400 });
        }

        // Now we have user, translate using their preference
        const translator = getServerTranslator(req, user.language);
        t = translator.t; // Update 't' function

        // Check if token has expired
        if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
            return NextResponse.json({ error: t('api.tokenExpired') }, { status: 400 });
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
            message: t('api.resetSuccess')
        });
    } catch (error) {
        console.error('Password reset error:', error);
        // Fallback to header lang for catch block (can reuse current 't' which might be user lang, or standard)
        // If we failed early, 't' is header-based. If late, it's user-based. Both fine.
        return NextResponse.json({ error: t('api.internalError') }, { status: 500 });
    }
}
