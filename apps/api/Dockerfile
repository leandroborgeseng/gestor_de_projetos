# Dockerfile para API (Backend)
FROM node:20-slim AS base

# Instalar pnpm e dependências do Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates && \
    npm install -g pnpm && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

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

# Debug: verificar onde estão os pacotes no builder
WORKDIR /app
RUN echo "=== Debug Builder: Verificando estrutura ===" && \
    echo "Conteúdo de /app/node_modules (primeiros 20):" && \
    ls -la /app/node_modules 2>/dev/null | head -20 || echo "node_modules não existe" && \
    echo "" && \
    echo "Conteúdo de /app/apps/api/node_modules (se existir):" && \
    ls -la /app/apps/api/node_modules 2>/dev/null | head -20 || echo "apps/api/node_modules não existe" && \
    echo "" && \
    echo "Procurando express:" && \
    find /app -name "express" -type d -o -name "express" -type l 2>/dev/null | head -10 || echo "express não encontrado" && \
    echo "" && \
    echo "Verificando se express existe:" && \
    ([ -d "/app/node_modules/express" ] || [ -L "/app/node_modules/express" ]) && echo "✅ express em /app/node_modules/express" || echo "❌ express NÃO em /app/node_modules/express" && \
    ([ -d "/app/apps/api/node_modules/express" ] || [ -L "/app/apps/api/node_modules/express" ]) && echo "✅ express em /app/apps/api/node_modules/express" || echo "❌ express NÃO em /app/apps/api/node_modules/express"

# Stage 3: Production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Criar usuário não-root
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nodejs

# Copiar arquivos necessários da API
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./apps/api/package.json

# Copiar TODA a estrutura de node_modules do builder (incluindo symlinks)
# Isso garante que todos os pacotes e dependências transitivas estejam disponíveis
# O --chown precisa ser feito depois porque COPY preserva symlinks
COPY --from=builder /app/node_modules ./node_modules

# Ajustar permissões (symlinks são preservados)
RUN chown -R nodejs:nodejs /app/node_modules || true

# Copiar estrutura do workspace para manter compatibilidade (se necessário)
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
# Nota: apps/api/node_modules não precisa ser copiado separadamente
# pois todos os pacotes já estão em /app/node_modules (copiado acima)

# Verificar estrutura crítica
RUN echo "=== Verificando express ===" && \
    if [ -d "/app/node_modules/express" ]; then \
        ls -la /app/node_modules/express | head -3; \
        echo "✅ express encontrado"; \
    else \
        echo "❌ express NÃO encontrado!"; \
        ls -la /app/node_modules/ 2>/dev/null | head -10 || echo "node_modules vazio"; \
        exit 1; \
    fi && \
    echo "=== Verificando @prisma/client ===" && \
    if [ -d "/app/node_modules/@prisma/client" ]; then \
        ls -la /app/node_modules/@prisma/client | head -3; \
        echo "✅ @prisma/client encontrado"; \
    else \
        echo "❌ @prisma/client NÃO encontrado!"; \
        ls -la /app/node_modules/@prisma/ 2>&1 | head -5 || echo "Diretório @prisma não existe"; \
    fi

# Criar diretório para uploads
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]
