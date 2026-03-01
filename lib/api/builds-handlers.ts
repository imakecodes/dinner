import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { translateBuild } from '@/services/geminiService';
import {
  normalizeBuildPayload,
  serializeBuildPayload,
  type BuildResponseShape,
} from '@/lib/build-contract';
import { getServerTranslator } from '@/lib/i18n-server';
import {
  isBuildFieldTooLongError,
  isPrismaP2000Error,
  mapPrismaP2000ToFieldTooLongError,
  validateBuildPersistenceLengths,
  type BuildFieldLengthViolation,
} from '@/lib/persistence/build-length-guard';

function parseMaybeJson<T = any>(value: any): T | any {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return value;
  }
}

async function resolveAuthPayload(token: string) {
  const { verifyToken } = await import('@/lib/auth');
  return verifyToken(token);
}

function normalizeRelationItem(item: any, relation: any) {
  let name = item?.name || '';
  let quantity = relation?.quantity || '';
  let unit = relation?.unit || '';

  if (typeof name === 'string' && name.startsWith('{')) {
    try {
      const parsed = JSON.parse(name);
      name = parsed.name || name;
      quantity = quantity || parsed.quantity || '';
      unit = unit || parsed.unit || '';
    } catch {
      // Keep existing values if parsing fails.
    }
  }

  return { name, quantity, unit };
}

function toShapePayload(
  recipe: any,
  shape: BuildResponseShape,
  availableTranslations: Array<{ id: string; language: string; build_title: string }> = [],
  responseLanguage?: string,
) {
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const shoppingItems = Array.isArray(recipe?.shoppingItems) ? recipe.shoppingItems : [];
  const fallbackTranslations = Array.isArray(recipe?.translations)
    ? recipe.translations.map((item: any) => ({
      id: item.id,
      language: String(item.language),
      build_title: String(item.recipe_title || item.build_title || ''),
    }))
    : [];
  const translations = availableTranslations.length > 0 ? availableTranslations : fallbackTranslations;

  return serializeBuildPayload(
    {
      ...recipe,
      build_title: recipe.recipe_title,
      build_reasoning: recipe.match_reasoning,
      gear_gems: ingredients
        .filter((i: any) => i.inPantry)
        .map((i: any) => normalizeRelationItem(i.ingredient, i)),
      build_items: shoppingItems
        .map((s: any) => normalizeRelationItem(s.shoppingItem, s)),
      build_steps: typeof recipe.step_by_step === 'string' ? JSON.parse(recipe.step_by_step) : recipe.step_by_step,
      compliance_badge: recipe.safety_badge,
      build_archetype: recipe.meal_type,
      build_cost_tier: recipe.difficulty,
      setup_time: recipe.prep_time,
      setup_time_minutes: recipe.prep_time_minutes,
      build_image: recipe.dishImage,
      originalBuildId: recipe.originalRecipeId,
      isFavorite: Array.isArray(recipe?.favoritedBy) ? recipe.favoritedBy.length > 0 : false,
      translations,
    },
    shape,
    responseLanguage || recipe?.language,
  );
}

function getBuildFieldTooLongMessage(request: NextRequest, preferredLanguage?: string | null): string {
  const { t } = getServerTranslator(request, preferredLanguage || null);
  const localizedMessage = t('api.buildFieldTooLong');

  if (localizedMessage === 'api.buildFieldTooLong') {
    return 'One or more fields exceed storage limits. Shorten the content and try again.';
  }

  return localizedMessage;
}

function buildFieldTooLongResponse(
  request: NextRequest,
  details: BuildFieldLengthViolation[],
  preferredLanguage?: string | null,
) {
  return NextResponse.json(
    {
      error: getBuildFieldTooLongMessage(request, preferredLanguage),
      code: 'build.field_too_long',
      details,
    },
    { status: 422 },
  );
}

function maybeBuildFieldTooLongResponse(
  request: NextRequest,
  error: any,
  preferredLanguage?: string | null,
) {
  if (isBuildFieldTooLongError(error)) {
    return buildFieldTooLongResponse(
      request,
      Array.isArray(error?.details) ? error.details : [],
      preferredLanguage,
    );
  }

  if (isPrismaP2000Error(error)) {
    const mappedError = mapPrismaP2000ToFieldTooLongError(error);
    return buildFieldTooLongResponse(request, mappedError.details, preferredLanguage);
  }

  return null;
}

