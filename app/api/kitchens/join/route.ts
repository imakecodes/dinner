import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { code } = await request.json();

        if (!code) {
            return NextResponse.json({ message: 'Invite code is required' }, { status: 400 });
        }

        const token = request.cookies.get('auth_token')?.value;
        if (!token) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyToken(token);
        if (!payload || !payload.userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const userId = payload.userId as string;

        // Find kitchen by code
        const kitchen = await prisma.kitchen.findUnique({
            where: { inviteCode: code }
        });

        if (!kitchen) {
            return NextResponse.json({ message: 'Kitchen not found or invalid code' }, { status: 404 });
        }

        // Check if already a member
        const existingMember = await prisma.kitchenMember.findUnique({
            where: {
                userId_kitchenId: {
                    userId: userId,
                    kitchenId: kitchen.id
                }
            }
        });

        if (existingMember) {
            // Already a member, just return success/kitchenId so we can switch
            return NextResponse.json({
                message: 'Already a member',
                kitchenId: kitchen.id,
                name: kitchen.name
            });
        }

        // Get user details for name
        const user = await prisma.user.findUnique({ where: { id: userId } });

        // Create member
        // User requested: "adiciona como guest" -> isGuest: true
        await prisma.kitchenMember.create({
            data: {
                kitchenId: kitchen.id,
                userId: userId,
                name: user?.name || 'New Member',
                email: user?.email,
                isGuest: true, // Explicitly requested by user
                role: 'MEMBER' // Default role
            }
        });

        return NextResponse.json({
            message: 'Joined kitchen successfully',
            kitchenId: kitchen.id,
            name: kitchen.name
        });

    } catch (error) {
        console.error('POST /api/kitchens/join error:', error);
        return NextResponse.json({ message: 'Error joining kitchen', error: String(error) }, { status: 500 });
    }
}
