# Segurança - POE2 Genie

Este documento descreve as medidas de segurança implementadas no projeto POE2 Genie.

## Visão Geral

O POE2 Genie implementa múltiplas camadas de segurança para proteger dados de usuários, prevenir vazamentos e garantir a integridade do sistema.

## Medidas de Segurança Implementadas

### 1. Autenticação e Autorização

#### JWT (JSON Web Tokens)
- **Tokens assinados com HS256**: Usando chave secreta configurável via `JWT_SECRET`
- **Validação em produção**: O sistema falha se `JWT_SECRET` for o valor padrão em produção
- **Cookies seguros**: Configurados com:
  - `httpOnly: true` (inacessível via JavaScript)
  - `secure: true` (apenas HTTPS em produção)
  - `sameSite: strict` (proteção CSRF)
  - Expiração: 24 horas

#### Validação de Senhas
- **bcrypt com 10 rounds**: Hash seguro de senhas
- **Validação de senha atual**: Necessária para alteração de senha
- **Tokens de recuperação**: Expiráveis com prazo definido

### 2. Headers de Segurança HTTP

O middleware de segurança aplica os seguintes headers:

#### Content Security Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self';
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

#### Outros Headers de Segurança
- **X-Content-Type-Options**: `nosniff` (previne MIME type sniffing)
- **X-Frame-Options**: `DENY` (previne clickjacking)
- **Referrer-Policy**: `strict-origin-when-cross-origin`
- **Permissions-Policy**: Restringe acesso a recursos do navegador
- **X-XSS-Protection**: `1; mode=block`
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains; preload` (apenas produção)

### 3. Rate Limiting

#### Proteção contra Brute Force
- **Login**: 10 tentativas por 15 minutos
- **Registro**: 5 tentativas por hora
- **Recuperação de senha**: 5 tentativas por hora
- **API geral**: 100 requests por minuto
- **Geração de builds**: 30 requests por minuto

#### Implementação
- Em memória para desenvolvimento
- Headers informativos: `X-RateLimit-*`
- Código de status: `429 Too Many Requests`
- Header: `Retry-After` com tempo em segundos

### 4. Validação de Input

#### Environment Variables
- Validação com **Zod schema**
- Valores padrão seguros
- Falha imediata em produção se variáveis críticas estiverem faltando
- Script de validação pré-startup

#### Dados de Usuário
- **Sanitização de HTML**: Em templates de email
- **Escape de caracteres especiais**: Para prevenir XSS
### 5. Logging Seguro

#### Redaction Automática
O sistema automaticamente redacta:
- **Tokens JWT**
- **API Keys** (Google, OpenAI, Gemini)
- **Credenciais de banco de dados**
- **Endereços de email** (preserva domínio)
- **Números de telefone**
- **Senhas e tokens em logs**

#### Logger Estruturado
- Timestamps ISO 8601
- Contexto por módulo
- Níveis: DEBUG, INFO, WARN, ERROR
- Dados estruturados em JSON

### 6. Proteção de Dados

#### Armazenamento Seguro
- **Senhas**: Hash com bcrypt
- **Tokens**: Armazenados no banco com expiração
- **Dados sensíveis**: Nunca logados em claro

#### Transmissão Segura
- **Cookies**: Apenas HTTPS em produção
- **Headers de segurança**: Aplicados em todas as responses
- **CORS**: Configurado para origens específicas

### 7. Segurança em Produção

#### Validações Específicas
1. **JWT_SECRET**: Deve ser diferente do valor padrão
2. **Variáveis críticas**: Validadas no startup
3. **Configuração SMTP**: Opcional, mas recomendada

#### Docker Security
- **Usuário não-root**: Aplicação roda como usuário `node`
- **Imagem slim**: Base image otimizada para segurança
- **Multi-stage build**: Separação de dependências de desenvolvimento

### 8. Monitoramento e Resposta

#### Health Checks
- Endpoint: `/api/healthz`
- Verifica conectividade com banco de dados
- Público (sem autenticação)
- Usado para probes de Kubernetes

#### Logs de Auditoria
- Tentativas de login (sucesso/falha)
- Alterações de senha
- Atividades administrativas

## Configuração de Ambiente

### Variáveis Críticas

```bash
# OBRIGATÓRIAS em produção
JWT_SECRET=seu_segredo_super_seguro_com_pelo_menos_32_caracteres
DATABASE_URL=mysql://usuario:senha@host:porta/banco
GEMINI_API_KEY=sua_chave_da_api_gemini

# OPCIONAIS (recomendadas)
SMTP_PASSWORD=senha_smtp_para_emails
ADMIN_API_TOKEN=token_para_api_admin
```

### Validação
```bash
# Validar environment variables
npm run validate:env

# Executar automaticamente antes de dev/build/start
npm run dev      # Executa validate:env primeiro
npm run build    # Executa validate:env primeiro  
npm run start    # Executa validate:env primeiro
```
- **Validação de tipos**: TypeScript em tempo de compilação