import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function POST(req: NextRequest) {
    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 });
        }

        if (newPassword.length < 6) {
            return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
        }

        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 });
        }

        // Check if token has expired
        if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
            return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 });
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

        return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully'
        });
    } catch (error) {
        console.error('Password reset error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
