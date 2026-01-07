
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
        }

        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: {
                passwordResetToken: token,
            },
            select: {
                id: true,
                passwordResetExpires: true
            }
        });

        if (!user) {
            return NextResponse.json({ valid: false, error: 'Invalid reset token' }, { status: 404 });
        }

        // Check if token has expired
        if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
            return NextResponse.json({ valid: false, error: 'Reset token has expired' }, { status: 410 }); // 410 Gone
        }

        return NextResponse.json({ valid: true });
    } catch (error) {
        console.error('Token verification error:', error);
        return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
    }
}
