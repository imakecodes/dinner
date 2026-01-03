import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '../../../lib/prisma';
import { verifyToken } from '@/lib/auth';
import { sendInvitationEmail } from '@/lib/email-service';

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

    // Validation
    if (!data.name || data.name.length > 50) {
      return NextResponse.json({ message: 'Name is required and must be under 50 characters.' }, { status: 400 });
    }
    if (data.email && data.email.length > 100) {
      return NextResponse.json({ message: 'Email must be under 100 characters.' }, { status: 400 });
    }

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

    const kitchen = await prisma.kitchen.findUnique({
      where: { id: kitchenId }
    });

    // Helper to send email safely
    const handleSendInvite = async (toEmail: string, isExisting: boolean) => {
      try {
        if (kitchen) {
          const inviterName = (payload.name as string) || 'A Kitchen Member';
          await sendInvitationEmail(toEmail, inviterName, kitchen.name, kitchen.inviteCode || '', isExisting);
        }
      } catch (e) {
        console.error("Failed to send invite email", e);
      }
    };

    if (data.email) {
      const linkedUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (linkedUser) {
        userIdToLink = linkedUser.id;
        // User exists, so we link them. 
        // Logic: Send email informing them they've been added.
        // If this is an update, we might not want to spam, but instructions say "when a member is invited" (implies new).
        if (!data.id) {
          await handleSendInvite(data.email, true);
        }
      } else {
        // User not found, send invite email (Create Account)
        if (!data.id) {
          await handleSendInvite(data.email, false);
        }
      }
    }

    if (data.id && !data.id.startsWith('h-') && !data.id.startsWith('g-') && !data.id.startsWith('temp-')) {
      // Security Check: Ensure member belongs to this kitchen
      const existingRecord = await prisma.kitchenMember.findUnique({
        where: { id: data.id },
        select: { kitchenId: true }
      });
      
      if (!existingRecord) {
        return NextResponse.json({ message: 'Member not found' }, { status: 404 });
      }
      
      if (existingRecord.kitchenId !== kitchenId) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
      }

      // Check for User Link Collision (e.g. changing email to one that belongs to another member)
      if (userIdToLink) {
        const collision = await prisma.kitchenMember.findFirst({
          where: {
            kitchenId,
            userId: userIdToLink,
            id: { not: data.id }
          }
        });
        if (collision) {
          return NextResponse.json(
            { message: 'A member with this email address already exists in this kitchen.' }, 
            { status: 409 }
          );
        }
      }

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
      
      // Check for User Link Collision
      if (userIdToLink) {
        const collision = await prisma.kitchenMember.findFirst({
          where: {
            kitchenId,
            userId: userIdToLink
          }
        });
        if (collision) {
          return NextResponse.json(
            { message: 'A member with this email address already exists in this kitchen.' }, 
            { status: 409 }
          );
        }
      }

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
