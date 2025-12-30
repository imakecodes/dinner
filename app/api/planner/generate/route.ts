
import { NextRequest, NextResponse } from 'next/server';
import { generateWeeklyPlan } from '@/services/plannerService';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
    try {
        const token = req.cookies.get('auth_token')?.value;
        const payload = await verifyToken(token || '');
        if (!payload || !payload.kitchenId) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const kitchenId = payload.kitchenId as string;
        
        const body = await req.json().catch(() => ({}));
        const { language } = body;

        // Default to starting today, for 5 days
        const startDate = new Date();
        const days = 5;

        const plan = await generateWeeklyPlan({
            kitchenId,
            startDate,
            days,
            language
        });

        return NextResponse.json(plan);

    } catch (error: any) {
        console.error("Planner API Error:", error);
        return NextResponse.json({ error: error.message || 'Failed to generate plan' }, { status: 500 });
    }
}
