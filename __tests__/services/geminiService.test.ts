
import { generateRecipe } from '../../services/geminiService';
import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../lib/prisma';

// Mock dependencies
jest.mock('@google/genai', () => {
    return {
        GoogleGenAI: jest.fn().mockImplementation(() => ({
            models: {
                generateContent: jest.fn()
            }
        })),
        Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY', BOOLEAN: 'BOOLEAN' }
    };
});

jest.mock('../../lib/prisma', () => ({
    prisma: {
        geminiUsage: {
            create: jest.fn()
        }
    }
}));

describe('geminiService', () => {
    const mockHousehold = [{ id: '1', name: 'User', kitchenId: 'k1', userId: 'u1' }];
    const mockContext = {
        meal_type: 'dinner',
        difficulty_preference: 'easy',
        prep_time_limit: '30m'
    } as any;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('generateRecipe should return parsed recipe on success', async () => {
        const mockResponseText = JSON.stringify({
            recipe_title: 'Test Recipe',
            ingredients_from_pantry: ['Salt'],
            shopping_list: ['Pepper']
        });

        // Setup mock return
        const mockGenerateContent = jest.fn().mockResolvedValue({
            text: mockResponseText,
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 }
        });
        
        (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({
            models: { generateContent: mockGenerateContent }
        }));

        const result = await generateRecipe(mockHousehold, mockContext);

        expect(result.recipe_title).toBe('Test Recipe');
        expect(mockGenerateContent).toHaveBeenCalled();
        expect(prisma.geminiUsage.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                kitchenId: 'k1',
                inputTokens: 10
            })
        }));
    });

    it('should throw error if AI response is empty', async () => {
        const mockGenerateContent = jest.fn().mockResolvedValue({ text: null });
        (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({
            models: { generateContent: mockGenerateContent }
        }));

        await expect(generateRecipe(mockHousehold, mockContext))
            .rejects.toThrow('AI generation failed');
    });

    it('should handle logging failure gracefully', async () => {
        const mockResponseText = JSON.stringify({ recipe_title: 'Test' });
        const mockGenerateContent = jest.fn().mockResolvedValue({ text: mockResponseText });
        
        (GoogleGenAI as unknown as jest.Mock).mockImplementation(() => ({
            models: { generateContent: mockGenerateContent }
        }));

        (prisma.geminiUsage.create as jest.Mock).mockRejectedValue(new Error('DB Error'));
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // Should not throw
        await generateRecipe(mockHousehold, mockContext);
        
        expect(consoleSpy).toHaveBeenCalledWith("Failed to log Gemini usage:", expect.any(Error));
        consoleSpy.mockRestore();
    });
});
