import { NextRequest } from 'next/server'
import { env } from './env-validation'

// Store para rate limiting em memória (apenas para desenvolvimento)
// Em produção, usar Redis ou serviço similar
interface RateLimitRecord {
  count: number
  resetTime: number
  firstRequestTime: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

// Configurações de rate limiting por endpoint
export interface RateLimitConfig {
  windowMs: number // Janela de tempo em milissegundos
  maxRequests: number // Máximo de requests na janela
  message?: string // Mensagem de erro
  skipSuccessfulRequests?: boolean // Não contar requests bem-sucedidos?
}

// Configurações padrão por endpoint
const defaultRateLimits: Record<string, RateLimitConfig> = {
  // Autenticação - mais restritivo
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutos
    maxRequests: 10, // 10 tentativas por 15 minutos
    message: 'Too many login attempts. Please try again later.',
  },
  '/api/auth/register': {
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 5, // 5 registros por hora
    message: 'Too many registration attempts. Please try again later.',
  },
  '/api/auth/recover': {
    windowMs: 60 * 60 * 1000, // 1 hora
    maxRequests: 5, // 5 recuperações por hora
    message: 'Too many password recovery attempts. Please try again later.',
  },
  // API geral - menos restritivo
  '/api/recipe': {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 30, // 30 requests por minuto
    message: 'Too many recipe generation requests. Please try again later.',
  },
  // Default para outros endpoints
  'default': {
    windowMs: 60 * 1000, // 1 minuto
    maxRequests: 100, // 100 requests por minuto
    message: 'Too many requests. Please try again later.',
  },
}

/**
 * Obtém o IP do cliente da request
 */
function getClientIdentifier(request: NextRequest): string {
  // Tentar obter IP real através de headers comuns
  const ip = request.ip || 
             request.headers.get('x-real-ip') ||
             request.headers.get('x-forwarded-for')?.split(',')[0] ||
             'unknown'
  
  // Para endpoints de autenticação, também considerar email/userId se disponível
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/auth/')) {
    try {
      // Tentar obter identificador do corpo da request
      const body = request.clone().json()
      // Nota: Em um middleware real, precisaríamos de uma abordagem assíncrona
      // ou cache para isso
    } catch (error) {
      // Ignorar erros de parsing
    }
  }
  
  return ip
}

/**
 * Limpa registros antigos do store
 */
function cleanupOldRecords(): void {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000
  
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime < oneHourAgo) {
      rateLimitStore.delete(key)
    }
  }
}

/**
 * Verifica se uma request está rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  customConfig?: RateLimitConfig
): { limited: boolean; remaining: number; resetTime: number; config: RateLimitConfig } {
  
  // Em desenvolvimento, podemos desabilitar rate limiting
  if (env.NODE_ENV === 'development' && process.env.DISABLE_RATE_LIMIT === 'true') {
    return {
      limited: false,
      remaining: Number.MAX_SAFE_INTEGER,
      resetTime: Date.now(),
      config: customConfig || defaultRateLimits['default']
    }
  }
  
  const identifier = getClientIdentifier(request)
  const pathname = request.nextUrl.pathname
  
  // Encontrar configuração apropriada
  let config = customConfig
  if (!config) {
    // Procurar configuração específica para o endpoint
    const endpointKey = Object.keys(defaultRateLimits).find(key => 
      pathname.startsWith(key) && key !== 'default'
    )
    config = endpointKey ? defaultRateLimits[endpointKey] : defaultRateLimits['default']
  }
  
  const now = Date.now()
  const key = `${identifier}:${pathname}`
  const record = rateLimitStore.get(key)
  
  // Se não há registro ou o registro expirou
  if (!record || now > record.resetTime) {
    const newRecord: RateLimitRecord = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequestTime: now
    }
    rateLimitStore.set(key, newRecord)
    
    // Limpar registros antigos periodicamente
    cleanupOldRecords()
    
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetTime: newRecord.resetTime,
      config
    }
  }
  
  // Verificar se excedeu o limite
  if (record.count >= config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      resetTime: record.resetTime,
      config
    }
  }
  
  // Incrementar contador
  record.count++
  rateLimitStore.set(key, record)
  
  return {
    limited: false,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
    config
  }
}

/**
 * Middleware helper para rate limiting
 */
export function withRateLimit(
  request: NextRequest,
  customConfig?: RateLimitConfig
): Response | null {
  const result = checkRateLimit(request, customConfig)
  
  if (result.limited) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000)
    
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: result.config.message,
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': result.config.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
        },
      }
    )
  }
  
  return null
}

/**
 * Decorator para usar em handlers de API
 */
export function rateLimitMiddleware(customConfig?: RateLimitConfig) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function(...args: any[]) {
      const request = args[0] // Primeiro argumento deve ser NextRequest
      
      if (request instanceof Request || request?.constructor?.name === 'NextRequest') {
        const rateLimitResponse = withRateLimit(request as NextRequest, customConfig)
        
        if (rateLimitResponse) {
          return rateLimitResponse
        }
      }
      
      return originalMethod.apply(this, args)
    }
    
    return descriptor
  }
}
