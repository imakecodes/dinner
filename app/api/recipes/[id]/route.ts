import { NextResponse } from 'next/server';
    import { prisma } from '../../../../lib/prisma';
    
    export async function DELETE(
      request: Request,
      { params }: { params: { id: string } }
    ) {
      try {
        await prisma.recipe.delete({
          where: { id: params.id }
        });
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error('DELETE /api/recipes/[id] error:', error);
        return NextResponse.json({ message: 'Error deleting recipe', error: String(error) }, { status: 500 });
      }
    }
