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

# IMPORTANTE: Copiar a estrutura completa do pnpm workspace
# 1. Copiar o diretório .pnpm que contém os pacotes reais
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.pnpm ./node_modules/.pnpm

# 2. Copiar arquivos de configuração do pnpm
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.modules.yaml ./node_modules/.modules.yaml
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.pnpm-workspace-state-v1.json ./node_modules/.pnpm-workspace-state-v1.json

# 3. Copiar os symlinks dos workspaces (onde os pacotes realmente estão)
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

# 4. Criar symlinks na raiz apontando para TODOS os pacotes do workspace
# Isso permite que o Node.js encontre os módulos quando executa de /app/dist/index.js
RUN mkdir -p /app/node_modules && \
    cd /app/node_modules && \
    # Copiar todos os pacotes e diretórios com escopo do workspace
    if [ -d "/app/apps/api/node_modules/@prisma" ]; then \
        mkdir -p @prisma && \
        cp -r /app/apps/api/node_modules/@prisma/* @prisma/ 2>/dev/null || true; \
    fi && \
    if [ -d "/app/apps/api/node_modules/@types" ]; then \
        mkdir -p @types && \
        cp -r /app/apps/api/node_modules/@types/* @types/ 2>/dev/null || true; \
    fi && \
    # Criar symlinks para pacotes individuais
    for pkg in express cors morgan helmet dotenv bcryptjs jsonwebtoken multer axios exceljs ics zod swagger-jsdoc swagger-ui-express express-rate-limit; do \
        if [ -e "/app/apps/api/node_modules/$pkg" ]; then \
            ln -sf "../apps/api/node_modules/$pkg" "$pkg" 2>/dev/null || true; \
        fi; \
    done

# Verificar se pacotes importantes estão presentes
RUN echo "=== Verificando express ===" && \
    ls -la /app/node_modules/express 2>&1 || echo "❌ express não encontrado!" && \
    echo "=== Verificando @prisma/client ===" && \
    ls -la /app/node_modules/@prisma/client 2>&1 || echo "❌ @prisma/client não encontrado!"

# Criar diretório para uploads
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]
