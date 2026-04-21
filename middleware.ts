import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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
const excludedPaths = [
  '/api/healthz', // Health check precisa ser acessível
  '/_next/static', // Assets estáticos do Next.js
  '/_next/image',  // Otimização de imagens
  '/favicon.ico',  // Favicon
]

// Importar rate limiter mais robusto
import { withRateLimit } from '@/lib/rate-limiter'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Verificar se o path está excluído
  const isExcluded = excludedPaths.some(path => pathname.startsWith(path))
  
  // Criar resposta
  const response = isExcluded ? NextResponse.next() : NextResponse.next()
  
  // Aplicar headers de segurança apenas se não for excluído
  if (!isExcluded) {
    // Adicionar headers de segurança
    Object.entries(securityHeaders).forEach(([key, value]) => {
      // Ajustar HSTS apenas em produção
      if (key === 'Strict-Transport-Security' && process.env.NODE_ENV !== 'production') {
        return // Não aplicar HSTS em desenvolvimento
      }
      response.headers.set(key, value)
    })
  }
  
  // Rate limiting para endpoints críticos
  const isCriticalEndpoint = pathname.startsWith('/api/auth/') || pathname === '/api/recipe'
  
  if (isCriticalEndpoint && process.env.NODE_ENV === 'production') {
    const rateLimitResponse = withRateLimit(request)
    
    if (rateLimitResponse) {
      return rateLimitResponse
    }
  }
  
  // Log de segurança (apenas em desenvolvimento)
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Security Middleware] ${request.method} ${pathname} - Headers aplicados: ${!isExcluded}`)
  }
  
  return response
}

// Configurar matcher para o middleware
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
}