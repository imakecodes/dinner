import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PUT(
    request: NextRequest,
    props: { params: Promise<{ kitchenId: string }> }
) {
    try {
        const params = await props.params;
        const { kitchenId } = params;
        const { name } = await request.json();

        if (!name) return NextResponse.json({ message: 'Name is required' }, { status: 400 });

        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');

        if (!payload || !payload.userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is ADMIN of this kitchen
        const membership = await prisma.kitchenMember.findUnique({
            where: {
                userId_kitchenId: {
                    userId: payload.userId as string,
                    kitchenId: kitchenId
                }
            }
        });

        if (!membership || membership.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        const kitchen = await prisma.kitchen.update({
            where: { id: kitchenId },
            data: { name }
        });

        return NextResponse.json(kitchen);

    } catch (error) {
        console.error('PUT /api/kitchens/[id] error:', error);
        return NextResponse.json({ message: 'Error updating kitchen', error: String(error) }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    props: { params: Promise<{ kitchenId: string }> }
) {
    try {
        const params = await props.params;
        const { kitchenId } = params;

        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');

        if (!payload || !payload.userId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is ADMIN of this kitchen
        const membership = await prisma.kitchenMember.findUnique({
            where: {
                userId_kitchenId: {
                    userId: payload.userId as string,
                    kitchenId: kitchenId
                }
            }
        });

        if (!membership || membership.role !== 'ADMIN') {
            return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
        }

        // Soft delete
        const kitchen = await prisma.kitchen.update({
            where: { id: kitchenId },
            data: { deletedAt: new Date() }
        });

        return NextResponse.json(kitchen);
    } catch (error) {
        console.error('DELETE /api/kitchens/[id] error:', error);
        return NextResponse.json({ message: 'Error deleting kitchen', error: String(error) }, { status: 500 });
    }
}
