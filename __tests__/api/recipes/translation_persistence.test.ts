
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

describe('Recipe Translation Persistence API', () => {
    const mockRecipeId = 'recipe-123';
    const mockKitchenId = 'kitchen-123';
    
    // Mock Data
    const mockOriginalRecipe = {
        id: mockRecipeId,
        recipe_title: 'Chicken Soup',
        match_reasoning: 'Delicious',
        step_by_step: ['Boil water', 'Add chicken'],
        language: 'en',
        analysis_log: 'Log',
        safety_badge: true,
        meal_type: 'main',
        difficulty: 'easy',
        prep_time: '30m',
        dishImage: 'img.jpg',
        kitchenId: mockKitchenId,
        ingredients: [
            { 
                inPantry: true, 
                quantity: '1', 
                unit: 'lb', 
                ingredientId: 'ing-1',
                ingredient: { id: 'ing-1', name: 'Chicken' }
            }
        ],
        shoppingItems: [
             {
                shoppingItemId: 'shop-1',
                shoppingItem: { id: 'shop-1', name: 'Carrots', quantity: '2', unit: 'pcs' }
             }
        ]
    };

    const mockTranslatedData = {
        recipe_title: 'Sopa de Frango',
        match_reasoning: 'Delicioso',
        step_by_step: ['Ferva agua', 'Adicione frango'],
        analysis_log: 'Log Traduzido',
        ingredients_from_pantry: [
            { name: 'Frango', quantity: '1', unit: 'lb' }
        ],
        shopping_list: [
            { name: 'Cenouras', quantity: '2', unit: 'un' }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (prisma.recipe.findUnique as jest.Mock).mockResolvedValue(mockOriginalRecipe);
        (translateRecipe as jest.Mock).mockResolvedValue(mockTranslatedData);
    });

    it('should create a new recipe linked to the original when translating', async () => {
        const req = new NextRequest('http://localhost/api/translate', {
            method: 'POST',
            body: JSON.stringify({ targetLanguage: 'pt-BR' }),
        });

        const params = Promise.resolve({ id: mockRecipeId });

        // Mock no existing translation
        (prisma.recipe.findFirst as jest.Mock).mockResolvedValue(null);

        // Mock creation
        const mockNewRecipe = { ...mockTranslatedData, id: 'new-recipe-999', originalRecipeId: mockRecipeId, language: 'pt-BR' };
        (prisma.recipe.create as jest.Mock).mockResolvedValue(mockNewRecipe);

        // Mock Ingredient Lookups (not found, so create)
        (prisma.ingredient.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.ingredient.create as jest.Mock).mockImplementation((args) => ({ id: 'new-ing-1', ...args.data }));
        
        // Mock Shopping Item Lookups (not found, so create)
        (prisma.shoppingItem.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.shoppingItem.create as jest.Mock).mockImplementation((args) => ({ id: 'new-shop-1', ...args.data }));


        const res = await POST(req, { params });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.id).toBe('new-recipe-999');
        
        // Check Prisma calls
        expect(prisma.recipe.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                originalRecipeId: mockRecipeId, // CRITICAL CHECK
                language: 'pt-BR',
                recipe_title: 'Sopa de Frango'
            })
        }));

        // Check Ingredient Creation and Linking
        expect(prisma.ingredient.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                name: 'Frango',
                originalIngredientId: 'ing-1' // CRITICAL CHECK
            })
        }));

        // Check Shopping Item Creation and Linking
        expect(prisma.shoppingItem.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                name: 'Cenouras',
                originalShoppingItemId: 'shop-1' // CRITICAL CHECK
            })
        }));
    });

    it('should return existing translation if it exists', async () => {
         const req = new NextRequest('http://localhost/api/translate', {
            method: 'POST',
            body: JSON.stringify({ targetLanguage: 'pt-BR' }),
        });
        const params = Promise.resolve({ id: mockRecipeId });

        // Mock existing translation found
        const existingTrans = { id: 'existing-123', originalRecipeId: mockRecipeId, language: 'pt-BR' };
        (prisma.recipe.findFirst as jest.Mock).mockResolvedValue(existingTrans);

        const res = await POST(req, { params });
        const json = await res.json();

        expect(json.id).toBe('existing-123');
        expect(prisma.recipe.create).not.toHaveBeenCalled();
    });
});
