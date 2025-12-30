
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');
        if (!payload || !payload.kitchenId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const kitchenId = payload.kitchenId as string;
        
        // Get generic view: plans from today onwards? Or just all current/relevant.
        // Let's get "From yesterday onwards" to handle timezone cliffs
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0,0,0,0);

        const plans = await prisma.mealPlan.findMany({
            where: {
                kitchenId,
                date: { gte: yesterday }
            },
            orderBy: { date: 'asc' },
            include: { members: true }
        });

        // Get recent Agent Logs
        const logs = await prisma.agentLog.findMany({
            where: { kitchenId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        return NextResponse.json({ plans, logs });

    } catch (error: any) {
        console.error("GET Planner Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