export async function getBuilds(request: NextRequest, shape: BuildResponseShape = 'canonical') {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const payload = await resolveAuthPayload(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const kitchenId = payload.kitchenId as string;
    const userId = payload.userId as string;
    const lang = request.nextUrl.searchParams.get('lang') || 'en';

    const recipes = await prisma.recipe.findMany({
      where: { kitchenId },
      orderBy: { createdAt: 'desc' },
      include: {
        translations: {
          select: {
            id: true,
            language: true,
            recipe_title: true,
          },
        },
        ingredients: { include: { ingredient: true } },
        shoppingItems: { include: { shoppingItem: true } },
        favoritedBy: {
          where: {
            member: { userId },
          },
        },
      },
    });

    const familyMap = new Map<string, typeof recipes>();
    recipes.forEach((recipe) => {
      const rootId = recipe.originalRecipeId || recipe.id;
      if (!familyMap.has(rootId)) {
        familyMap.set(rootId, []);
      }
      familyMap.get(rootId)?.push(recipe);
    });

    const formattedBuilds = Array.from(familyMap.values()).map((family) => {
      let selected = family.find((r) => r.language === lang);
      if (!selected) selected = family.find((r) => r.originalRecipeId === null);
      if (!selected) selected = family[0];

      const availableTranslations = family
        .filter((entry) => entry.id !== selected?.id)
        .map((entry) => ({
          id: entry.id,
          language: String(entry.language),
          build_title: entry.recipe_title,
        }));

      return toShapePayload(selected, shape, availableTranslations, lang);
    });

    return NextResponse.json(formattedBuilds);
  } catch (error) {
    console.error('GET builds handler error:', error);
    return NextResponse.json({ message: 'Error fetching saved builds', error: String(error) }, { status: 500 });
  }
}

