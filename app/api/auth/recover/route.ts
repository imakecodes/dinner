import { NextResponse } from 'next/server';

export async function POST() {
    // Mock implementation: always return success
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

    return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive password reset instructions.'
    });
}
