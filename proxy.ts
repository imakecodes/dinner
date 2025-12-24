import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Redirect /home to /
    if (path === '/home') {
        return NextResponse.redirect(new URL('/', request.nextUrl));
    }

    // Define public paths that don't require authentication
    const isPublicPath =
        path === '/login' ||
        path === '/register' ||
        path === '/recover' ||
        path.startsWith('/api/auth'); // Allow auth API routes

    // Static assets and internal next paths are usually handled automatically by matcher,
    // but explicitly ignoring them in logic if needed is safe.

    const token = request.cookies.get('auth_token')?.value || '';

    // Verify token
    const payload = await verifyToken(token);
    // Strict check: must have payload and houseId (multi-tenancy)
    const isAuthenticated = !!payload && !!payload.houseId;

    // Case 1: User is accessing a public path but is already logged in
    if (isPublicPath && isAuthenticated) {
        if (!path.startsWith('/api/auth')) {
            // Redirect to home if they try to access login/register while logged in
            return NextResponse.redirect(new URL('/', request.nextUrl));
        }
        return NextResponse.next();
    }

    // Case 2: User is accessing a protected path and is NOT logged in
    if (!isPublicPath && !isAuthenticated) {
        if (path.startsWith('/api')) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        // Redirect to login for page requests
        return NextResponse.redirect(new URL('/login', request.nextUrl));
    }

    // Case 3: Standard Access or API calls
    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (handled in logic, but good to keep matched to allow logic to run)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc - add extensions if needed)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
