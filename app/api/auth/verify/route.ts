import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: { verificationToken: token },
            include: {
                kitchenMemberships: {
                    include: { kitchen: true }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        // Verify user and clear token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                verificationToken: null
            }
        });

        return NextResponse.json({ success: true, message: 'Email verified successfully' }, { status: 200 });

    } catch (error) {
        console.error('Verification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
