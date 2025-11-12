# Dockerfile para API (Backend)
FROM node:20-alpine AS base

# Instalar pnpm e dependências do Prisma
RUN apk add --no-cache openssl openssl-dev && \
    npm install -g pnpm

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Instalar dependências (incluindo devDependencies para build)
RUN pnpm install --frozen-lockfile || (echo "Lockfile desatualizado, atualizando..." && pnpm install)

# Stage 2: Build
FROM base AS builder
WORKDIR /app

# Copiar TODA a estrutura de node_modules preservando symlinks
# O pnpm workspace cria uma estrutura complexa com symlinks
COPY --from=deps /app/node_modules ./node_modules

# Copiar estrutura completa do workspace (incluindo node_modules dos workspaces se existirem)
COPY --from=deps /app/apps ./apps

# Copiar arquivos de configuração do workspace
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copiar código fonte (isso pode sobrescrever alguns arquivos, mas está ok)
COPY . .

# Gerar Prisma Client e build
# Executar a partir da raiz do workspace para pnpm encontrar o prisma
WORKDIR /app

# Gerar Prisma Client - executar do workspace da API
RUN cd apps/api && pnpm prisma generate || (cd /app && pnpm --filter @agilepm/api prisma generate) || npx prisma generate --schema=apps/api/prisma/schema.prisma

# Build da aplicação usando esbuild (não gera tipos)
WORKDIR /app/apps/api
RUN pnpm build

# Stage 3: Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copiar arquivos necessários da API
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/package.json

# SOLUÇÃO DEFINITIVA: Copiar TODA a estrutura de node_modules do builder
# Isso inclui o .pnpm com os pacotes reais e toda a estrutura de symlinks
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# Verificar estrutura
RUN echo "=== Verificando express na raiz ===" && \
    ls -la /app/node_modules/express 2>&1 || echo "express não encontrado na raiz" && \
    echo "=== Verificando express no workspace ===" && \
    ls -la /app/apps/api/node_modules/express 2>&1 || echo "express não encontrado no workspace" && \
    echo "=== Verificando .pnpm ===" && \
    ls -la /app/node_modules/.pnpm | head -5 || echo ".pnpm não encontrado"

# Criar diretório para uploads
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# IMPORTANTE: Executar do diretório onde os node_modules estão corretos
# O Node.js ESM procura node_modules relativo ao arquivo sendo executado
# Como dist/index.js está em /app/dist, ele procura em /app/node_modules
# Mas os symlinks apontam para ../../../node_modules/.pnpm que precisa existir
WORKDIR /app

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]
