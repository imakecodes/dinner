import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    const { language } = await req.json();
    
    // Mock implementation: always return success
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

    const message = (language && language.startsWith('pt'))
        ? 'Se uma conta existir com este email, você receberá instruções de redefinição de senha.'
        : 'If an account exists with this email, you will receive password reset instructions.';

    return NextResponse.json({
        success: true,
        message
    });
}
