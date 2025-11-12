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

# Instalar dependências
# Tenta com frozen-lockfile primeiro, se falhar atualiza o lockfile
RUN pnpm install --frozen-lockfile || (echo "Lockfile desatualizado, atualizando..." && pnpm install)

# Stage 2: Build
FROM base AS builder
WORKDIR /app

# Copiar dependências da raiz (pnpm workspace coloca dependências aqui)
COPY --from=deps /app/node_modules ./node_modules

# Copiar node_modules específicos do workspace se existirem
RUN --mount=from=deps,source=/app/apps/api/node_modules,target=/tmp/api_node_modules \
    if [ -d /tmp/api_node_modules ] && [ "$(ls -A /tmp/api_node_modules 2>/dev/null)" ]; then \
        mkdir -p ./apps/api && cp -r /tmp/api_node_modules ./apps/api/node_modules; \
    fi

# Copiar código fonte
COPY . .

# Gerar Prisma Client e build
WORKDIR /app/apps/api

# Gerar Prisma Client
RUN pnpm prisma generate

# Build da aplicação usando esbuild (não gera tipos)
RUN pnpm build

# Stage 3: Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copiar arquivos necessários
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./package.json

# Copiar node_modules da raiz (pnpm workspace coloca dependências aqui)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar node_modules do workspace específico se existir
RUN --mount=from=builder,source=/app/apps/api/node_modules,target=/tmp/api_node_modules \
    if [ -d /tmp/api_node_modules ] && [ "$(ls -A /tmp/api_node_modules 2>/dev/null)" ]; then \
        cp -r /tmp/api_node_modules/* ./node_modules/ 2>/dev/null || true; \
    fi

# Criar diretório para uploads
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]
