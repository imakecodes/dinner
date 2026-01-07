import { PUT } from '@/app/api/auth/me/route';
import { prisma } from '@/lib/prisma';
import { sendPasswordChangedEmail } from '@/lib/email-service';
import { verifyToken } from '@/lib/auth';
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
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/auth', () => ({
    verifyToken: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashed_new_password'),
    compare: jest.fn().mockResolvedValue(true),
}));

describe('PUT /api/auth/me', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should update password and send notification email', async () => {
        // Mock Auth
        (verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

        const req = new NextRequest(new URL('http://localhost/api/auth/me'), {
            method: 'PUT',
            body: JSON.stringify({
                name: 'John',
                surname: 'Doe',
                password: 'new-password',
                currentPassword: 'current-password'
            }),
            headers: {
                cookie: 'auth_token=valid-token'
            }
        });

        // Mock DB findUnique for current password verification
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            password: 'hashed_old_password'
        });

        // Mock DB update
        (prisma.user.update as jest.Mock).mockResolvedValue({
            id: 'user-1',
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
            language: 'pt-BR' // User has PT language
        });

        const res = await PUT(req);

        expect(res.status).toBe(200);
        
        // Verify update called with hashed password
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'user-1' },
            data: expect.objectContaining({
                password: 'hashed_new_password'
            })
        }));

        // Verify email sent with language
        expect(sendPasswordChangedEmail).toHaveBeenCalledWith('john@example.com', 'John', 'pt-BR');
    });

    it('should NOT send email if password is not updated', async () => {
        // Mock Auth
        (verifyToken as jest.Mock).mockResolvedValue({ userId: 'user-1' });

        const req = new NextRequest(new URL('http://localhost/api/auth/me'), {
            method: 'PUT',
            body: JSON.stringify({
                name: 'John',
                surname: 'Doe',
                // No password handled
            }),
            headers: {
                cookie: 'auth_token=valid-token'
            }
        });

        // Mock DB
        (prisma.user.update as jest.Mock).mockResolvedValue({
            id: 'user-1',
            name: 'John',
            surname: 'Doe',
            email: 'john@example.com',
        });

        const res = await PUT(req);

        expect(res.status).toBe(200);
        expect(prisma.user.update).toHaveBeenCalled();
        expect(sendPasswordChangedEmail).not.toHaveBeenCalled();
    });
});
