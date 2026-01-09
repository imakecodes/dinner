import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { comparePassword } from '@/lib/password';
import { getServerTranslator } from '@/lib/i18n-server';

export async function POST(req: NextRequest) {
    // Get translator (header-based)
    const { t } = getServerTranslator(req);

    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: t('auth.missingCredentials') }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            include: { kitchenMemberships: true }
        });

        if (!user || !user.password) {
            return NextResponse.json({ error: t('auth.invalidCredentials') }, { status: 401 });
        }

        const isValid = await comparePassword(password, user.password);

        if (!isValid) {
            return NextResponse.json({ error: t('auth.invalidCredentials') }, { status: 401 });
        }

        if (!user.emailVerified) {
            // Re-instantiate translator? No, header is fine for this error, or could use user.language 
            // Stick to header for pre-login flow consistency
            return NextResponse.json({ error: t('auth.unverified'), code: 'auth.unverified' }, { status: 403 });
        }

        // Use the first house as default for now
        // Determine initial kitchen context
        let defaultKitchenId = user.kitchenMemberships[0]?.kitchenId;

        if (user.selectedKitchenId) {
            const isMember = user.kitchenMemberships.some(m => m.kitchenId === user.selectedKitchenId);
            if (isMember) {
                defaultKitchenId = user.selectedKitchenId;
            }
        }

        if (!defaultKitchenId) {
            return NextResponse.json({ error: t('auth.userNoKitchen') }, { status: 400 });
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
        // We can't easily access `t` here unless we move try block or `t` definition.
        // `t` is defined outside try, so it accessible.
        // But Typescript might complain if initialization failed? No, `getServerTranslator` is synchronous-like.

        // Wait, `t` is defined inside function scope, so yes accessible. 
        // Need to ensure `t` is defined. 
        // I defined `const { t } = getServerTranslator(req);` at top of POST.

        // However, I need to check if I can use 'internalError' from 'api' namespace or 'common'?
        // 'en.ts' has 'internalError' in 'api'.
        // Need to call `t('api.internalError')`.
        const { t } = getServerTranslator(req); // Re-get to be safe or just rely on closure if I moved it up. 
        // Actually, my previous edit moved `const { t } = ...` to the top of POST. 

        return NextResponse.json({ error: t('api.internalError') }, { status: 500 });
    }
}
