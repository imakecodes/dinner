import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          include: {
            ingredient: true
          }
        },
        shoppingItems: {
          include: {
            shoppingItem: true
          }
        },
        favoritedBy: true
      }
    });

    if (!recipe) {
      return NextResponse.json({ message: 'Recipe not found' }, { status: 404 });
    }


    const normalizeMapping = (item: any, relation: any) => {
      let name = item.name;
      let quantity = relation.quantity || '';
      let unit = relation.unit || '';

      if (name.startsWith('{')) {
        try {
          const parsed = JSON.parse(name);
          name = parsed.name || name;
          quantity = quantity || parsed.quantity || '';
          unit = unit || parsed.unit || '';
        } catch (e) { }
      }
      return { name, quantity, unit };
    };

    // Format recipe to match frontend expectations
    const formattedRecipe = {
      ...recipe,
      ingredients_from_pantry: recipe.ingredients.filter(i => i.inPantry).map(i => normalizeMapping(i.ingredient, i)),
      shopping_list: recipe.shoppingItems.map(s => normalizeMapping(s.shoppingItem, s)),
      step_by_step: typeof recipe.step_by_step === 'string' ? JSON.parse(recipe.step_by_step as string) : recipe.step_by_step,
      isFavorite: recipe.favoritedBy.length > 0
    };

    return NextResponse.json(formattedRecipe);
  } catch (error) {
    console.error('GET /api/recipes/[id] error:', error);
    return NextResponse.json({ message: 'Error fetching recipe', error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    // 1. Delete existing relations
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
    await prisma.recipeShoppingItem.deleteMany({ where: { recipeId: id } });

    // 2. Resolve kitchenId from the recipe
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { kitchenId: true }
    });

    if (!existingRecipe) {
      return NextResponse.json({ message: 'Recipe not found' }, { status: 404 });
    }

    const kitchenId = existingRecipe.kitchenId;

    // 3. Process new ingredients and shopping list
    const normalize = (item: any) => {
      if (typeof item === 'string') {
        try {
          const parsed = JSON.parse(item);
          if (typeof parsed === 'object' && parsed !== null) {
            return {
              name: parsed.name || item,
              quantity: parsed.quantity || '',
              unit: parsed.unit || ''
            };
          }
        } catch (e) { }
        return { name: item, quantity: '', unit: '' };
      }
      return {
        name: item.name,
        quantity: item.quantity || '',
        unit: item.unit || ''
      };
    };

    const pantryIngredients = (data.ingredients_from_pantry || []).map(normalize);
    const shoppingList = (data.shopping_list || []).map(normalize);

    // 4. Update core info and re-create relations
    const updatedRecipe = await prisma.recipe.update({
      where: { id },
      data: {
        recipe_title: data.recipe_title,
        prep_time: data.prep_time,
        prep_time_minutes: data.prep_time_minutes ? parseInt(String(data.prep_time_minutes)) : null,
        difficulty: data.difficulty,
        meal_type: data.meal_type,
        step_by_step: data.step_by_step,
        ingredients: {
          create: pantryIngredients.map((item: any) => ({
            inPantry: true,
            quantity: item.quantity,
            unit: item.unit,
            ingredient: {
              connectOrCreate: {
                where: { name_kitchenId: { name: item.name, kitchenId } },
                create: { name: item.name, kitchenId }
              }
            }
          }))
        },
        shoppingItems: {
          create: shoppingList.map((item: any) => ({
            shoppingItem: {
              connectOrCreate: {
                where: { name_kitchenId: { name: item.name, kitchenId } },
                create: { name: item.name, quantity: item.quantity, unit: item.unit, kitchenId }
              }
            }
          }))
        }
      }
    });

    return NextResponse.json(updatedRecipe);
  } catch (error) {
    console.error('PUT /api/recipes/[id] error:', error);
    return NextResponse.json({ message: 'Error updating recipe', error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.recipe.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/recipes/[id] error:', error);
    return NextResponse.json({ message: 'Error deleting recipe', error: String(error) }, { status: 500 });
  }
}
