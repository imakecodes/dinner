
import { POST } from '@/app/api/recipes/[id]/translate/route';
import { prisma } from '@/lib/prisma';
import { translateRecipe } from '@/services/geminiService';
import { NextRequest } from 'next/server';

jest.mock('@/lib/prisma', () => ({
    prisma: {
        recipe: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
        },
        ingredient: {
            findUnique: jest.fn(),
            create: jest.fn(),
        },
        recipeIngredient: {
            findMany: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
        shoppingItem: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        },
        recipeShoppingItem: {
            findMany: jest.fn(),
            create: jest.fn(),
            deleteMany: jest.fn(),
        },
        $transaction: jest.fn((callback) => callback(prisma)),
    },
}));

jest.mock('@/services/geminiService');

describe('Recipe Translation Fallback Logic', () => {
    const mockRecipeId = 'recipe-123';
    const mockKitchenId = 'kitchen-123';
    
    const mockOriginalRecipe = {
        id: mockRecipeId,
        recipe_title: 'Original Recipe',
        match_reasoning: 'Test',
        step_by_step: ['Step 1'],
        language: 'en',
        analysis_log: 'Log',
        safety_badge: true,
        meal_type: 'main',
        difficulty: 'easy',
        prep_time: '15m',
        dishImage: 'img.jpg',
        kitchenId: mockKitchenId,
        ingredients: [], // Empty for this test
        shoppingItems: [
             {
                shoppingItemId: 'shop-1',
                shoppingItem: { id: 'shop-1', name: 'Original Item', quantity: '1', unit: 'pcs', kitchenId: mockKitchenId }
             }
        ]
    };

    const mockTranslatedDataEmptyList = {
        recipe_title: 'Translated Recipe',
        match_reasoning: 'Translated',
        step_by_step: ['Passo 1'],
        analysis_log: 'Log',
        ingredients_from_pantry: [],
        shopping_list: [] // EMPTY LIST FROM AI
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockOriginalRecipe);
        (prisma.recipe.findFirst as jest.Mock).mockResolvedValue(null); // No existing translation
        
        // Mock creation return
        (prisma.recipe.create as jest.Mock).mockReturnValue({ id: 'new-recipe', ...mockTranslatedDataEmptyList, originalRecipeId: mockRecipeId });
    });

    it('should fallback to original shopping items when AI returns an empty list', async () => {
        (translateRecipe as jest.Mock).mockResolvedValue(mockTranslatedDataEmptyList);

        const req = new NextRequest('http://localhost/api/translate', {
            method: 'POST',
            body: JSON.stringify({ targetLanguage: 'pt-BR' }),
        });
        const params = Promise.resolve({ id: mockRecipeId });

        // Mock Shopping Item Lookup
        (prisma.shoppingItem.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.shoppingItem.create as jest.Mock).mockImplementation((args) => ({ id: 'new-shop-1', ...args.data }));

        await POST(req, { params });

        // Expect prisma.shoppingItem.create to be called with ORIGINAL item name because of fallback
        expect(prisma.shoppingItem.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                name: 'Original Item', // Should be the original name since we fell back
                originalShoppingItemId: 'shop-1'
            })
        }));

        // Expect linking
        expect(prisma.recipeShoppingItem.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                recipeId: 'new-recipe',
                shoppingItemId: 'new-shop-1'
            })
        }));
    });
});
