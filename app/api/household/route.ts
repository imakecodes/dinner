import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';

export async function GET() {
  try {
    const members = await prisma.householdMember.findMany();
    return NextResponse.json(members || []);
  } catch (error) {
    console.error('GET /api/household error:', error);
    return NextResponse.json({ message: 'Error fetching household members', error: String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    let member;
    // Check if it's an existing member or a new one
    if (data.id && !data.id.startsWith('h-') && !data.id.startsWith('g-') && !data.id.startsWith('temp-')) {
        member = await prisma.householdMember.upsert({
            where: { id: data.id },
            update: {
                name: data.name,
                restrictions: data.restrictions,
                likes: data.likes,
                dislikes: data.dislikes,
                isGuest: data.isGuest || false
            },
            create: {
                name: data.name,
                restrictions: data.restrictions,
                likes: data.likes,
                dislikes: data.dislikes,
                isGuest: data.isGuest || false
            }
        });
    } else {
        member = await prisma.householdMember.create({
            data: {
                name: data.name,
                restrictions: data.restrictions,
                likes: data.likes,
                dislikes: data.dislikes,
                isGuest: data.isGuest || false
            }
        });
    }
    
    return NextResponse.json(member);
  } catch (error) {
    console.error('POST /api/household error:', error);
    return NextResponse.json({ message: 'Error saving household member', error: String(error) }, { status: 500 });
  }
}
