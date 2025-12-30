
import { generateWeeklyPlan } from '@/services/plannerService';
import { prisma } from '@/lib/prisma';
import { GoogleGenAI } from '@google/genai';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
    prisma: {
        pantryItem: { findMany: jest.fn() },
        kitchenMember: { findMany: jest.fn() },
        mealPlan: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
        agentLog: { create: jest.fn() },
        $transaction: jest.fn((callback) => callback(prisma))
    }
}));

// Mock GoogleGenAI
jest.mock('@google/genai', () => {
    const mockGenerateContent = jest.fn();
    return {
        GoogleGenAI: jest.fn().mockImplementation(() => ({
            models: {
                generateContent: mockGenerateContent
            }
        })),
        Type: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY', INTEGER: 'INTEGER' }
    };
});

describe('plannerService', () => {
    const mockContext = {
        kitchenId: 'k1',
        startDate: new Date('2025-01-01'),
        days: 3
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should generate a plan and save to DB', async () => {
        // 1. Mock Data Fetch
        (prisma.pantryItem.findMany as jest.Mock).mockResolvedValue([
            { name: 'Chicken', inStock: true }
        ]);
        (prisma.kitchenMember.findMany as jest.Mock).mockResolvedValue([
            { name: 'User', restrictions: [], likes: [], dislikes: [] }
        ]);

        // 2. Mock AI Response
        const mockAIResponse = {
            text: JSON.stringify({
                thought_process: "Planning meals based on chicken.",
                meals: [
                    {
                        dayOffset: 0,
                        mealType: 'Dinner',
                        recipeName: 'Roast Chicken',
                        reasoning: 'Use pantry chicken',
                        ingredientsUsed: ['Chicken']
                    }
                ]
            })
        };

        // Access the mock instance methods
        const mockGenAIInstance = new GoogleGenAI({ apiKey: 'test' });
        (mockGenAIInstance.models.generateContent as jest.Mock).mockResolvedValue(mockAIResponse);

        // 3. Run Service
        const result = await generateWeeklyPlan(mockContext);

        // 4. Assertions
        expect(result.meals).toHaveLength(1);
        expect(prisma.agentLog.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ type: 'REPLANNING', message: "Planning meals based on chicken." })
        }));
        expect(prisma.mealPlan.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                mealType: 'Dinner',
                status: 'PLANNED',
                notes: 'Roast Chicken - Use pantry chicken'
            })
        }));
    });
});
