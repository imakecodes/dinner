import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limiter';

// Configurações de segurança
const securityHeaders = {
  // Content Security Policy - Restringe recursos que a página pode carregar
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Previne MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Previne clickjacking
  'X-Frame-Options': 'DENY',
  
  // Controla informações do referrer
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Política de permissões de recursos do navegador
  'Permissions-Policy': [
    'camera=()',
    'microphone=()', 
    'geolocation=()',
    'payment=()',
    'usb=()',
    'serial=()',
    'bluetooth=()',
    'nfc=()',
    'gyroscope=()',
    'accelerometer=()',
    'magnetometer=()',
    'ambient-light-sensor=()'
  ].join(', '),
  
  // Proteção XSS para navegadores mais antigos
  'X-XSS-Protection': '1; mode=block',
  
  // HSTS - Forçar HTTPS (aplicado apenas em produção)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
}

// Endpoints que não precisam de headers de segurança completos
const excludedSecurityPaths = [
  '/api/healthz', // Health check precisa ser acessível
  '/_next/static', // Assets estáticos do Next.js
  '/_next/image',  // Otimização de imagens
  '/favicon.ico',  // Favicon
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ----- SECURITY HEADERS -----
  // Verificar se o path está excluído de segurança
  const isSecurityExcluded = excludedSecurityPaths.some(path => pathname.startsWith(path));
  
  // Criar resposta
  let response = NextResponse.next();
  
  // Aplicar headers de segurança apenas se não for excluído
  if (!isSecurityExcluded) {
    // Adicionar headers de segurança
    Object.entries(securityHeaders).forEach(([key, value]) => {
      // Ajustar HSTS apenas em produção
      if (key === 'Strict-Transport-Security' && process.env.NODE_ENV !== 'production') {
        return; // Não aplicar HSTS em desenvolvimento
      }
      response.headers.set(key, value);
    });
  }

  // ----- RATE LIMITING -----
  // Rate limiting para endpoints críticos
  const isCriticalEndpoint = pathname.startsWith('/api/auth/') || pathname === '/api/recipe';
  
  if (isCriticalEndpoint && process.env.NODE_ENV === 'production') {
    const rateLimitResponse = withRateLimit(request);
    
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  // ----- AUTHENTICATION -----
  // Redirect /home to /
  if (pathname === '/home') {
    return NextResponse.redirect(new URL('/', request.nextUrl));
  }

  // Define public paths that don't require authentication
  const isPublicPath =
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/recover' ||
      pathname === '/api/healthz' ||
      pathname === '/verify-email' || // Also needed for the new page!
      pathname === '/reset-password' ||
      pathname.startsWith('/api/auth'); // Allow auth API routes

  // Static assets and internal next paths are usually handled automatically by matcher,
  // but explicitly ignoring them in logic if needed is safe.

  const token = request.cookies.get('auth_token')?.value || '';

  // Verify token
  const payload = await verifyToken(token);
  // Strict check: must have payload and kitchenId (multi-tenancy)
  const isAuthenticated = !!payload && !!payload.kitchenId;

  // Case 1: User is accessing a public path but is already logged in
  if (isPublicPath && isAuthenticated) {
    if (!pathname.startsWith('/api/auth')) {
      // Redirect to home if they try to access login/register while logged in
      return NextResponse.redirect(new URL('/', request.nextUrl));
    }
    return response;
  }

  // Case 2: User is accessing a protected path and is NOT logged in
  if (!isPublicPath && !isAuthenticated) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    // Redirect to login for page requests
    return NextResponse.redirect(new URL('/login', request.nextUrl));
  }

  // Case 3: Standard Access or API calls
  // Log de segurança (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Security Proxy] ${request.method} ${pathname} - Headers aplicados: ${!isSecurityExcluded}`);
  }
  
  return response;
}

// Configurar matcher para o proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/ (tratado separadamente para rate limiting)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

