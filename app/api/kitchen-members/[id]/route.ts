import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const payload = await verifyToken(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const memberToDelete = await prisma.kitchenMember.findUnique({
      where: { id }
    });

    if (!memberToDelete) {
      return NextResponse.json({ message: 'Member not found' }, { status: 404 });
    }

    // Check permissions
    // 1. requester is the member being deleted (Leaving)
    // 2. requester is ADMIN of the kitchen
    let isAuthorized = false;

    if (memberToDelete.userId === payload.userId) {
      isAuthorized = true;
    } else {
      const requesterMember = await prisma.kitchenMember.findUnique({
        where: {
          userId_kitchenId: {
            userId: payload.userId as string,
            kitchenId: memberToDelete.kitchenId
          }
        }
      });
      if (requesterMember && requesterMember.role === 'ADMIN') {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    await prisma.kitchenMember.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/kitchen-members/[id] error:', error);
    return NextResponse.json({ message: 'Error deleting member', error: String(error) }, { status: 500 });
  }
}
