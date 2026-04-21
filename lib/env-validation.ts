import { z } from 'zod'
import { logger } from './secure-logger'

// Schema de validação para environment variables
const envSchema = z.object({
  // Ambiente
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  
  // Banco de dados
  DATABASE_URL: z.string().url().min(1, 'DATABASE_URL é obrigatória'),
  
  // Autenticação JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  
  // API Gemini
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY é obrigatória'),
  GEMINI_MODEL_PRIMARY: z.string().default('gemini-3-pro-preview'),
  GEMINI_MODEL_FALLBACK: z.string().default('gemini-2.5-flash'),
  
  // Email SMTP
  SMTP_HOST: z.string().default('smtp.resend.com'),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().default('resend'),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_EMAIL_FROM: z.string().email().default('onboarding@resend.dev'),
  SMTP_EMAIL_FROM_NAME: z.string().default('POE2 Genie'),
  
  // URL da aplicação
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Configurações PoE
  POE_FACT_VALIDATION_MODE: z.enum(['off', 'warn', 'strict']).default('strict'),
  POE_FACT_PIPELINE_BUDGET_MS: z.coerce.number().int().positive().default(12000),
  POE_OFFICIAL_SOURCE_CONFLICT_STRATEGY: z.enum(['degrade_warn', 'fail_503']).default('degrade_warn'),
  POE_KNOWLEDGE_CACHE_TTL_MIN: z.coerce.number().int().positive().default(360),
  POE_KNOWLEDGE_FETCH_TIMEOUT_MS: z.coerce.number().int().positive().default(2500),
  POE_KNOWLEDGE_LOOKUP_MODE: z.enum(['snapshot_first', 'snapshot_only', 'online_first']).default('snapshot_first'),
  
  // Cron jobs
  ENABLE_POE_SNAPSHOT_CRON: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  POE_SNAPSHOT_CRON_SCHEDULE: z.string().default('0 3 * * 1'),
  POE_SNAPSHOT_MAX_PAGES_PER_RUN: z.coerce.number().int().positive().default(240),
  ENABLE_REPLENISHMENT_CRON: z.enum(['true', 'false']).transform(val => val === 'true').default('true'),
  
  // Admin API
  ADMIN_API_TOKEN: z.string().optional(),
  
  // Legacy API
  LEGACY_API_SUNSET: z.string().optional(),
  LEGACY_API_MIGRATION_LINK: z.string().optional(),
  
  // AI Context
  AI_CONTEXT_FILE_PATH: z.string().optional(),
  
  // Runtime
  NEXT_RUNTIME: z.string().optional(),
  APP_PORT: z.coerce.number().int().positive().default(3000),
})

// Tipo inferido do schema
export type EnvConfig = z.infer<typeof envSchema>

// Cache da configuração validada
let validatedConfig: EnvConfig | null = null

/**
 * Valida e retorna as environment variables
 * @throws Error se a validação falhar
 */
