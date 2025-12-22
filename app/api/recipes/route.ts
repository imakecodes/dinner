import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(recipes || []);
  } catch (error) {
    console.error('GET /api/recipes error:', error);
    return NextResponse.json({ message: 'Erro ao buscar receitas salvas', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const recipe = await prisma.recipe.create({
      data: {
        recipe_title: data.recipe_title,
        analysis_log: data.analysis_log,
        match_reasoning: data.match_reasoning,
        ingredients_from_pantry: data.ingredients_from_pantry,
        shopping_list: data.shopping_list,
        step_by_step: data.step_by_step,
        safety_badge: data.safety_badge,
        meal_type: data.meal_type,
        difficulty: data.difficulty,
        prep_time: data.prep_time,
        dishImage: data.dishImage,
        isFavorite: data.isFavorite || false
      }
    });
    return NextResponse.json(recipe);
  } catch (error) {
    console.error('POST /api/recipes error:', error);
    return NextResponse.json({ message: 'Erro ao salvar receita no banco', error: String(error) }, { status: 500 });
  }
}
