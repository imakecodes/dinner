'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { generateKitchenCode } from '@/lib/kitchen-code';
import { sendKitchenJoinRequestEmail } from '@/lib/email-service';
import { KitchenRole, MembershipStatus } from '@prisma/client';

async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) return null;

  const payload = await verifyToken(token);
  return payload; // { userId, email, kitchenId, ... }
}

export async function joinKitchen(inviteCode: string) {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Find kitchen by code
  const kitchen = await prisma.kitchen.findUnique({
    where: { inviteCode },
  });

  if (!kitchen) {
    return { error: 'Invalid invitation code' };
  }

  // Check if already a member (or pending)
  const existingMember = await prisma.kitchenMember.findUnique({
    where: {
      userId_kitchenId: {
        userId: user.userId,
        kitchenId: kitchen.id,
      },
    },
  });

  if (existingMember) {
    if (existingMember.status === MembershipStatus.PENDING) {
      return { error: 'Join request already pending' };
    }
    if (existingMember.status === MembershipStatus.APPROVED) {
      return { error: 'You are already a member of this kitchen' };
    }
    // If REJECTED, maybe allow re-request? For now, return error.
    return { error: 'Your request to join this kitchen was previously rejected' };
  }

  // Create pending membership
  const member = await prisma.kitchenMember.create({
    data: {
      userId: user.userId,
      kitchenId: kitchen.id,
      name: user.name || 'Unknown',
      email: user.email,
      role: KitchenRole.MEMBER,
      status: MembershipStatus.PENDING,
    },
  });

  // Notify Admins
  const admins = await prisma.kitchenMember.findMany({
    where: {
      kitchenId: kitchen.id,
      role: KitchenRole.ADMIN,
      userId: { not: null }, // Admins should be users
    },
    include: {
      user: true,
    },
  });

  for (const admin of admins) {
    if (admin.user?.email) {
      await sendKitchenJoinRequestEmail(admin.user.email, user.name, kitchen.name);
    }
  }

  return { success: true, message: 'Join request sent' };
}

export async function approveMember(memberId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify requester is ADMIN of the target member's kitchen
  const memberToApprove = await prisma.kitchenMember.findUnique({
    where: { id: memberId },
  });

  if (!memberToApprove) return { error: 'Member not found' };

  const requesterMembership = await prisma.kitchenMember.findUnique({
    where: {
      userId_kitchenId: {
        userId: user.userId,
        kitchenId: memberToApprove.kitchenId,
      },
    },
  });

  if (!requesterMembership || requesterMembership.role !== KitchenRole.ADMIN) {
    return { error: 'Only admins can approve members' };
  }

  await prisma.kitchenMember.update({
    where: { id: memberId },
    data: { status: MembershipStatus.APPROVED },
  });

  return { success: true };
}

export async function rejectMember(memberId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  const memberToReject = await prisma.kitchenMember.findUnique({
    where: { id: memberId },
  });

  if (!memberToReject) return { error: 'Member not found' };

  const requesterMembership = await prisma.kitchenMember.findUnique({
    where: {
      userId_kitchenId: {
        userId: user.userId,
        kitchenId: memberToReject.kitchenId,
      },
    },
  });

  if (!requesterMembership || requesterMembership.role !== KitchenRole.ADMIN) {
    return { error: 'Only admins can reject members' };
  }

  // Option: Delete record or set to REJECTED.
  // Setting to REJECTED allows tracking history.
  await prisma.kitchenMember.update({
    where: { id: memberId },
    data: { status: MembershipStatus.REJECTED },
  });
  
  return { success: true };
}

export async function refreshKitchenCode(kitchenId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: 'Unauthorized' };

  // Verify Admin
  const requesterMembership = await prisma.kitchenMember.findUnique({
    where: {
      userId_kitchenId: {
        userId: user.userId,
        kitchenId: kitchenId,
      },
    },
  });

  if (!requesterMembership || requesterMembership.role !== KitchenRole.ADMIN) {
    return { error: 'Only admins can refresh the code' };
  }

  let newCode = generateKitchenCode();
  let retries = 0;
  
  // Simple retry loop for uniqueness
  while (retries < 3) {
      try {
          await prisma.kitchen.update({
              where: { id: kitchenId },
              data: { inviteCode: newCode }
          });
          return { success: true, newCode };
      } catch (e: any) {
          if (e.code === 'P2002') { // Unique constraint violation
              newCode = generateKitchenCode();
              retries++;
          } else {
              throw e;
          }
      }
  }

  return { error: 'Failed to generate unique code, please try again.' };
}
