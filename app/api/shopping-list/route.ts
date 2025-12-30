
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

    const items = await prisma.shoppingItem.findMany({
      where: {
        kitchenId: kitchenId,
        checked: false // Only active items? Or all? Usually shopping list is checked=false
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/shopping-list error:', error);
    return NextResponse.json({ message: 'Error fetching list', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const token = request.cookies.get('auth_token')?.value;
    const payload = await verifyToken(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const kitchenId = payload.kitchenId as string;

    // Check if exists
    let item = await prisma.shoppingItem.findFirst({
        where: {
            kitchenId: kitchenId,
            name: data.name
        }
    });

    if (item) {
        // Uncheck if needed
        if (item.checked) {
            item = await prisma.shoppingItem.update({
                where: { id: item.id },
                data: { checked: false }
            });
        }
    } else {
        item = await prisma.shoppingItem.create({
            data: {
                name: data.name,
                kitchenId: kitchenId,
                checked: false
            }
        });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('POST /api/shopping-list error:', error);
    return NextResponse.json({ message: 'Error adding item', error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
    try {
      const token = request.cookies.get('auth_token')?.value;
      const payload = await verifyToken(token || '');
      if (!payload || !payload.kitchenId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      const kitchenId = payload.kitchenId as string;
  
      // Safe Clear Strategy:
      // 1. Delete items that are NOT linked to any recipe (Manual items).
      // 2. Mark items that ARE linked to recipes as 'checked: true' (Bought/Archived), 
      //    so they disappear from the active list but don't break the recipe definition.
      //    (Deleting them would remove them from the Recipe's shoppingItems list due to onDelete: Cascade)

      // Step 1: Find items to delete (Unlinked)
      // Prisma doesn't support "delete where relation is empty" easily in one go without raw query or finding first.
      // We'll fetch all items with their relation count.
      
      const allItems = await prisma.shoppingItem.findMany({
          where: { kitchenId },
          include: { _count: { select: { recipeItems: true } } }
      });

      const idsToDelete: string[] = [];
      const idsToArchive: string[] = [];

      allItems.forEach(item => {
          if (item._count.recipeItems === 0) {
              idsToDelete.push(item.id);
          } else {
              // Only archive if currently unchecked (active)
              if (!item.checked) idsToArchive.push(item.id);
          }
      });

      // Execute operations
      await prisma.$transaction([
          prisma.shoppingItem.deleteMany({
              where: { id: { in: idsToDelete } }
          }),
          prisma.shoppingItem.updateMany({
              where: { id: { in: idsToArchive } },
              data: { checked: true } // Mark as bought/done
          })
      ]);

      return NextResponse.json({ message: 'List cleared', deleted: idsToDelete.length, archived: idsToArchive.length });
    } catch (error) {
        console.error('DELETE /api/shopping-list error:', error);
        return NextResponse.json({ message: 'Error clearing list', error: String(error) }, { status: 500 });
    }
}
