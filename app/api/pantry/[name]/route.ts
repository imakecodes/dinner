import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    await prisma.pantryItem.delete({
      where: { name: decodeURIComponent(params.name) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/pantry/[name] error:', error);
    return NextResponse.json({ message: 'Error removing item from pantry', error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { name: string } }
) {
  try {
    const { name: newName } = await request.json();
    const updated = await prisma.pantryItem.update({
      where: { name: decodeURIComponent(params.name) },
      data: { name: newName }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PUT /api/pantry/[name] error:', error);
    return NextResponse.json({ message: 'Error updating pantry item', error: String(error) }, { status: 500 });
  }
}
