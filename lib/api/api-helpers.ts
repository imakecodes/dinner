import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

/**
 * Common interface for authenticated API handlers
 */
export interface AuthPayload {
    userId: string;
    kitchenId: string;
    [key: string]: any;
}

/**
 * Options for authenticated API handlers
 */
export interface AuthHandlerOptions {
    requireKitchen?: boolean;
    requireUserId?: boolean;
}

/**
 * Extracts and verifies authentication token from request
 */
export async function getAuthPayload(request: NextRequest): Promise<AuthPayload | null> {
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
        return null;
    }
    
    const payload = await verifyToken(token);
    if (!payload) {
        return null;
    }
    
    return payload as AuthPayload;
}

/**
 * Creates a standardized unauthorized response
 */
export function unauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
    return NextResponse.json({ message }, { status: 401 });
}

/**
 * Creates a standardized error response
 */
export function errorResponse(message: string, status: number = 500, details?: any): NextResponse {
    return NextResponse.json({ 
        message, 
        ...(details && { details }) 
    }, { status });
}

/**
 * Creates a standardized success response
 */
export function successResponse(data: any, status: number = 200): NextResponse {
    return NextResponse.json(data, { status });
}

/**
 * Wrapper for authenticated API handlers
 * Handles common authentication and error handling patterns
 */
export async function withAuth<T = any>(
    request: NextRequest,
    handler: (payload: AuthPayload, request: NextRequest) => Promise<NextResponse<T>>,
    options: AuthHandlerOptions = { requireKitchen: true, requireUserId: true }
): Promise<NextResponse> {
    try {
        const payload = await getAuthPayload(request);
        
        if (!payload) {
            return unauthorizedResponse();
        }
        
        if (options.requireKitchen && !payload.kitchenId) {
            return unauthorizedResponse('Kitchen access required');
        }
        
        if (options.requireUserId && !payload.userId) {
            return unauthorizedResponse('User ID required');
        }
        
        return await handler(payload, request);
        
    } catch (error) {
        console.error('API handler error:', error);
        
        if (error instanceof Error) {
            return errorResponse(error.message, 500);
        }
        
        return errorResponse('Internal server error', 500);
    }
}

/**
 * Wrapper for public API handlers (no authentication required)
 */
export async function withPublic<T = any>(
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse<T>>
): Promise<NextResponse> {
    try {
        return await handler(request);
    } catch (error) {
        console.error('Public API handler error:', error);
        
        if (error instanceof Error) {
            return errorResponse(error.message, 500);
        }
        
        return errorResponse('Internal server error', 500);
    }
}

/**
 * Validates required fields in request body
 */
export function validateRequiredFields(body: any, fields: string[]): string[] {
    const missing: string[] = [];
    
    for (const field of fields) {
        if (body[field] === undefined || body[field] === null || body[field] === '') {
            missing.push(field);
        }
    }
    
    return missing;
}

/**
 * Creates a validation error response
 */
export function validationErrorResponse(missingFields: string[]): NextResponse {
    return errorResponse(
        `Missing required fields: ${missingFields.join(', ')}`,
        400,
        { missingFields }
    );
}