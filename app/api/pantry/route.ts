import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const payload = await verifyToken(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const kitchenId = payload.kitchenId as string;

    const items = await prisma.pantryItem.findMany({
      where: { kitchenId },
      select: {
        id: true,
        name: true,
        inStock: true,
        replenishmentRule: true,
        shoppingItemId: true
      }
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/pantry error:', error);
    return NextResponse.json({ message: 'Error fetching pantry items', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, replenishmentRule, inStock } = await request.json();
    if (!name) return NextResponse.json({ message: 'Name is required' }, { status: 400 });

    const token = request.cookies.get('auth_token')?.value;
    const payload = await verifyToken(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const kitchenId = payload.kitchenId as string;

    const initialStock = inStock !== undefined ? inStock : true;
    const rule = replenishmentRule || 'NEVER';

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.pantryItem.upsert({
        where: {
          name_kitchenId: {
            name,
            kitchenId
          }
        },
        update: {
          replenishmentRule: rule,
          inStock: initialStock
        },
        create: {
          name,
          kitchenId,
          inStock: initialStock,
          replenishmentRule: rule
        }
      });

      if (created.replenishmentRule === 'ALWAYS' && created.inStock === false) {
        const shoppingItem = await tx.shoppingItem.upsert({
          where: { name_kitchenId: { name: created.name, kitchenId } },
          create: {
            name: created.name,
            kitchenId,
            checked: false
          },
          update: {
            checked: false
          }
        });
        await tx.pantryItem.update({
          where: { id: created.id },
          data: { shoppingItemId: shoppingItem.id }
        });
      }
      return created;
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error('POST /api/pantry error:', error);
    return NextResponse.json({ message: 'Error adding pantry item', error: String(error) }, { status: 500 });
  }
}
