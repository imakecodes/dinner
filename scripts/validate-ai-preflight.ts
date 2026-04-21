#!/usr/bin/env ts-node --esm -P tsconfig.json

/**
 * Script para validar preflight antes das validações de IA
 * Executa: validate:env, lint, build
 * Tenta auto-corrigir erros de lint
 */

import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

function runCommand(command: string, args: string[], cwd: string): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    console.log(`\n🚀 Executando: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      cwd,
      stdio: 'pipe',
      shell: true,
    });

    let output = '';
    let errorOutput = '';

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
      output += text;
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      process.stderr.write(text);
      errorOutput += text;
    });

    child.on('close', (code) => {
      const success = code === 0;
      if (!success) {
        console.error(`\n❌ Comando falhou com código: ${code}`);
      }
      resolve({ success, output: output + errorOutput });
    });

    child.on('error', (err) => {
      console.error(`\n❌ Erro ao executar comando: ${err.message}`);
      resolve({ success: false, output: err.message });
    });
  });
}

async function main() {
  console.log('🔍 Validando preflight para validações de IA...');
  console.log('📋 Executando: pnpm run validate:env, pnpm lint, pnpm build');
  console.log('🛠️  Tentando auto-corrigir erros de lint...\n');

  const cwd = process.cwd();
  let hasErrors = false;

  // 1. Validar environment variables
  console.log('\n' + '='.repeat(80));
  console.log('1. VALIDANDO ENVIRONMENT VARIABLES');
  console.log('='.repeat(80));
  
  const validateEnvResult = await runCommand('pnpm', ['run', 'validate:env'], cwd);
  if (!validateEnvResult.success) {
    console.error('\n❌ Falha na validação das environment variables.');
    hasErrors = true;
  }

  // 2. Tentar auto-corrigir lint
  console.log('\n' + '='.repeat(80));
  console.log('2. AUTO-CORRIGINDO ERROS DE LINT');
  console.log('='.repeat(80));
  
  const lintFixResult = await runCommand('pnpm', ['run', 'lint:fix'], cwd);
  if (!lintFixResult.success) {
    console.warn('\n⚠️  Auto-correção de lint encontrou problemas. Continuando...');
  }

  // 3. Verificar lint
  console.log('\n' + '='.repeat(80));
  console.log('3. VERIFICANDO LINT');
  console.log('='.repeat(80));
  
  const lintResult = await runCommand('pnpm', ['lint'], cwd);
  if (!lintResult.success) {
    console.error('\n❌ Erros de lint encontrados após auto-correção.');
    hasErrors = true;
  }

  // 4. Build
  console.log('\n' + '='.repeat(80));
  console.log('4. VERIFICANDO BUILD');
  console.log('='.repeat(80));
  
  const buildResult = await runCommand('pnpm', ['build'], cwd);
  if (!buildResult.success) {
    console.error('\n❌ Falha no build.');
    hasErrors = true;
  }

  // Resumo
  console.log('\n' + '='.repeat(80));
  console.log('RESUMO DA VALIDAÇÃO PREFLIGHT');
  console.log('='.repeat(80));
  
  if (hasErrors) {
    console.error('\n❌ VALIDAÇÃO PREFLIGHT FALHOU!');
    console.error('As seguintes etapas precisam ser corrigidas:');
    console.error('1. Verifique as environment variables');
    console.error('2. Corrija os erros de lint');
    console.error('3. Corrija os erros de build');
    console.error('\n⚠️  As validações de IA podem não funcionar corretamente.');
    process.exit(1);
  } else {
    console.log('\n✅ VALIDAÇÃO PREFLIGHT BEM-SUCEDIDA!');
    console.log('Todas as verificações passaram:');
    console.log('✓ Environment variables válidas');
    console.log('✓ Código segue padrões de lint');
    console.log('✓ Build compila sem erros');
    console.log('\n🎉 As validações de IA podem prosseguir com segurança.');
    process.exit(0);
  }
}

main().catch((error) => {
  console.error('❌ Erro inesperado no script de preflight:', error);
  process.exit(1);
});