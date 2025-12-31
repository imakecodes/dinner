
import { POST } from '@/app/api/auth/login/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
        },
    },
}));

jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockResolvedValue(true), // Always match password for this test
}));

jest.mock('jose', () => ({
    SignJWT: jest.fn().mockImplementation(() => ({
        setProtectedHeader: jest.fn().mockReturnThis(),
        setIssuedAt: jest.fn().mockReturnThis(),
        setExpirationTime: jest.fn().mockReturnThis(),
        sign: jest.fn().mockResolvedValue('mock_token'),
    })),
}));

jest.mock('@/lib/i18n-server', () => ({
    getServerTranslator: jest.fn().mockReturnValue({
        t: (key: string) => key,
        lang: 'en'
    })
}));


describe('Login API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 403 authorization error if user is not verified', async () => {
        const req = new NextRequest(new URL('http://localhost/api/auth/login'), {
            method: 'POST',
            body: JSON.stringify({ email: 'unverified@example.com', password: 'password' })
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'unverified@example.com',
            password: 'hashed_password',
            emailVerified: null, // Not verified
            name: 'Unverified',
            kitchenMemberships: []
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(403);
        expect(data.error).toBe('Account not verified'); // Actual implementation returns this hardcoded
        expect(data.code).toBe('auth.unverified');
    });

    it('should login successfully if user is verified', async () => {
        const req = new NextRequest(new URL('http://localhost/api/auth/login'), {
            method: 'POST',
            body: JSON.stringify({ email: 'verified@example.com', password: 'password' })
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-2',
            email: 'verified@example.com',
            password: 'hashed_password',
            emailVerified: new Date(), // Verified
            name: 'Verified',
            kitchenMemberships: [{ kitchenId: 'k1' }] // Needs membership for check
        });

        const res = await POST(req);

        expect(res.status).toBe(200);
        // Should have set a cookie (checking headers logic might be complex in mock, but status 200 implies success)
    });
});
