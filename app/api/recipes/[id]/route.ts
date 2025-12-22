import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.recipe.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/recipes/[id] error:', error);
    return NextResponse.json({ message: 'Error deleting recipe', error: String(error) }, { status: 500 });
  }
}
