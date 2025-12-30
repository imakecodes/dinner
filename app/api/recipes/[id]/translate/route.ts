import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateRecipe } from '@/services/geminiService';
import { GeneratedRecipe } from '@/types';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const { targetLanguage } = await req.json();

        if (!targetLanguage) {
            return NextResponse.json({ error: 'Target language is required' }, { status: 400 });
        }

        // 1. Fetch the recipe to be translated
        const recipe = await prisma.recipe.findUnique({
            where: { id },
            include: {
                ingredients: { include: { ingredient: true } },
                shoppingItems: { include: { shoppingItem: true } }
            }
        });

        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // 2. Determine the "Root" Original ID
        // If this recipe is already a translation, use its original. Otherwise, this IS the original.
        const rootOriginalId = recipe.originalRecipeId || recipe.id;

        // 3. Check if a translation already exists for this language linked to the same root
        const existingTranslation = await prisma.recipe.findFirst({
            where: {
                originalRecipeId: rootOriginalId,
                language: targetLanguage
            }
        });

        if (existingTranslation) {
            // Return existing translation immediately
            // We need to fetch it with full details to match the expect response format if frontend expects full object
            // Ideally we redirect, but the frontend expects the data to render/redirect.
            // Let's return the basic fields or fetch full if needed. Frontend currently expects GeneratedRecipe-like + id.
            return NextResponse.json(existingTranslation);
        }

        // 4. Prepare payload for AI
        const generatedFormat: GeneratedRecipe = {
            analysis_log: recipe.analysis_log,
            recipe_title: recipe.recipe_title,
            match_reasoning: recipe.match_reasoning,
            ingredients_from_pantry: recipe.ingredients.filter(i => i.inPantry).map(i => ({
                name: i.ingredient.name,
                quantity: i.quantity || '',
                unit: i.unit || ''
            })),
            shopping_list: recipe.shoppingItems.map(i => ({
                name: i.shoppingItem.name,
                quantity: i.shoppingItem.quantity || '',
                unit: i.shoppingItem.unit || ''
            })),
            step_by_step: recipe.step_by_step as string[],
            safety_badge: recipe.safety_badge,
            meal_type: recipe.meal_type as any,
            difficulty: recipe.difficulty as any,
            prep_time: recipe.prep_time
        };

        // 5. Call AI
        const translated = await translateRecipe(generatedFormat, targetLanguage);

        // 6. Create Linked Records in Transaction
        const newRecipe = await prisma.$transaction(async (tx) => {
            // A. Create the new Recipe Record
            const createdRecipe = await tx.recipe.create({
                data: {
                    recipe_title: translated.recipe_title,
                    match_reasoning: translated.match_reasoning,
                    step_by_step: translated.step_by_step,
                    language: targetLanguage,
                    analysis_log: translated.analysis_log || recipe.analysis_log,
                    safety_badge: recipe.safety_badge,
                    meal_type: recipe.meal_type,
                    difficulty: recipe.difficulty,
                    prep_time: recipe.prep_time,
                    dishImage: recipe.dishImage, // Shared image
                    kitchenId: recipe.kitchenId,
                    originalRecipeId: rootOriginalId // LINK HERE
                }
            });

            // B. Handle Ingredients (Pantry items)
            // We iterate through the TRANSLATED list.
            // Assumption: AI maintains order so index i corresponds to recipe.ingredients[i] (filtered by inPantry)
            // This is loose but accepted for this implementation as strict mapping is hard without IDs.
            const originalPantryIngredients = recipe.ingredients.filter(i => i.inPantry);

            if (translated.ingredients_from_pantry && Array.isArray(translated.ingredients_from_pantry)) {
                for (let i = 0; i < translated.ingredients_from_pantry.length; i++) {
                    const ing = translated.ingredients_from_pantry[i];
                    const originalRef = originalPantryIngredients[i]; // May be undefined if array lengths mismatch

                    // Search for existing ingredient in this language
                    let dbIngredient = await tx.ingredient.findUnique({
                        where: {
                            name_kitchenId: {
                                name: ing.name,
                                kitchenId: recipe.kitchenId
                            }
                        }
                    });

                    // If not found, create it linked to original if possible
                    if (!dbIngredient) {
                        dbIngredient = await tx.ingredient.create({
                            data: {
                                name: ing.name,
                                kitchenId: recipe.kitchenId,
                                // Link to original ingredient ID if we have a reference
                                originalIngredientId: originalRef ? originalRef.ingredientId : undefined
                            }
                        });
                    }

                    // Create the Recipe-Ingredient link
                    await tx.recipeIngredient.create({
                        data: {
                            recipeId: createdRecipe.id,
                            ingredientId: dbIngredient.id,
                            quantity: ing.quantity,
                            unit: ing.unit,
                            amount: `${ing.quantity} ${ing.unit}`.trim(),
                            inPantry: true
                        }
                    });
                }
            }

            // C. Handle Shopping List
            let shoppingListToProcess = translated.shopping_list;
            
            // Fallback: If AI returns empty list but original had items, use original (untranslated) to prevent data loss
            if ((!shoppingListToProcess || shoppingListToProcess.length === 0) && recipe.shoppingItems.length > 0) {
                console.warn("Translation returned empty shopping list. Falling back to original.");
                shoppingListToProcess = recipe.shoppingItems.map(i => ({
                    name: i.shoppingItem.name,
                    quantity: i.shoppingItem.quantity || '',
                    unit: i.shoppingItem.unit || ''
                }));
            }

            if (shoppingListToProcess && Array.isArray(shoppingListToProcess)) {
                for (let i = 0; i < shoppingListToProcess.length; i++) {
                    const item = shoppingListToProcess[i];
                    const originalRef = recipe.shoppingItems[i]; // May be undefined if lengths differ

                    // 1. Find or Create the Shopping Item (Global/Kitchen level)
                    // If we have an originalRef, validation could ideally check if we are just renaming it?
                    // But here we want a NEW item in the Target Language (e.g. "Cebola" instead of "Onion")
                    
                    const dbShoppingItem = await tx.shoppingItem.findUnique({
                        where: {
                            name_kitchenId: {
                                name: item.name,
                                kitchenId: recipe.kitchenId
                            }
                        }
                    });

                    let shoppingItemId = dbShoppingItem?.id;

                    if (!shoppingItemId) {
                        const newShopItem = await tx.shoppingItem.create({
                            data: {
                                name: item.name,
                                quantity: item.quantity,
                                unit: item.unit,
                                kitchenId: recipe.kitchenId,
                                originalShoppingItemId: originalRef?.shoppingItemId // Link to original if aligned
                            }
                        });
                        shoppingItemId = newShopItem.id;
                    } else if (dbShoppingItem) {
                        // Update quantity/unit on the ShoppingItem itself if needed (preserving existing logic)
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

                    // 2. Link it to the New Recipe
                    await tx.recipeShoppingItem.create({
                        data: {
                            recipeId: createdRecipe.id,
                            shoppingItemId: shoppingItemId
                        }
                    });
                }
            }

            return createdRecipe;
        });

        return NextResponse.json(newRecipe);

    } catch (error: any) {
        console.error('Translation error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to translate recipe' },
            { status: 500 }
        );
    }
}
