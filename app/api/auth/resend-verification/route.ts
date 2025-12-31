import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email-service';
import { getServerTranslator } from '@/lib/i18n-server';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        // Loophole protection: always return success to prevent email enumeration
        // Unless we are in dev mode maybe? No, security first.

        if (user && !user.emailVerified) {
            // Generate new token if needed or reuse existing if not expired (simple: overwrite)
            // But wait, our schema uses verificationToken string.
            // Let's generate a new one to be safe and fresh.
            const newToken = crypto.randomUUID();

            await prisma.user.update({
                where: { id: user.id },
                data: { verificationToken: newToken }
            });

            // Send email
            // Use user's preferred language or fallback to current request language
            const { lang } = getServerTranslator(req);
            const emailLang = user.language || lang;

            await sendVerificationEmail(user.email, newToken, emailLang);
        }

        return NextResponse.json({ success: true, message: 'If account exists and is unverified, email sent.' }, { status: 200 });

    } catch (error) {
        console.error('Resend verification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
