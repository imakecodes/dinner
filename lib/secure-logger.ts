/**
 * Logger seguro que redacta informações sensíveis
 */

// Padrões de dados sensíveis para redaction
const SENSITIVE_PATTERNS = [
  // Tokens JWT
  /(eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,})/g,
  
  // API Keys (padrões comuns)
  /(AIza[0-9A-Za-z-_]{35})/g, // Google API keys
  /(sk-[a-zA-Z0-9]{48})/g, // OpenAI keys
  /(GEMINI_[A-Z0-9]{40})/gi, // Gemini keys
  
  // Passwords em logs (evitar)
  /(password|senha|passwd|pwd)[=:]\s*['"]?([^'"\s]+)['"]?/gi,
  
  // Tokens de email
  /(token)[=:]\s*['"]?([^'"\s]{20,})['"]?/gi,
  
  // Database URLs com credenciais
  /(mysql|postgresql|mongodb):\/\/([^:]+):([^@]+)@/g,
]

/**
 * Redacta informações sensíveis de uma string
 */
export function redactSensitiveInfo(text: string): string {
  if (!text || typeof text !== 'string') {
    return text || ''
  }
  
  let redacted = text
  
  // Aplicar padrões de redaction
  SENSITIVE_PATTERNS.forEach(pattern => {
    redacted = redacted.replace(pattern, (match, ...groups) => {
      // Manter o primeiro grupo (prefixo) se existir
      if (groups[0] && groups[0] !== match) {
        return `${groups[0]}: [REDACTED]`
      }
      return '[REDACTED]'
    })
  })
  
  // Redaction adicional para emails (preservar domínio)
  redacted = redacted.replace(
    /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (match, user, domain) => `***@${domain}`
  )
  
  // Redaction para números de telefone
  redacted = redacted.replace(
    /(\+?[\d\s\-\(\)]{10,})/g,
    (match) => `[REDACTED_PHONE:${match.slice(-4)}]`
  )
  
  return redacted
}

/**
 * Logger seguro que automaticamente redacta dados sensíveis
 */
export class SecureLogger {
  private context: string
  
  constructor(context: string = 'App') {
    this.context = context
  }
  
  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const context = `[${this.context}]`
    const levelTag = `[${level}]`
    
    let logMessage = `${timestamp} ${context} ${levelTag} ${message}`
    
    if (data !== undefined) {
      const redactedData = this.redactData(data)
      logMessage += ` ${JSON.stringify(redactedData, null, 2)}`
    }
    
    return redactSensitiveInfo(logMessage)
  }
  
  private redactData(data: any): any {
    if (typeof data === 'string') {
      return redactSensitiveInfo(data)
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.redactData(item))
    }
    
    if (data && typeof data === 'object') {
      const redacted: any = {}
      
      for (const [key, value] of Object.entries(data)) {
        // Redaction especial para chaves sensíveis
        const lowerKey = key.toLowerCase()
        if (lowerKey.includes('password') || 
            lowerKey.includes('token') || 
            lowerKey.includes('secret') ||
            lowerKey.includes('key') ||
            lowerKey.includes('auth')) {
          
          if (typeof value === 'string' && value.length > 0) {
            redacted[key] = `[REDACTED_${key.toUpperCase()}:${value.slice(-4)}]`
          } else {
            redacted[key] = '[REDACTED]'
          }
        } else {
          redacted[key] = this.redactData(value)
        }
      }
      
      return redacted
    }
    
    return data
  }
  
  info(message: string, data?: any): void {
    console.log(this.formatMessage('INFO', message, data))
  }
  
  warn(message: string, data?: any): void {
    console.warn(this.formatMessage('WARN', message, data))
  }
  
  error(message: string, data?: any): void {
    console.error(this.formatMessage('ERROR', message, data))
  }
  
  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('DEBUG', message, data))
    }
  }
  
  // Métodos estáticos para uso rápido
  static info(context: string, message: string, data?: any): void {
    new SecureLogger(context).info(message, data)
  }
  
  static warn(context: string, message: string, data?: any): void {
    new SecureLogger(context).warn(message, data)
  }
  
  static error(context: string, message: string, data?: any): void {
    new SecureLogger(context).error(message, data)
  }
  
  static debug(context: string, message: string, data?: any): void {
    new SecureLogger(context).debug(message, data)
  }
}

// Logger global padrão
export const logger = new SecureLogger('POE2_Genie')

/**
 * Função helper para log seguro de erros
 */
export function logError(error: any, context?: string): void {
  const loggerInstance = context ? new SecureLogger(context) : logger
  
  if (error instanceof Error) {
    loggerInstance.error(error.message, {
      name: error.name,
      stack: error.stack,
      ...(error as any).cause && { cause: (error as any).cause }
    })
  } else {
    loggerInstance.error('Erro não padrão', { error })
  }
}

/**
 * Middleware para logging seguro de requests
 */
export function requestLogger(req: Request): void {
  const url = new URL(req.url)
  const method = req.method
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  
  logger.debug('Request', {
    method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    ip,
    userAgent: req.headers.get('user-agent'),
    contentType: req.headers.get('content-type'),
  })
}

/**
 * Middleware para logging seguro de responses
 */
export function responseLogger(res: Response, durationMs: number): void {
  logger.debug('Response', {
    status: res.status,
    statusText: res.statusText,
    durationMs,
    contentType: res.headers.get('content-type'),
    contentLength: res.headers.get('content-length'),
  })
}