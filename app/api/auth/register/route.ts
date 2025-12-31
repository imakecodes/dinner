import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { generateKitchenCode } from '@/lib/kitchen-code';
import { sendVerificationEmail } from '@/lib/email-service';
import { getServerTranslator } from '@/lib/i18n-server';

export async function POST(req: NextRequest) {
    try {
        const { email, password, name, surname } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
        });


        if (existingUser) {
            const { t } = getServerTranslator(req);
            return NextResponse.json({ error: t('auth.userExistsError') }, { status: 400 });
        }

        const hashedPassword = await hashPassword(password);

        // Create User, linked to a new House via HouseholdMember
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                surname,
                verificationToken: crypto.randomUUID(),
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

        // Send verification email
        await sendVerificationEmail(user.email, user.verificationToken!);

        return NextResponse.json({ message: 'Registration successful. Please check your email to verify your account.' }, { status: 201 });
    } catch (error) {
        console.error('Registration error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
