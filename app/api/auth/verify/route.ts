import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export async function POST(req: NextRequest) {
    console.log('[Verify API] POST request received');
    
    try {
        const { token } = await req.json();
        console.log('[Verify API] Token received:', token ? `${token.substring(0, 8)}...` : 'null/undefined');

        if (!token) {
            console.log('[Verify API] Missing token, returning 400');
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        console.log('[Verify API] Searching for user with token');
        const user = await prisma.user.findFirst({
            where: { verificationToken: token },
            include: {
                kitchenMemberships: {
                    include: { kitchen: true }
                }
            }
        });

        console.log('[Verify API] User found:', user ? `id=${user.id}, email=${user.email}` : 'null');
        
        if (!user) {
            console.log('[Verify API] Invalid token, returning 400');
            return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
        }

        // Verify user and clear token
        console.log('[Verify API] Updating user verification status');
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: new Date(),
                verificationToken: null
            }
        });

        console.log('[Verify API] Verification successful');
        return NextResponse.json({ success: true, message: 'Email verified successfully' }, { status: 200 });

    } catch (error) {
        console.error('[Verify API] Verification error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
