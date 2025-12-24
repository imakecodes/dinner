
import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await request.json();
        const { checked, quantity } = body;

        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');
        if (!payload || !payload.houseId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const kitchenId = payload.kitchenId as string || payload.houseId as string;

        // Verify item belongs to kitchen
        const existingItem = await prisma.shoppingItem.findUnique({
            where: { id },
            select: { kitchenId: true, name: true }
        });

        if (!existingItem || existingItem.kitchenId !== kitchenId) {
            return NextResponse.json({ message: 'Item not found or access denied' }, { status: 404 });
        }

        const updatedItem = await prisma.shoppingItem.update({
            where: { id },
            data: {
                checked: checked !== undefined ? checked : undefined,
                // quantity: quantity // TODO: Add quantity field to schema first
            }
        });

        // Loop: Check -> Add to Pantry
        if (checked === true) {
            // Check if exists in pantry
            await prisma.pantryItem.upsert({
                where: {
                    name_kitchenId: {
                        name: existingItem.name,
                        kitchenId
                    }
                },
                update: { inStock: true },
                create: {
                    name: existingItem.name,
                    kitchenId,
                    inStock: true,
                    replenishmentRule: 'NEVER' // Default rule
                }
            });
        }

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error('PUT /api/shopping-list/[id] error:', error);
        return NextResponse.json({ message: 'Error updating shopping item', error: String(error) }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');
        if (!payload || !payload.houseId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const kitchenId = payload.kitchenId as string || payload.houseId as string;

        // Verify item belongs to kitchen
        const existingItem = await prisma.shoppingItem.findUnique({
            where: { id },
            select: { kitchenId: true }
        });

        if (!existingItem || existingItem.kitchenId !== kitchenId) {
            return NextResponse.json({ message: 'Item not found or access denied' }, { status: 404 });
        }

        await prisma.shoppingItem.delete({
            where: { id }
        });

        return NextResponse.json({ message: 'Item deleted' });
    } catch (error) {
        console.error('DELETE /api/shopping-list/[id] error:', error);
        return NextResponse.json({ message: 'Error deleting shopping item', error: String(error) }, { status: 500 });
    }
}