export async function saveBuild(request: NextRequest, shape: BuildResponseShape = 'canonical') {
  let preferredLanguage: string | undefined;

  try {
    const data = await request.json();
    const token = request.cookies.get('auth_token')?.value;
    const payload = await resolveAuthPayload(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const kitchenId = payload.kitchenId as string;
    const userId = payload.userId as string;

    const member = await prisma.kitchenMember.findFirst({
      where: {
        userId,
        kitchenId,
      },
    });

    const normalizedBuild = normalizeBuildPayload({
      ...data,
      gear_gems: parseMaybeJson(data?.gear_gems ?? data?.ingredients_from_pantry),
      build_items: parseMaybeJson(data?.build_items ?? data?.shopping_list),
      build_steps: parseMaybeJson(data?.build_steps ?? data?.step_by_step),
      translations: parseMaybeJson(data?.translations),
    });
    preferredLanguage = normalizedBuild.language;

    const fieldLengthViolations = validateBuildPersistenceLengths(normalizedBuild);
    if (fieldLengthViolations.length > 0) {
      return buildFieldTooLongResponse(request, fieldLengthViolations, normalizedBuild.language);
    }

    const createdRecipe = await prisma.recipe.create({
      data: {
        recipe_title: normalizedBuild.build_title,
        analysis_log: normalizedBuild.analysis_log || 'Manual Entry',
        match_reasoning: normalizedBuild.build_reasoning || 'User Created',
        step_by_step: normalizedBuild.build_steps,
        safety_badge: normalizedBuild.compliance_badge ?? true,
        meal_type: normalizedBuild.build_archetype,
        difficulty: normalizedBuild.build_cost_tier,
        prep_time: normalizedBuild.setup_time,
        prep_time_minutes: normalizedBuild.setup_time_minutes ? parseInt(String(normalizedBuild.setup_time_minutes), 10) : null,
        dishImage: normalizedBuild.build_image,
        language: normalizedBuild.language || 'en',
        kitchenId,
        originalRecipeId: normalizedBuild.originalBuildId || null,
        ingredients: {
          create: normalizedBuild.gear_gems.map((item) => ({
            inPantry: true,
            quantity: item.quantity,
            unit: item.unit,
            ingredient: {
              connectOrCreate: {
                where: { name_kitchenId: { name: item.name, kitchenId } },
                create: { name: item.name, kitchenId },
              },
            },
          })),
        },
        shoppingItems: {
          create: normalizedBuild.build_items.map((item) => ({
            shoppingItem: {
              connectOrCreate: {
                where: { name_kitchenId: { name: item.name, kitchenId } },
                create: { name: item.name, quantity: item.quantity, unit: item.unit, kitchenId },
              },
            },
          })),
        },
        favoritedBy: normalizedBuild.isFavorite && member
          ? {
            create: { memberId: member.id },
          }
          : undefined,
      },
      include: {
        ingredients: { include: { ingredient: true } },
        shoppingItems: { include: { shoppingItem: true } },
        favoritedBy: true,
        translations: {
          select: {
            id: true,
            language: true,
            recipe_title: true,
          },
        },
      },
    });

    return NextResponse.json(toShapePayload(createdRecipe, shape));
  } catch (error) {
    const fieldTooLongResponse = maybeBuildFieldTooLongResponse(request, error, preferredLanguage);
    if (fieldTooLongResponse) {
      return fieldTooLongResponse;
    }

    console.error('POST builds handler error:', error);
    return NextResponse.json({ message: 'Error saving build', error: String(error) }, { status: 500 });
  }
}

export async function getBuildById(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
  shape: BuildResponseShape = 'canonical',
) {
  try {
    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
        shoppingItems: { include: { shoppingItem: true } },
        favoritedBy: true,
        translations: {
          select: {
            id: true,
            language: true,
            recipe_title: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ message: 'Build not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const responseLanguage = url.searchParams.get('lang') || recipe.language;
    return NextResponse.json(toShapePayload(recipe, shape, [], responseLanguage));
  } catch (error) {
    console.error('GET build by id handler error:', error);
    return NextResponse.json({ message: 'Error fetching build', error: String(error) }, { status: 500 });
  }
}

export async function updateBuildById(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
  shape: BuildResponseShape = 'canonical',
) {
  let preferredLanguage: string | undefined;

  try {
    const { id } = await params;
    const data = await request.json();

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { kitchenId: true },
    });

    if (!existingRecipe) {
      return NextResponse.json({ message: 'Build not found' }, { status: 404 });
    }

    const kitchenId = existingRecipe.kitchenId;

    const normalizedBuild = normalizeBuildPayload({
      ...data,
      gear_gems: parseMaybeJson(data?.gear_gems ?? data?.ingredients_from_pantry),
      build_items: parseMaybeJson(data?.build_items ?? data?.shopping_list),
      build_steps: parseMaybeJson(data?.build_steps ?? data?.step_by_step),
      translations: parseMaybeJson(data?.translations),
    });
    preferredLanguage = normalizedBuild.language;

    const fieldLengthViolations = validateBuildPersistenceLengths(normalizedBuild);
    if (fieldLengthViolations.length > 0) {
      return buildFieldTooLongResponse(request, fieldLengthViolations, normalizedBuild.language);
    }

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await prisma.recipeShoppingItem.deleteMany({ where: { recipeId: id } });

    const updatedRecipe = await prisma.recipe.update({
      where: { id },
      data: {
        recipe_title: normalizedBuild.build_title,
        match_reasoning: normalizedBuild.build_reasoning,
        analysis_log: normalizedBuild.analysis_log || 'Manual Entry',
        prep_time: normalizedBuild.setup_time,
        prep_time_minutes: normalizedBuild.setup_time_minutes ? parseInt(String(normalizedBuild.setup_time_minutes), 10) : null,
        difficulty: normalizedBuild.build_cost_tier,
        meal_type: normalizedBuild.build_archetype,
        step_by_step: normalizedBuild.build_steps,
        safety_badge: normalizedBuild.compliance_badge ?? true,
        dishImage: normalizedBuild.build_image,
        language: normalizedBuild.language || undefined,
        originalRecipeId: normalizedBuild.originalBuildId || null,
        ingredients: {
          create: normalizedBuild.gear_gems.map((item) => ({
            inPantry: true,
            quantity: item.quantity,
            unit: item.unit,
            ingredient: {
              connectOrCreate: {
                where: { name_kitchenId: { name: item.name, kitchenId } },
                create: { name: item.name, kitchenId },
              },
            },
          })),
        },
        shoppingItems: {
          create: normalizedBuild.build_items.map((item) => ({
            shoppingItem: {
              connectOrCreate: {
                where: { name_kitchenId: { name: item.name, kitchenId } },
                create: { name: item.name, quantity: item.quantity, unit: item.unit, kitchenId },
              },
            },
          })),
        },
      },
      include: {
        ingredients: { include: { ingredient: true } },
        shoppingItems: { include: { shoppingItem: true } },
        favoritedBy: true,
        translations: {
          select: {
            id: true,
            language: true,
            recipe_title: true,
          },
        },
      },
    });

    return NextResponse.json(toShapePayload(updatedRecipe, shape, [], updatedRecipe.language));
  } catch (error) {
    const fieldTooLongResponse = maybeBuildFieldTooLongResponse(request, error, preferredLanguage);
    if (fieldTooLongResponse) {
      return fieldTooLongResponse;
    }

    console.error('PUT build by id handler error:', error);
    return NextResponse.json({ message: 'Error updating build', error: String(error) }, { status: 500 });
  }
}

export async function deleteBuildById(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE build by id handler error:', error);
    return NextResponse.json({ message: 'Error deleting build', error: String(error) }, { status: 500 });
  }
}

