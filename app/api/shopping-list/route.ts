import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');
        if (!payload || !payload.houseId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const kitchenId = payload.kitchenId as string || payload.houseId as string;

        const items = await prisma.shoppingItem.findMany({
            where: { kitchenId },
            include: {
                pantryItem: true,
                recipeItems: true
            },
            orderBy: { name: 'asc' }
        });
        return NextResponse.json(items);
    } catch (error) {
        console.error('GET /api/shopping-list error:', error);
        return NextResponse.json({ message: 'Error fetching shopping list', error: String(error) }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { name, quantity, unit } = await request.json();
        if (!name) return NextResponse.json({ message: 'Name is required' }, { status: 400 });

        const token = request.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');
        if (!payload || !payload.houseId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const kitchenId = payload.kitchenId as string || payload.houseId as string;

        const item = await prisma.shoppingItem.upsert({
            where: {
                name_kitchenId: {
                    name,
                    kitchenId
                }
            },
            update: {
                checked: false,
                quantity: quantity || null,
                unit: unit || null
            }, // If re-adding, uncheck it and update qty/unit
            create: {
                name,
                kitchenId,
                checked: false,
                quantity: quantity || null,
                unit: unit || null
            }
        });
        return NextResponse.json(item);
    } catch (error) {
        console.error('POST /api/shopping-list error:', error);
        return NextResponse.json({ message: 'Error adding shopping item', error: String(error) }, { status: 500 });
    }
}
