
import { GoogleGenAI, Type } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { KitchenMember, PantryItem } from "../types";

const GENAI_MODEL = 'gemini-2.0-flash-exp'; // Fast model for planning

interface PlannerContext {
    kitchenId: string;
    startDate: Date;
    days: number;
    language?: string;
}

interface PlannedMealAI {
    dayOffset: number;
    mealType: string;
    recipeName: string;
    description: string;
    reasoning: string;
    ingredientsUsed: string[]; // Names only
    steps: string[];
    prepTime: string;
    difficulty: string;
}

export const generateWeeklyPlan = async (
    context: PlannerContext
) => {
    const { kitchenId, startDate, days, language } = context;

    // 1. Gather Context
    const pantryItems = await prisma.pantryItem.findMany({
        where: { kitchenId, inStock: true }
    });

    const members = await prisma.kitchenMember.findMany({
        where: { kitchenId },
        include: { restrictions: true, likes: true, dislikes: true }
    });

    // 2. Build Prompt
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const inventoryList = pantryItems.map(p => p.name).join(", ");
    
    // Default to all members eating
    const memberProfiles = members.map(m => {
        return `${m.name}: [${m.restrictions.map(r => r.name).join(", ")}] Likes: ${m.likes.map(l => l.name).join(", ")}`;
    }).join("\n");

    const lang = language || 'en';
    const langInstruction = `\nIMPORTANT: OUTPUT MUST BE IN "${lang}" LANGUAGE.`;

    const systemInstruction = `
        You are an Autonomous Meal Planner Agent.
        Your goal is to plan ${days} days of **DINNERS** for a household.
        
        Current Inventory (Use these first to reduce waste): ${inventoryList}
        household Profiles:
        ${memberProfiles}

        Rules:
        1. Prioritize using existing inventory.
        2. Respect dietary restrictions strictly.
        3. Provide a plan for ${days} days starting from day 0.
        4. Output JSON only.
    ` + langInstruction;

    const prompt = `Generate a ${days}-day dinner plan.`;

    // 3. Call AI
    const response = await ai.models.generateContent({
        model: GENAI_MODEL,
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    thought_process: { type: Type.STRING },
                    meals: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                dayOffset: { type: Type.INTEGER },
                                mealType: { type: Type.STRING },
                                recipeName: { type: Type.STRING },
                                description: { type: Type.STRING },
                                reasoning: { type: Type.STRING },
                                ingredientsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
                                steps: { type: Type.ARRAY, items: { type: Type.STRING } },
                                prepTime: { type: Type.STRING },
                                difficulty: { type: Type.STRING }
                            },
                            required: ["dayOffset", "mealType", "recipeName", "description", "reasoning", "ingredientsUsed", "steps", "prepTime", "difficulty"]
                        }
                    }
                },
                required: ["thought_process", "meals"]
            }
        }
    });

    if (!response.text) throw new Error("Planner AI failed");

    // Log Usage
    try {
        const inputTokens = response.usageMetadata?.promptTokenCount || 0;
        const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;

        await prisma.geminiUsage.create({
            data: {
                prompt,
                response: response.text,
                inputTokens,
                outputTokens,
                kitchenId
            }
        });
    } catch (err) {
        console.error("Failed to log Gemini usage:", err);
    }

    const result = JSON.parse(response.text) as { thought_process: string, meals: PlannedMealAI[] };

    // 4. Persist to DB
    await prisma.$transaction(async (tx) => {
        // Log log
        await tx.agentLog.create({
            data: {
                kitchenId,
                type: 'REPLANNING',
                message: result.thought_process
            }
        });

        // Save Meals
        for (const meal of result.meals) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + meal.dayOffset);

            // A. Find or Create Recipe
            let recipeId: string | undefined;

            const existingRecipe = await tx.recipe.findFirst({
                where: { 
                    kitchenId,
                    recipe_title: { equals: meal.recipeName } 
                }
            });

            if (existingRecipe) {
                recipeId = existingRecipe.id;
            } else {
                // Create Ingredients first (or find them)
                const ingredientIds: string[] = [];
                for (const ingredName of meal.ingredientsUsed) {
                    const ing = await tx.ingredient.upsert({
                        where: { name_kitchenId: { name: ingredName, kitchenId } },
                        update: {},
                        create: { name: ingredName, kitchenId }
                    });
                    ingredientIds.push(ing.id);
                }

                const newRecipe = await tx.recipe.create({
                    data: {
                        kitchenId,
                        recipe_title: meal.recipeName,
                        meal_type: meal.mealType.toLowerCase(),
                        difficulty: meal.difficulty || 'intermediate',
                        prep_time: meal.prepTime || '30 mins',
                        safety_badge: true,
                        analysis_log: 'Generated by Planner Agent',
                        match_reasoning: meal.reasoning,
                        step_by_step: meal.steps || [],
                        language: lang,
                        ingredients: {
                            create: ingredientIds.map(ingId => ({
                                inPantry: false, // Default
                                amount: "1 unit",
                                quantity: "1",
                                unit: "unit",
                                ingredient: { connect: { id: ingId } }
                            }))
                        }
                    }
                });
                recipeId = newRecipe.id;
            }

            // B. Upsert MealPlan
            // Range check for date
            const existingPlan = await tx.mealPlan.findFirst({
                where: {
                   kitchenId,
                   mealType: meal.mealType,
                   date: {
                       gte: new Date(date.setHours(0,0,0,0)),
                       lt: new Date(date.setHours(23,59,59,999))
                   }
                }
            });

            if (existingPlan) {
                await tx.mealPlan.update({
                    where: { id: existingPlan.id },
                    data: {
                        notes: `${meal.recipeName} - ${meal.reasoning}`,
                        status: 'PLANNED',
                        language: lang,
                        recipeId,
                        // Connect all current members as default eaters if not set? 
                        // Or just leave existing members?
                        // For a REPLAN, maybe we should update members? 
                        // Let's assume on REPLAN we reset to all members unless logic says otherwise
                        members: {
                            set: members.map(m => ({ id: m.id }))
                        }
                    }
                });
            } else {
                await tx.mealPlan.create({
                    data: {
                        kitchenId,
                        date: new Date(date),
                        mealType: meal.mealType,
                        notes: `${meal.recipeName} - ${meal.reasoning}`,
                        status: 'PLANNED',
                        language: lang,
                        recipeId,
                        members: {
                            connect: members.map(m => ({ id: m.id }))
                        }
                    }
                });
            }
        }
    });

    return result;
};
