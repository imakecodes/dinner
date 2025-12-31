import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { comparePassword } from '@/lib/password';

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { kitchenMemberships: true }
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = await comparePassword(password, user.password);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Use the first house as default for now
        // TODO: In future allow user to select context
        const defaultKitchenId = user.kitchenMemberships[0]?.kitchenId;

        if (!defaultKitchenId) {
            return NextResponse.json({ error: 'User has no active kitchen' }, { status: 400 });
        }

        // Generate JWT
        const token = await signToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            houseId: defaultKitchenId, // TODO: Update JWT payload key to kitchenId later or map it
            kitchenId: defaultKitchenId
        });

        const response = NextResponse.json({ success: true, user: { name: user.name, email: user.email } });

        // Set HTTP-only cookie
        response.cookies.set('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24, // 1 day
            path: '/',
        });

        return response;
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
