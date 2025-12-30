
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const token = req.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');
        if (!payload || !payload.kitchenId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const kitchenId = payload.kitchenId as string;
        const { status, memberIds } = body;

        const updateData: any = {};
        if (status) updateData.status = status;
        if (memberIds && Array.isArray(memberIds)) {
            updateData.members = {
                set: memberIds.map((id: string) => ({ id }))
            };
        }

        const updated = await prisma.mealPlan.update({
            where: { id: params.id, kitchenId },
            data: updateData
        });

        if (status === 'SKIPPED') {
             // Log this event for the agent
             await prisma.agentLog.create({
                 data: {
                     kitchenId: payload.kitchenId as string,
                     type: 'WARNING',
                     message: `User skipped meal: ${updated.notes?.split(' - ')[0] || 'Unknown'}. Inventory might need auditing.`
                 }
             });
        }

        return NextResponse.json(updated);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
