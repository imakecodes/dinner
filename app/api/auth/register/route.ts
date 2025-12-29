import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { generateKitchenCode } from '@/lib/kitchen-code';

export async function POST(req: NextRequest) {
    try {
        const { name, surname, email, password } = await req.json();

        if (!name || !surname || !email || !password) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json({ error: 'User already exists' }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        // Create User, linked to a new House via HouseholdMember
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                surname,
                kitchenMemberships: {
                    create: {
                        name: name,
                        isGuest: false,
                        kitchen: {
                            create: {
                                name: `${name}'s Kitchen`,
                                inviteCode: generateKitchenCode()
                            }
                        }
                    }
                }
            },
            include: {
                kitchenMemberships: {
                    include: { kitchen: true }
                }
            }
        });

        // Don't return the password
        const { password: _, ...userWithoutPassword } = user;

        const kitchenId = user.kitchenMemberships[0].kitchenId;

        const token = await signToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            kitchenId: kitchenId,
            houseId: kitchenId // Backwards compat
        });

        return NextResponse.json({ user: userWithoutPassword, token }, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
