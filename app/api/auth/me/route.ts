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
                    where: {
                        kitchen: {
                            deletedAt: null
                        }
                    },
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
            if (!data.currentPassword) {
                 return NextResponse.json({ message: 'Current password is required' }, { status: 400 });
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!currentUser) {
                return NextResponse.json({ message: 'User not found' }, { status: 404 });
            }

            const bcrypt = require('bcryptjs');
            // If user has a password set, verify it. If not (e.g. OAuth only?), we might need different logic, 
            // but for now assume they must verify current if they are setting new.
            // Actually if they don't have a password, they can't provide current. 
            // Let's assume if currentUser.password is null, we might allow setting it? 
            // For safety, let's strictly require it if it exists.
            if (currentUser.password) {
                const isValid = await bcrypt.compare(data.currentPassword, currentUser.password);
                if (!isValid) {
                     return NextResponse.json({ message: 'Invalid current password' }, { status: 400 });
                }
            }
            
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

        if (data.password && data.password.trim() !== '') {
            const { sendPasswordChangedEmail } = await import('@/lib/email-service');
            sendPasswordChangedEmail(updatedUser.email, updatedUser.name || 'User', updatedUser.language || 'en').catch(console.error);
        }

        return NextResponse.json({ user: updatedUser });

    } catch (error) {
        console.error('PUT /api/auth/me error:', error);
        return NextResponse.json({ message: 'Error updating profile', error: String(error) }, { status: 500 });
    }
}
