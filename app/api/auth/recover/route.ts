import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email-service';

export async function POST(req: NextRequest) {
    try {
        const { email, language } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Always return success message for security (don't reveal if email exists)
        const successMessage = (language && language.startsWith('pt'))
            ? 'Se uma conta existir com este email, você receberá instruções de redefinição de senha.'
            : 'If an account exists with this email, you will receive password reset instructions.';

        // Look up user by email
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (user) {
            // Generate reset token
            const resetToken = crypto.randomUUID();
            const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            // Save token to database
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    passwordResetToken: resetToken,
                    passwordResetExpires: resetExpires,
                },
            });

            // Send password reset email
            // Use user's language preference if available, otherwise fall back to request language or 'en'
            const emailLanguage = user.language || language || 'en';
            await sendPasswordResetEmail(user.email, user.name || 'User', resetToken, emailLanguage);
        }

        return NextResponse.json({
            success: true,
            message: successMessage
        });
    } catch (error) {
        console.error('Password reset request error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
