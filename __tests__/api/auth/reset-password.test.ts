import { POST } from '@/app/api/auth/reset-password/route';
import { prisma } from '@/lib/prisma';
import { sendPasswordChangedEmail } from '@/lib/email-service';
import { hashPassword } from '@/lib/password';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findFirst: jest.fn(),
            update: jest.fn(),
        },
    },
}));

jest.mock('@/lib/email-service', () => ({
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/password', () => ({
    hashPassword: jest.fn(),
}));

describe('POST /api/auth/reset-password', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should reset password and send notification email', async () => {
        const req = new NextRequest(new URL('http://localhost/api/auth/reset-password'), {
            method: 'POST',
            body: JSON.stringify({
                token: 'valid-token',
                newPassword: 'new-password-123'
            })
        });

        // Mock Find User (valid token, not expired)
        (prisma.user.findFirst as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
            name: 'User Name',
            language: 'pt-BR',
            passwordResetExpires: new Date(Date.now() + 3600000) // 1 hour in future
        });

        // Mock Hash
        (hashPassword as jest.Mock).mockResolvedValue('hashed_reset_password');

        // Mock Update
        (prisma.user.update as jest.Mock).mockResolvedValue({
            id: 'user-1'
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.success).toBe(true);
        
        // Verify update
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'user-1' },
            data: expect.objectContaining({
                password: 'hashed_reset_password',
                passwordResetToken: null
            })
        }));

        // Verify email sent with user language
        expect(sendPasswordChangedEmail).toHaveBeenCalledWith('user@example.com', 'User Name', 'pt-BR');
    });

    it('should return error if token is expired', async () => {
        const req = new NextRequest(new URL('http://localhost/api/auth/reset-password'), {
            method: 'POST',
            body: JSON.stringify({
                token: 'expired-token',
                newPassword: 'new-password'
            })
        });

        (prisma.user.findFirst as jest.Mock).mockResolvedValue({
            id: 'user-1',
            passwordResetExpires: new Date(Date.now() - 3600000) // 1 hour ago
        });

        const res = await POST(req);
        
        expect(res.status).toBe(400);
        expect(prisma.user.update).not.toHaveBeenCalled();
        expect(sendPasswordChangedEmail).not.toHaveBeenCalled();
    });
});
