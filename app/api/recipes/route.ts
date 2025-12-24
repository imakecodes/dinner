import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const payload = await verifyToken(token || '');
    if (!payload || (!payload.kitchenId && !payload.houseId)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const kitchenId = (payload.kitchenId || payload.houseId) as string;
    const userId = payload.userId as string;

    // Fetch recipes for this kitchen
    const recipes = await prisma.recipe.findMany({
      where: {
        kitchenId: kitchenId
      },
      orderBy: {
        createdAt: "desc"
      },
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
        favoritedBy: {
          where: {
            member: {
              userId: userId
            }
          }
        }
      }
    });

    const formattedRecipes = recipes.map(r => {
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

      return {
        ...r,
        ingredients_from_pantry: r.ingredients.filter(i => i.inPantry).map(i => normalizeMapping(i.ingredient, i)),
        shopping_list: r.shoppingItems.map(s => normalizeMapping(s.shoppingItem, s)),
        step_by_step: typeof r.step_by_step === 'string' ? JSON.parse(r.step_by_step) : r.step_by_step,
        isFavorite: r.favoritedBy.length > 0
      };
    });

    return NextResponse.json(formattedRecipes);
  } catch (error) {
    console.error('GET /api/recipes error:', error);
    return NextResponse.json({ message: 'Erro ao buscar receitas salvas', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const token = request.cookies.get('auth_token')?.value;
    const payload = await verifyToken(token || '');
    if (!payload || (!payload.kitchenId && !payload.houseId)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const kitchenId = (payload.kitchenId || payload.houseId) as string;
    const userId = payload.userId as string;

    // Resolve current member for favorites
    const member = await prisma.kitchenMember.findFirst({
      where: {
        userId: userId,
        kitchenId: kitchenId
      }
    });

    const parse = (val: any) => typeof val === 'string' ? JSON.parse(val) : val;
    const rawPantryIngredients = Array.isArray(parse(data.ingredients_from_pantry)) ? parse(data.ingredients_from_pantry) : [];
    const rawShoppingList = Array.isArray(parse(data.shopping_list)) ? parse(data.shopping_list) : [];

    // Normalize both to objects { name, quantity, unit }
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

    const pantryIngredients = rawPantryIngredients.map(normalize);
    const shoppingList = rawShoppingList.map(normalize);

    const recipe = await prisma.recipe.create({
      data: {
        recipe_title: data.recipe_title,
        analysis_log: data.analysis_log || 'Manual Entry',
        match_reasoning: data.match_reasoning || 'User Created',
        step_by_step: data.step_by_step, // Stored as JSON
        safety_badge: data.safety_badge ?? true, // Default to true if not provided (manual trust)
        meal_type: data.meal_type,
        difficulty: data.difficulty,
        prep_time: data.prep_time,
        dishImage: data.dishImage,
        language: data.language || 'en',
        kitchenId: kitchenId,

        ingredients: {
          create: pantryIngredients.map((item: { name: string, quantity: string, unit: string }) => ({
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
          create: shoppingList.map((item: { name: string, quantity: string, unit: string }) => ({
            shoppingItem: {
              connectOrCreate: {
                where: { name_kitchenId: { name: item.name, kitchenId } },
                create: { name: item.name, quantity: item.quantity, unit: item.unit, kitchenId }
              }
            }
          }))
        },

        favoritedBy: (data.isFavorite && member) ? {
          create: { memberId: member.id }
        } : undefined
      }
    });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('POST /api/recipes error:', error);
    return NextResponse.json({ message: 'Erro ao salvar receita no banco', error: String(error) }, { status: 500 });
  }
}