export async function toggleBuildFavorite(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth_token')?.value;
    const payload = await resolveAuthPayload(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const userId = payload.userId as string;
    const kitchenId = payload.kitchenId as string;

    const member = await prisma.kitchenMember.findUnique({
      where: {
        userId_kitchenId: {
          userId,
          kitchenId,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ message: 'Party member not found' }, { status: 404 });
    }

    const existing = await prisma.favoriteRecipe.findUnique({
      where: {
        memberId_recipeId: {
          memberId: member.id,
          recipeId: id,
        },
      },
    });

    if (existing) {
      await prisma.favoriteRecipe.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ isFavorite: false });
    }

    await prisma.favoriteRecipe.create({
      data: {
        memberId: member.id,
        recipeId: id,
      },
    });
    return NextResponse.json({ isFavorite: true });
  } catch (error) {
    console.error('PATCH favorite handler error:', error);
    return NextResponse.json({ message: 'Error toggling favorite status', error: String(error) }, { status: 500 });
  }
}

export async function translateBuildById(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
  shape: BuildResponseShape = 'canonical',
) {
  let requestedLanguage: string | undefined;

  try {
    const { id } = await context.params;
    const { targetLanguage } = await req.json();
    requestedLanguage = targetLanguage;

    if (!targetLanguage) {
      return NextResponse.json({ error: 'Target language is required' }, { status: 400 });
    }

    const sourceRecipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: { include: { ingredient: true } },
        shoppingItems: { include: { shoppingItem: true } },
      },
    });

    if (!sourceRecipe) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    const rootOriginalId = sourceRecipe.originalRecipeId || sourceRecipe.id;
    const existingTranslation = await prisma.recipe.findFirst({
      where: {
        originalRecipeId: rootOriginalId,
        language: targetLanguage,
      },
      include: {
        ingredients: { include: { ingredient: true } },
        shoppingItems: { include: { shoppingItem: true } },
        translations: {
          select: { id: true, language: true, recipe_title: true },
        },
      },
    });

    if (existingTranslation) {
      return NextResponse.json(toShapePayload(existingTranslation, shape, [], targetLanguage));
    }

    const canonicalSource = normalizeBuildPayload({
      analysis_log: sourceRecipe.analysis_log,
      recipe_title: sourceRecipe.recipe_title,
      match_reasoning: sourceRecipe.match_reasoning,
      ingredients_from_pantry: sourceRecipe.ingredients
        .filter((i) => i.inPantry)
        .map((i) => ({
          name: i.ingredient.name,
          quantity: i.quantity || '',
          unit: i.unit || '',
        })),
      shopping_list: sourceRecipe.shoppingItems.map((i) => ({
        name: i.shoppingItem.name,
        quantity: i.shoppingItem.quantity || '',
        unit: i.shoppingItem.unit || '',
      })),
      step_by_step: sourceRecipe.step_by_step as string[],
      safety_badge: sourceRecipe.safety_badge,
      meal_type: sourceRecipe.meal_type,
      difficulty: sourceRecipe.difficulty,
      prep_time: sourceRecipe.prep_time,
      prep_time_minutes: sourceRecipe.prep_time_minutes,
      dishImage: sourceRecipe.dishImage,
      language: sourceRecipe.language,
      originalRecipeId: sourceRecipe.originalRecipeId,
    });

    const translatedBuild = normalizeBuildPayload(
      await translateBuild(canonicalSource as any, targetLanguage, { kitchenId: sourceRecipe.kitchenId }),
    );

    const fieldLengthViolations = validateBuildPersistenceLengths(translatedBuild);
    if (fieldLengthViolations.length > 0) {
      return buildFieldTooLongResponse(req, fieldLengthViolations, targetLanguage);
    }

    const createdRecipe = await prisma.$transaction(async (tx) => {
      const newRecipe = await tx.recipe.create({
        data: {
          recipe_title: translatedBuild.build_title,
          match_reasoning: translatedBuild.build_reasoning,
          step_by_step: translatedBuild.build_steps,
          language: targetLanguage,
          analysis_log: translatedBuild.analysis_log || sourceRecipe.analysis_log,
          safety_badge: translatedBuild.compliance_badge ?? sourceRecipe.safety_badge,
          meal_type: translatedBuild.build_archetype,
          difficulty: translatedBuild.build_cost_tier,
          prep_time: translatedBuild.setup_time,
          prep_time_minutes: translatedBuild.setup_time_minutes ?? sourceRecipe.prep_time_minutes,
          dishImage: translatedBuild.build_image || sourceRecipe.dishImage,
          kitchenId: sourceRecipe.kitchenId,
          originalRecipeId: rootOriginalId,
        },
      });

      const originalPantryIngredients = sourceRecipe.ingredients.filter((i) => i.inPantry);

      for (let i = 0; i < translatedBuild.gear_gems.length; i += 1) {
        const item = translatedBuild.gear_gems[i];
        const originalRef = originalPantryIngredients[i];

        let dbIngredient = await tx.ingredient.findUnique({
          where: {
            name_kitchenId: {
              name: item.name,
              kitchenId: sourceRecipe.kitchenId,
            },
          },
        });

        if (!dbIngredient) {
          dbIngredient = await tx.ingredient.create({
            data: {
              name: item.name,
              kitchenId: sourceRecipe.kitchenId,
              originalIngredientId: originalRef ? originalRef.ingredientId : undefined,
            },
          });
        }

        await tx.recipeIngredient.create({
          data: {
            recipeId: newRecipe.id,
            ingredientId: dbIngredient.id,
            quantity: item.quantity,
            unit: item.unit,
            amount: `${item.quantity} ${item.unit}`.trim(),
            inPantry: true,
          },
        });
      }

      let buildItems = translatedBuild.build_items;
      if ((!buildItems || buildItems.length === 0) && sourceRecipe.shoppingItems.length > 0) {
        console.warn('Translation returned empty checklist items. Falling back to original list.');
        buildItems = sourceRecipe.shoppingItems.map((i) => ({
          name: i.shoppingItem.name,
          quantity: i.shoppingItem.quantity || '',
          unit: i.shoppingItem.unit || '',
        }));
      }

      for (let i = 0; i < buildItems.length; i += 1) {
        const item = buildItems[i];
        const originalRef = sourceRecipe.shoppingItems[i];

        const existingShopping = await tx.shoppingItem.findUnique({
          where: {
            name_kitchenId: {
              name: item.name,
              kitchenId: sourceRecipe.kitchenId,
            },
          },
        });

        let shoppingItemId = existingShopping?.id;

        if (!shoppingItemId) {
          const createdShopping = await tx.shoppingItem.create({
            data: {
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              kitchenId: sourceRecipe.kitchenId,
              originalShoppingItemId: originalRef?.shoppingItemId,
            },
          });
          shoppingItemId = createdShopping.id;
        } else if (item.quantity || item.unit) {
          await tx.shoppingItem.update({
            where: { id: shoppingItemId },
            data: {
              quantity: item.quantity,
              unit: item.unit,
            },
          });
        }

        await tx.recipeShoppingItem.create({
          data: {
            recipeId: newRecipe.id,
            shoppingItemId,
          },
        });
      }

      const persistedRecipe = await tx.recipe.findUnique({
        where: { id: newRecipe.id },
        include: {
          ingredients: { include: { ingredient: true } },
          shoppingItems: { include: { shoppingItem: true } },
          translations: {
            select: { id: true, language: true, recipe_title: true },
          },
          favoritedBy: true,
        },
      });

      if (persistedRecipe && persistedRecipe.id === newRecipe.id) {
        return persistedRecipe;
      }

      return {
        ...newRecipe,
        ingredients: [],
        shoppingItems: [],
        translations: [],
        favoritedBy: [],
      };
    });

    return NextResponse.json(toShapePayload(createdRecipe, shape, [], targetLanguage));
  } catch (error: any) {
    const fieldTooLongResponse = maybeBuildFieldTooLongResponse(req, error, requestedLanguage);
    if (fieldTooLongResponse) {
      return fieldTooLongResponse;
    }

    console.error('Translation handler error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to translate build' },
      { status: 500 },
    );
  }
}
