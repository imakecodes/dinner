import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: params.id }
    });
    if (!recipe) return NextResponse.json({ message: 'Recipe not found' }, { status: 404 });

    const updated = await prisma.recipe.update({
      where: { id: params.id },
      data: { isFavorite: !recipe.isFavorite }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('PATCH /api/recipes/[id]/favorite error:', error);
    return NextResponse.json({ message: 'Error toggling favorite status', error: String(error) }, { status: 500 });
  }
}
