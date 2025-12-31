
import { POST } from '@/app/api/auth/register/route';
import { prisma } from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email-service';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        kitchen: {
            create: jest.fn(),
        },
        kitchenMember: {
            create: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
    },
}));

jest.mock('@/lib/email-service', () => ({
    sendVerificationEmail: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
    hash: jest.fn().mockResolvedValue('hashed_password'),
}));

jest.mock('@/lib/i18n-server', () => ({
    getServerTranslator: jest.fn().mockReturnValue({
        t: (key: string) => key,
        lang: 'en'
    })
}));

describe('Registration API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create user with unverified email', async () => {
        const req = new NextRequest(new URL('http://localhost/api/auth/register'), {
            method: 'POST',
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123',
                name: 'Test',
                surname: 'User'
            })
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'test@example.com',
            // emailVerified is not passed to create, it defaults to null in DB.
            // So we should check that it is NOT defined in the data passed to create, or explicitly set to null if logic dictates.
            // In our code logic, we don't set it, so it's undefined in the call arguments.
            language: 'en'
        });
        (prisma.kitchen.create as jest.Mock).mockResolvedValue({ id: 'kitchen-1' });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(201);
        // We verify that we DO NOT set emailVerified to true or anything else.
        // Actually, let's just make sure we don't pass 'emailVerified' at all (implicit null)
        expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.not.objectContaining({
                emailVerified: expect.anything()
            })
        }));
        expect(sendVerificationEmail).toHaveBeenCalled();
    });

    it('should localize default kitchen name based on language', async () => {
        // This test verifies the logic inside the route that formats the kitchen name
        // Since we mocked the implementation, we mainly check if the logic *inside* the route passes correct name to prisma.kitchen.create
        // However, since we mock $transaction and run it, we can inspect calls.

        const req = new NextRequest(new URL('http://localhost/api/auth/register'), {
            method: 'POST',
            body: JSON.stringify({
                email: 'pt@example.com',
                password: '123',
                name: 'Maria',
                surname: 'Silva',
                language: 'pt-BR' // Simulate sending language header or body if API supported it, checks route logic
            }),
            headers: {
                'accept-language': 'pt-BR'
            }
        });

        // Fix mock to return format string, as route handles replacement manually
        const { getServerTranslator } = require('@/lib/i18n-server');
        getServerTranslator.mockReturnValue({
            t: (key: string) => {
                if (key === 'auth.defaultKitchenName') return 'Cozinha de {name}';
                return key;
            },
            lang: 'pt-BR'
        });

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({
            id: 'user-pt',
            email: 'pt@example.com',
            name: 'Maria'
        });

        await POST(req);

        expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                kitchenMemberships: expect.objectContaining({
                    create: expect.objectContaining({
                        kitchen: expect.objectContaining({
                            create: expect.objectContaining({
                                name: 'Cozinha de Maria'
                            })
                        })
                    })
                })
            })
        }));
    });
});