export function getValidatedEnv(): EnvConfig {
  if (validatedConfig) {
    return validatedConfig
  }
  
  try {
    // Coletar todas as environment variables
    const rawEnv = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      JWT_SECRET: process.env.JWT_SECRET,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      GEMINI_MODEL_PRIMARY: process.env.GEMINI_MODEL_PRIMARY,
      GEMINI_MODEL_FALLBACK: process.env.GEMINI_MODEL_FALLBACK,
      SMTP_HOST: process.env.SMTP_HOST,
      SMTP_PORT: process.env.SMTP_PORT,
      SMTP_USER: process.env.SMTP_USER,
      SMTP_PASSWORD: process.env.SMTP_PASSWORD,
      SMTP_EMAIL_FROM: process.env.SMTP_EMAIL_FROM,
      SMTP_EMAIL_FROM_NAME: process.env.SMTP_EMAIL_FROM_NAME,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      POE_FACT_VALIDATION_MODE: process.env.POE_FACT_VALIDATION_MODE,
      POE_FACT_PIPELINE_BUDGET_MS: process.env.POE_FACT_PIPELINE_BUDGET_MS,
      POE_OFFICIAL_SOURCE_CONFLICT_STRATEGY: process.env.POE_OFFICIAL_SOURCE_CONFLICT_STRATEGY,
      POE_KNOWLEDGE_CACHE_TTL_MIN: process.env.POE_KNOWLEDGE_CACHE_TTL_MIN,
      POE_KNOWLEDGE_FETCH_TIMEOUT_MS: process.env.POE_KNOWLEDGE_FETCH_TIMEOUT_MS,
      POE_KNOWLEDGE_LOOKUP_MODE: process.env.POE_KNOWLEDGE_LOOKUP_MODE,
      ENABLE_POE_SNAPSHOT_CRON: process.env.ENABLE_POE_SNAPSHOT_CRON,
      POE_SNAPSHOT_CRON_SCHEDULE: process.env.POE_SNAPSHOT_CRON_SCHEDULE,
      POE_SNAPSHOT_MAX_PAGES_PER_RUN: process.env.POE_SNAPSHOT_MAX_PAGES_PER_RUN,
      ENABLE_REPLENISHMENT_CRON: process.env.ENABLE_REPLENISHMENT_CRON,
      ADMIN_API_TOKEN: process.env.ADMIN_API_TOKEN,
      LEGACY_API_SUNSET: process.env.LEGACY_API_SUNSET,
      LEGACY_API_MIGRATION_LINK: process.env.LEGACY_API_MIGRATION_LINK,
      AI_CONTEXT_FILE_PATH: process.env.AI_CONTEXT_FILE_PATH,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      APP_PORT: process.env.APP_PORT,
    }
    
    validatedConfig = envSchema.parse(rawEnv)
    return validatedConfig
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Erro de validação das environment variables:')
      error.errors.forEach((err) => {
        logger.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
      
      // Em produção, falhar imediatamente
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Environment variables inválidas: ${error.errors.map(e => e.message).join(', ')}`)
      }
    }
    
    throw error
  }
}

/**
 * Validação específica para produção
 * @throws Error se configurações críticas estiverem faltando em produção
 */
export function validateProductionConfig(): void {
  const env = getValidatedEnv()
  
  if (env.NODE_ENV === 'production') {
    const criticalIssues: string[] = []
    
    // Verificar JWT_SECRET não é o fallback
    if (env.JWT_SECRET === 'fallback_secret_key_change_me') {
      criticalIssues.push('JWT_SECRET não pode ser o valor padrão em produção')
    }
    
    // Verificar SMTP configurado se necessário
    // (A aplicação pode funcionar sem email em alguns casos)
    
    if (criticalIssues.length > 0) {
      throw new Error(`Configuração de produção inválida: ${criticalIssues.join(', ')}`)
    }
  }
}

/**
 * Inicialização da validação - chamar no início da aplicação
 */
export function initializeEnvValidation(): EnvConfig {
  logger.info('Validando environment variables...')
  const env = getValidatedEnv()
  
  // Validar configuração de produção
  if (env.NODE_ENV === 'production') {
    validateProductionConfig()
    logger.info('Environment variables de produção validadas com sucesso')
  } else {
    logger.info('Environment variables validadas com sucesso')
  }
  
  // Log de configurações sensíveis (apenas em desenvolvimento)
  if (env.NODE_ENV === 'development') {
    logger.debug('Configurações carregadas:', {
      NODE_ENV: env.NODE_ENV,
      APP_PORT: env.APP_PORT,
      JWT_SECRET: env.JWT_SECRET ? '***' + env.JWT_SECRET.slice(-4) : 'não definido',
      GEMINI_API_KEY: env.GEMINI_API_KEY ? '***' + env.GEMINI_API_KEY.slice(-4) : 'não definido',
      SMTP_CONFIGURED: !!env.SMTP_PASSWORD,
      DATABASE_URL: env.DATABASE_URL ? '***' + (() => {
        try {
          return new URL(env.DATABASE_URL).hostname;
        } catch {
          return 'invalid-url';
        }
      })() : 'não definido',
    })
  }
  
  return env
}

// Exportar configuração validada
export const env = getValidatedEnv()