
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        let body;
        try {
            const text = await request.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
        }

        const { houseId, kitchenId } = body;
        const targetId = kitchenId || houseId;

        if (!targetId) {
            return NextResponse.json({ message: 'Kitchen ID is required' }, { status: 400 });
        }

        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');

        if (!payload || !payload.userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const userId = payload.userId as string;

        // Verify membership
        const membership = await prisma.kitchenMember.findUnique({
            where: {
                userId_kitchenId: {
                    userId,
                    kitchenId: targetId
                }
            },
            include: {
                kitchen: true
            }
        });

        if (!membership || membership.kitchen.deletedAt) {
            return NextResponse.json({ message: 'User is not a member of this kitchen' }, { status: 403 });
        }

        // Persist the selection
        await prisma.user.update({
            where: { id: userId },
            data: { selectedKitchenId: targetId }
        });

        // Generate new token with updated context
        const newToken = await signToken({
            userId: userId,
            email: payload.email as string,
            name: payload.name as string,
            kitchenId: targetId,
            houseId: targetId // Backwards compat
        });

        const response = NextResponse.json({ success: true, kitchenId: targetId });

        // Update cookie
        response.cookies.set('auth_token', newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return response;

    } catch (error) {
        console.error('POST /api/auth/switch-context error:', error);
        return NextResponse.json({ message: 'Error switching context', error: String(error) }, { status: 500 });
    }
}
