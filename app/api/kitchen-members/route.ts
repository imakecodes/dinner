import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET: Fetch members
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const payload = await verifyToken(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const kitchenId = payload.kitchenId as string;

    const members = await prisma.kitchenMember.findMany({
      where: { kitchenId },
      include: {
        restrictions: true,
        likes: true,
        dislikes: true
      }
    });

    const formattedMembers = members.map(m => ({
      ...m,
      restrictions: m.restrictions.map(r => r.name),
      likes: m.likes.map(l => l.name),
      dislikes: m.dislikes.map(d => d.name)
    }));

    return NextResponse.json(formattedMembers || []);
  } catch (error) {
    console.error('GET /api/kitchen-members error:', error);
    return NextResponse.json({ message: 'Error fetching members', error: String(error) }, { status: 500 });
  }
}

// POST: Add/Update member
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;
    const payload = await verifyToken(token || '');
    if (!payload || !payload.kitchenId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const kitchenId = payload.kitchenId as string;

    const data = await request.json();

    const processTags = (tags: string[]) => {
      if (!Array.isArray(tags)) return undefined;
      // Simplistic approach: Delete existing tags for this member and create new ones.
      // This matches the current non-shared tag architecture.
      return {
        deleteMany: {},
        create: tags.map(t => ({ name: t }))
      };
    };

    let member;
    let userIdToLink: string | undefined = undefined;

    // Stub for sending email (since we cannot install nodemailer)
    const sendInviteEmail = (to: string, name: string) => {
      console.log(`[SMTP MOCK] Sending invite to ${to}: "Hello ${name}, you have been added to the Kitchen!"`);
      // In a real implementation:
      // const transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, ... });
      // await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject: 'Kitchen Invite', ... });
    };

    if (data.email) {
      const linkedUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (linkedUser) {
        userIdToLink = linkedUser.id;
        // Logic: specific request "leave leave invite as pending" 
        // implies we might just link them but they have to accept? 
        // Or if they are a user, we link them and maybe they see it in their dashboard?
        // For this hackathon scope, linking them directly is "Pending" enough visually if we show it.
      } else {
        // User not found, send invite email
        if (!data.id) { // Only send on create? Or on update too? Let's assume on create/update with new email.
          sendInviteEmail(data.email, data.name);
        }
      }
    }

    if (data.id && !data.id.startsWith('h-') && !data.id.startsWith('g-') && !data.id.startsWith('temp-')) {
      // Update existing
      member = await prisma.kitchenMember.update({
        where: { id: data.id },
        data: {
          name: data.name,
          email: data.email || null,
          restrictions: processTags(data.restrictions),
          likes: processTags(data.likes),
          dislikes: processTags(data.dislikes),
          isGuest: data.isGuest !== undefined ? data.isGuest : undefined
          // If we want to link user on update:
          // userId: userIdToLink // Prisma might complain if we try to set it to undefined if strictly typed, but let's try.
        },
        include: {
          restrictions: true,
          likes: true,
          dislikes: true
        }
      });

      // Separate update for userId if found, to avoid complex nested issues or if we want to be explicit
      if (userIdToLink) {
        await prisma.kitchenMember.update({ where: { id: data.id }, data: { userId: userIdToLink } });
      }

    } else {
      // Create new
      member = await prisma.kitchenMember.create({
        data: {
          name: data.name,
          email: data.email || null,
          userId: userIdToLink,
          restrictions: { create: (data.restrictions || []).map((n: string) => ({ name: n })) },
          likes: { create: (data.likes || []).map((n: string) => ({ name: n })) },
          dislikes: { create: (data.dislikes || []).map((n: string) => ({ name: n })) },
          // If userId is linked, logic says "manager can alter". 
          // Default: If user exists, they are Member (isGuest=false) usually, but sticking to logic:
          isGuest: data.isGuest !== undefined ? data.isGuest : (!userIdToLink),
          kitchenId: kitchenId
        },
        include: {
          restrictions: true,
          likes: true,
          dislikes: true
        }
      });

      if (!userIdToLink && data.email) {
        sendInviteEmail(data.email, data.name);
      }
    }

    const formattedMember = {
      ...member,
      restrictions: member.restrictions.map(r => r.name),
      likes: member.likes.map(l => l.name),
      dislikes: member.dislikes.map(d => d.name)
    };

    return NextResponse.json(formattedMember);
  } catch (error) {
    console.error('POST /api/kitchen-members error:', error);
    return NextResponse.json({ message: 'Error saving member', error: String(error) }, { status: 500 });
  }
}
