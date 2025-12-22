import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const items = await prisma.pantryItem.findMany();
    return NextResponse.json(items.map(i => i.name));
  } catch (error) {
    console.error('GET /api/pantry error:', error);
    return NextResponse.json({ message: 'Error fetching pantry items', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    
    const item = await prisma.pantryItem.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    return NextResponse.json(item);
  } catch (error) {
    console.error('POST /api/pantry error:', error);
    return NextResponse.json({ message: 'Error adding pantry item', error: String(error) }, { status: 500 });
  }
}
