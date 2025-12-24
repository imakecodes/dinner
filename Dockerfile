# Multi-stage Dockerfile for Next.js 15 app

# -------------------------
# Stage 1: builder
# -------------------------
FROM git.makecodes.dev/docker/node22-alpine AS builder
WORKDIR /app

# Dependências de sistema mínimas (adapte se precisar de compilação nativa)
RUN apk add --no-cache libc6-compat curl

# Habilita pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Copia package files e instala dependências (cache layer)
COPY package.json pnpm-lock.yaml* ./
# Prisma generate runs on postinstall, so we need the schema
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Permite configurar o backend no build (embed em bundle cliente)
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

# Permite configurar a chave do Statsig no build (embed em bundle cliente)
ARG NEXT_PUBLIC_STATSIG_CLIENT_KEY
ENV NEXT_PUBLIC_STATSIG_CLIENT_KEY=${NEXT_PUBLIC_STATSIG_CLIENT_KEY}

# Argumento para versão da aplicação
ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}

# Copia o restante do código e executa o build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build


# -------------------------
# Stage 2: runner-prod
# Produção: somente dependências de produção e artefatos de build
# -------------------------
# Security: Use Distroless to remove shell, package managers, and other attack vectors
FROM gcr.io/distroless/nodejs22-debian12 AS runner-prod
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Mantém variável no runtime para consistência
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

# Copia artefatos gerados pelo builder (standalone)
# - .next/standalone contém o servidor Node e node_modules necessários
# - .next/static contém assets estáticos do Next
# - public contém assets do app
# Security: Ensure files are owned by the nonroot user
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static


# Security: Use nonroot user provided by Distroless (uid 65532)
USER nonroot

EXPOSE 3000

# Inicia o servidor standalone
CMD ["server.js"]


# -------------------------
# Stage 3: runner-dev
# Desenvolvimento: inclui fontes e dependências dev; útil para container dev
# -------------------------
FROM git.makecodes.dev/docker/node22-alpine AS runner-dev
WORKDIR /app

# Instala curl para desenvolvimento e debugging
RUN apk add --no-cache curl

ENV NODE_ENV=development

# Instala todas as dependências (inclui dev) para rodar `pnpm run dev`
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# Copia todo o código fonte para permitir hot-reload quando usar mount de volume
COPY . .

EXPOSE 3000

# Comando de desenvolvimento (turbopack)
# Quando montamos um volume nomeado em /app/node_modules, ele começa vazio e
# sobrepõe o node_modules criado no build da imagem. Garanta que as dependências
# existam instalando-as se necessário, então inicie o dev server.
CMD ["sh", "-lc", "echo 'Installing deps (pnpm install) on startup...'; pnpm install; pnpm run dev"]




# -------------------------
# Stage 4: final (default)
# Produção como estágio final padrão (não requer --target)
# -------------------------
FROM runner-prod
