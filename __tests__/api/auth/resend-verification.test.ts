
import { POST } from '@/app/api/auth/resend-verification/route';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email-service';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('@/lib/email-service', () => ({
    sendVerificationEmail: jest.fn(),
}));

jest.mock('@/lib/i18n-server', () => ({
    getServerTranslator: jest.fn().mockReturnValue({
        t: (key: string) => key,
        lang: 'en'
    })
}));

describe('Resend Verification API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should send email if user exists and is unverified', async () => {
        const req = new NextRequest(new URL('http://localhost/api/auth/resend-verification'), {
            method: 'POST',
            body: JSON.stringify({ email: 'exists@example.com' })
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'exists@example.com',
            emailVerified: null
        });

        const res = await POST(req);

        expect(res.status).toBe(200);
        expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
        expect(prisma.user.update).toHaveBeenCalled(); // Should update token
    });

    it('should NOT send email if user is already verified', async () => {
        const req = new NextRequest(new URL('http://localhost/api/auth/resend-verification'), {
            method: 'POST',
            body: JSON.stringify({ email: 'verified@example.com' })
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-2',
            email: 'verified@example.com',
            emailVerified: new Date()
        });

        const res = await POST(req);

        expect(res.status).toBe(200); // Return success to avoid enumeration
        expect(sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should NOT send email if user does not exist', async () => {
        const req = new NextRequest(new URL('http://localhost/api/auth/resend-verification'), {
            method: 'POST',
            body: JSON.stringify({ email: 'ghost@example.com' })
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        const res = await POST(req);

        expect(res.status).toBe(200); // Security: always return success
        expect(sendVerificationEmail).not.toHaveBeenCalled();
    });
});
