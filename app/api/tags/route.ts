import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  
  try {
    const tags = await prisma.tagSuggestion.findMany({
      where: category ? { category } : {}
    });
    return NextResponse.json(tags.map(t => t.tag));
  } catch (error) {
    console.error('GET /api/tags error:', error);
    return NextResponse.json({ message: 'Error fetching tag suggestions', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { category, tag } = await request.json();
    if (!category || !tag) return NextResponse.json({ message: 'Category and tag are required' }, { status: 400 });

    const suggestion = await prisma.tagSuggestion.upsert({
      where: { category_tag: { category, tag } },
      update: {},
      create: { category, tag }
    });
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('POST /api/tags error:', error);
    return NextResponse.json({ message: 'Error saving tag suggestion', error: String(error) }, { status: 500 });
  }
}
