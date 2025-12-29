import { NextResponse, NextRequest } from 'next/server';
import { generateKitchenCode } from '@/lib/kitchen-code';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { name } = await request.json();
        if (!name) return NextResponse.json({ message: 'House name is required' }, { status: 400 });

        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');

        if (!payload || !payload.userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const userId = payload.userId as string;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ message: 'User not found' }, { status: 404 });

        // Create kitchen and membership
        const kitchen = await prisma.kitchen.create({
            data: {
                name,
                inviteCode: generateKitchenCode(),
                members: {
                    create: {
                        name: user.name || 'Admin',
                        userId: userId,
                        isGuest: false,
                        role: 'ADMIN'
                    }
                }
            },
            include: { members: true }
        });

        return NextResponse.json(kitchen);

    } catch (error) {
        console.error('POST /api/kitchens error:', error);
        return NextResponse.json({ message: 'Error creating kitchen', error: String(error) }, { status: 500 });
    }
}

// GET: Fetch current kitchen details
export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');

        if (!payload || !payload.kitchenId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const kitchenId = payload.kitchenId as string;

        const kitchen = await prisma.kitchen.findUnique({
            where: { id: kitchenId }
        });

        if (!kitchen) {
            return NextResponse.json({ message: 'Kitchen not found' }, { status: 404 });
        }

        return NextResponse.json(kitchen);
    } catch (error) {
        console.error('GET /api/kitchens error:', error);
        return NextResponse.json({ message: 'Error fetching kitchen', error: String(error) }, { status: 500 });
    }
}
