
import { GET } from '@/app/api/recipes/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
    prisma: {
        recipe: {
            findMany: jest.fn(),
        },
        kitchenMember: {
            findFirst: jest.fn(),
        }
    },
}));

jest.mock('@/lib/auth', () => ({
    verifyToken: jest.fn().mockResolvedValue({ kitchenId: 'kitchen-1', userId: 'user-1' })
}));

describe('GET /api/recipes Language Priority', () => {
    const mockOriginal = {
        id: 'orig-1',
        originalRecipeId: null,
        language: 'en',
        recipe_title: 'Chicken Soup',
        createdAt: new Date('2023-01-01'),
        ingredients: [],
        shoppingItems: [],
        favoritedBy: []
    };

    const mockTranslation = {
        id: 'trans-1',
        originalRecipeId: 'orig-1', // Linked to original
        language: 'pt-BR',
        recipe_title: 'Sopa de Frango',
        createdAt: new Date('2023-01-02'),
        ingredients: [],
        shoppingItems: [],
        favoritedBy: []
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock findMany to return both
        (prisma.recipe.findMany as jest.Mock).mockResolvedValue([mockOriginal, mockTranslation]);
    });

    it('should return original (en) when no lang specified (default en)', async () => {
        const req = new NextRequest('http://localhost/api/recipes');
        const res = await GET(req);
        const json = await res.json();

        expect(json).toHaveLength(1); // Should be grouped
        expect(json[0].id).toBe('orig-1');
        expect(json[0].recipe_title).toBe('Chicken Soup');
    });

    it('should return translation (pt-BR) when lang=pt-BR is requested', async () => {
        const req = new NextRequest('http://localhost/api/recipes?lang=pt-BR');
        const res = await GET(req);
        const json = await res.json();

        expect(json).toHaveLength(1);
        expect(json[0].id).toBe('trans-1'); // Should swap to translation
        expect(json[0].recipe_title).toBe('Sopa de Frango');
        expect(json[0].translations).toHaveLength(1);
        expect(json[0].translations[0].id).toBe('orig-1'); // Original should be listed as "translation" option
    });

    it('should fallback to original if requested language not found', async () => {
        const req = new NextRequest('http://localhost/api/recipes?lang=fr'); // French not available
        const res = await GET(req);
        const json = await res.json();

        expect(json).toHaveLength(1);
        expect(json[0].id).toBe('orig-1'); // Fallback
    });
});
