import { NextRequest, NextResponse } from 'next/server';
import { triggerManualSnapshot, getSnapshotStatus } from '@/lib/cron';

// Middleware simples de autenticação (placeholder)
const validateAdminToken = (token: string): boolean => {
    // Em produção, implementar verificação JWT adequada
    const adminToken = process.env.ADMIN_API_TOKEN;
    return adminToken && token === adminToken;
};

export async function GET(request: NextRequest) {
    try {
        // Verificar autenticação
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        if (!validateAdminToken(token)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const status = await getSnapshotStatus();
        return NextResponse.json({ success: true, ...status });
        
    } catch (error: any) {
        console.error('[API] Error getting snapshot status:', error);
        return NextResponse.json({ 
            success: false, 
            error: error?.message || 'Internal server error' 
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        // Verificar autenticação
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        if (!validateAdminToken(token)) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const { mode = 'standard' } = await request.json();
        
        // Validar mode
        if (!['standard', 'enhanced', 'incremental'].includes(mode)) {
            return NextResponse.json({ 
                success: false, 
                error: 'Invalid mode. Must be one of: standard, enhanced, incremental' 
            }, { status: 400 });
        }

        const result = await triggerManualSnapshot(mode as 'standard' | 'enhanced' | 'incremental');
        
        if (result.success) {
            return NextResponse.json({ 
                success: true, 
                message: result.message,
                mode
            });
        } else {
            return NextResponse.json({ 
                success: false, 
                error: result.message,
                details: result.details
            }, { status: 500 });
        }
        
    } catch (error: any) {
        console.error('[API] Error triggering manual snapshot:', error);
        return NextResponse.json({ 
            success: false, 
            error: error?.message || 'Internal server error' 
        }, { status: 500 });
    }
}