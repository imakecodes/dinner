import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateRecipe } from '@/services/geminiService';
import { GeneratedRecipe, RecipeRecord } from '@/types';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> } // Updated to match Next.js 15+ dynamic route params type
) {
    try {
        const { id } = await context.params;
        const { targetLanguage } = await req.json();

        if (!targetLanguage) {
            return NextResponse.json({ error: 'Target language is required' }, { status: 400 });
        }

        const recipe = await prisma.recipe.findUnique({
            where: { id },
        });

        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Prepare object for translation (excluding DB fields)
        const generatedFormat: GeneratedRecipe = {
            analysis_log: recipe.analysis_log,
            recipe_title: recipe.recipe_title,
            match_reasoning: recipe.match_reasoning,
            // Re-parsing JSON fields if necessary, but Prisma types should handle them if we cast correctly
            // Actually, we need to fetch ingredients/shopping list from relations
            ingredients_from_pantry: [], // Placeholder, fetching below
            shopping_list: [],
            step_by_step: recipe.step_by_step as string[],
            safety_badge: recipe.safety_badge,
            meal_type: recipe.meal_type as any,
            difficulty: recipe.difficulty as any,
            prep_time: recipe.prep_time
        };

        // Fetch ingredients from pantry relation
        const ingredients = await prisma.recipeIngredient.findMany({
            where: { recipeId: id, inPantry: true },
            include: { ingredient: true }
        });

        // Fetch shopping list from relation
        const shoppingItems = await prisma.recipeShoppingItem.findMany({
            where: { recipeId: id },
            include: { shoppingItem: true }
        });

        generatedFormat.ingredients_from_pantry = ingredients.map(i => ({
            name: i.ingredient.name,
            quantity: i.quantity || '',
            unit: i.unit || ''
        }));

        generatedFormat.shopping_list = shoppingItems.map(i => ({
            name: i.shoppingItem.name,
            quantity: i.shoppingItem.quantity || '',
            unit: i.shoppingItem.unit || ''
        }));

        // Call AI Translation Service
        const translated = await translateRecipe(generatedFormat, targetLanguage);

        // PERSIST TRANSLATION
        // We will update the recipe in place. This converts the recipe to the new language.
        
        // 1. Transaction to update Recipe and replace ingredients/shopping items
        await prisma.$transaction(async (tx) => {
            // Update Recipe fields
            await tx.recipe.update({
                where: { id },
                data: {
                    recipe_title: translated.recipe_title,
                    match_reasoning: translated.match_reasoning,
                    step_by_step: translated.step_by_step,
                    language: targetLanguage,
                    // We don't change analysis_log usually, but AI provides a note, so maybe append it if you want.
                    // For now, let's keep original analysis log or if translated has it, use it.
                    // translated.analysis_log might be "Translated from English..."
                    analysis_log: translated.analysis_log || recipe.analysis_log
                }
            });

            // 2. Update Ingredients (Pantry)
            // Strategy: Delete existing RecipeIngredient links and recreate them
            // BUT we want to keep the link to the original 'Ingredient' entity if possible?
            // Actually, the ingredient NAME is what is translated. So we likely need NEW Ingredient entities or find existing ones in that language.
            // For simplicity in this hackathon context: 
            // We will unlink old ingredients and link to new/existing ingredients matching the translated names.

            await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });

            if (translated.ingredients_from_pantry && Array.isArray(translated.ingredients_from_pantry)) {
            for (const ing of translated.ingredients_from_pantry) {
                // Find or create Ingredient by name (per kitchen? context doesn't give kitchenId easily here but Recipe has it)
                // We need kitchenId. Recipe has it.
                
                // Oops, 'recipe' fetched above has kitchenId
                const ingredientName = ing.name;

                let dbIngredient = await tx.ingredient.findUnique({
                    where: {
                        name_kitchenId: {
                            name: ingredientName,
                            kitchenId: recipe.kitchenId
                        }
                    }
                });

                if (!dbIngredient) {
                    dbIngredient = await tx.ingredient.create({
                        data: {
                            name: ingredientName,
                            kitchenId: recipe.kitchenId
                        }
                    });
                }

                await tx.recipeIngredient.create({
                    data: {
                        recipeId: id,
                        ingredientId: dbIngredient.id,
                        quantity: ing.quantity,
                        unit: ing.unit,
                        amount: `${ing.quantity} ${ing.unit}`.trim(),
                        inPantry: true // These came from 'ingredients_from_pantry' list
                    }
                });
            }
            }

            // 3. Update Shopping List
            await tx.recipeShoppingItem.deleteMany({ where: { recipeId: id } });

            if (translated.shopping_list && Array.isArray(translated.shopping_list)) {
            for (const item of translated.shopping_list) {
                const itemName = item.name;

                let dbShoppingItem = await tx.shoppingItem.findUnique({
                    where: {
                        name_kitchenId: {
                            name: itemName,
                            kitchenId: recipe.kitchenId
                        }
                    }
                });

                if (!dbShoppingItem) {
                    dbShoppingItem = await tx.shoppingItem.create({
                        data: {
                            name: itemName,
                            kitchenId: recipe.kitchenId
                        }
                    });
                }

                await tx.recipeShoppingItem.create({
                    data: {
                        recipeId: id,
                        shoppingItemId: dbShoppingItem.id
                    }
                });
                
                // Note: We might be losing quantity/unit on the ShoppingItem model if it store it directly?
                // Model: ShoppingItem has quantity/unit. RecipeShoppingItem is just a link.
                // If we reuse an existing ShoppingItem, we shouldn't overwrite its quantity unless specific logic.
                // But for this generated recipe, we effectively want to say "This recipe needs X amount of item Y".
                // The current schema: ShoppingItem has 'quantity' and 'unit'. This implies a ShoppingItem is an instance on a list.
                // If multiple recipes point to the same ShoppingItem, the quantity is ambiguous. 
                // However, the schema seems to use unique[name, kitchenId], which implies ShoppingItem is unique per name.
                // So if "Apples" is in the list, it's there once.
                
                // For the purpose of translation, we just link to the translated item name.
                // We update the ShoppingItem's quantity/unit to match this recipe's requirement? 
                // Or maybe just leave it provided the name matches.
                // Let's update it to ensure the list reflects the current recipe needs if it's new.
                
                if (item.quantity || item.unit) {
                     await tx.shoppingItem.update({
                        where: { id: dbShoppingItem.id },
                        data: {
                            quantity: item.quantity,
                            unit: item.unit
                        }
                     });
                }
            }
            }
        });

        // Return the translated object (which now matches DB state)
        return NextResponse.json(translated);

    } catch (error: any) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to translate recipe' },
            { status: 500 }
        );
    }
}
