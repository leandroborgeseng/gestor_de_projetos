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
# Se o lockfile estiver desatualizado, permite atualização em produção
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Stage 2: Build
FROM base AS builder
WORKDIR /app

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

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
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/node_modules ./node_modules

# Criar diretório para uploads
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]

