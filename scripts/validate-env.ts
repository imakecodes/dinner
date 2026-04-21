#!/usr/bin/env ts-node --esm -P tsconfig.json

/**
 * Script para validar environment variables antes do startup
 * Executar: ts-node scripts/validate-env.ts
 */

import { initializeEnvValidation } from '../lib/env-validation.ts'

console.log('🔍 Validando environment variables...')

try {
  const env = initializeEnvValidation()
  
  console.log('✅ Environment variables válidas!')
  console.log(`📊 Resumo:`)
  console.log(`   - Ambiente: ${env.NODE_ENV}`)
  console.log(`   - Porta: ${env.APP_PORT}`)
  console.log(`   - Database: ${env.DATABASE_URL ? 'Configurado' : 'Não configurado'}`)
  console.log(`   - JWT Secret: ${env.JWT_SECRET === 'fallback_secret_key_change_me' ? '⚠️  USANDO VALOR PADRÃO!' : 'Configurado'}`)
  console.log(`   - Gemini API: ${env.GEMINI_API_KEY ? 'Configurado' : 'Não configurado'}`)
  console.log(`   - SMTP: ${env.SMTP_PASSWORD ? 'Configurado' : 'Não configurado'}`)
  
  if (env.NODE_ENV === 'production') {
    console.log('\n⚠️  AVISOS PARA PRODUÇÃO:')
    
    if (env.JWT_SECRET === 'fallback_secret_key_change_me') {
      console.error('❌ ERRO CRÍTICO: JWT_SECRET não pode ser o valor padrão em produção!')
      process.exit(1)
    }
    
    if (!env.GEMINI_API_KEY) {
      console.warn('⚠️  AVISO: GEMINI_API_KEY não está definida. A geração de builds não funcionará.')
    }
    
    if (!env.SMTP_PASSWORD) {
      console.warn('⚠️  AVISO: SMTP_PASSWORD não está definida. Emails não serão enviados.')
    }
  }
  
  console.log('\n🎉 Validação concluída com sucesso!')
  process.exit(0)
  
} catch (error) {
  console.error('❌ Falha na validação das environment variables:')
  console.error(error)
  process.exit(1)
}