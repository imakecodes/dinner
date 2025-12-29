/**
 * @jest-environment node
 */
import { GET } from '@/app/api/healthz/route';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// Mock the prisma client
jest.mock('@/lib/prisma', () => ({
    prisma: {
        $queryRaw: jest.fn(),
    },
}));

describe('GET /api/healthz', () => {
    it('returns 200 and ok status when database is connected', async () => {
        (prisma.$queryRaw as jest.Mock).mockResolvedValueOnce([1]);

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({ status: 'ok', database: 'connected' });
    });

    it('returns 500 and error status when database connection fails', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        (prisma.$queryRaw as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

        const response = await GET();
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data).toEqual({
            status: 'error',
            database: 'disconnected',
            error: 'Error: Connection failed',
        });

        consoleSpy.mockRestore();
    });
});
