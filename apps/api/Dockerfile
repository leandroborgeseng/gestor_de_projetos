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

# Copiar TODA a estrutura de node_modules do builder (incluindo .pnpm store e symlinks)
# Isso garante que todos os pacotes e dependências transitivas estejam disponíveis
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar estrutura do workspace para manter compatibilidade
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder --chown=nodejs:nodejs /app/apps ./apps

# Verificar estrutura crítica
RUN echo "=== Verificando express ===" && \
    if [ -d "/app/node_modules/express" ] || [ -L "/app/node_modules/express" ]; then \
        ls -la /app/node_modules/express | head -3; \
        echo "✅ express encontrado"; \
    else \
        echo "❌ express NÃO encontrado!"; \
        ls -la /app/node_modules/ | grep express || echo "Nenhum express encontrado"; \
        exit 1; \
    fi && \
    echo "=== Verificando @prisma/client ===" && \
    if [ -d "/app/node_modules/@prisma/client" ] || [ -L "/app/node_modules/@prisma/client" ]; then \
        ls -la /app/node_modules/@prisma/client | head -3; \
        echo "✅ @prisma/client encontrado"; \
    else \
        echo "❌ @prisma/client NÃO encontrado!"; \
        ls -la /app/node_modules/@prisma/ 2>&1 || echo "Diretório @prisma não existe"; \
    fi && \
    echo "=== Verificando ip-address ===" && \
    if [ -d "/app/node_modules/ip-address" ] || [ -L "/app/node_modules/ip-address" ]; then \
        ls -la /app/node_modules/ip-address | head -3; \
        echo "✅ ip-address encontrado"; \
    else \
        echo "⚠️  ip-address não encontrado (pode ser dependência transitiva)"; \
    fi

# Criar diretório para uploads
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]
