import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');

        if (!payload || !payload.id) { // verifyToken uses userId in payload as 'userId', let's check login route.
            // Login route signs: userId, email, name, houseId.
            // So payload.userId is what we want.
            // Wait, let's double check login route signature.
            // signToken({ userId: user.id ... })
            // So it is payload.userId. 
        }

        // Better safe parsing
        if (!payload || !payload.userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.userId as string;
        const currentKitchenId = payload.kitchenId as string;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                measurementSystem: true,
                language: true,
                kitchenMemberships: {
                    include: {
                        kitchen: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                ...user,
                currentKitchenId: currentKitchenId,
                // Map for frontend compatibility if needed, or update frontend to use kitchenMemberships
                memberships: user.kitchenMemberships.map(m => ({
                    ...m,
                    kitchenId: m.kitchenId,
                    kitchen: m.kitchen
                })),
                currentHouseId: currentKitchenId // Keeping for compat if needed, but promoting currentKitchenId
            }
        });

    } catch (error) {
        console.error('GET /api/auth/me error:', error);
        return NextResponse.json({ message: 'Error fetching user profile', error: String(error) }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');

        if (!payload || !payload.userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.userId as string;
        const data = await request.json();

        // Validation (basic)
        if (!data.name || !data.surname) {
            return NextResponse.json({ message: 'Name and Surname are required' }, { status: 400 });
        }

        const updateData: any = {
            name: data.name,
            surname: data.surname,
            measurementSystem: data.measurementSystem,
            language: data.language
        };

        if (data.password && data.password.trim() !== '') {
            const bcrypt = require('bcryptjs');
            updateData.password = await bcrypt.hash(data.password, 10);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                name: true,
                surname: true,
                email: true,
                measurementSystem: true,
                language: true
            }
        });

        return NextResponse.json({ user: updatedUser });

    } catch (error) {
        console.error('PUT /api/auth/me error:', error);
        return NextResponse.json({ message: 'Error updating profile', error: String(error) }, { status: 500 });
    }
}
