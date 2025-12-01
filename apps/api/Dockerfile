# Dockerfile para API (Backend)
FROM node:20-slim AS base

# Instalar pnpm, curl (para healthcheck) e dependências do Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl ca-certificates curl && \
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

# Copiar package.json para a raiz também (para o seed funcionar)
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/package.json ./package.json

# Copiar TODA a estrutura de node_modules do builder (incluindo symlinks)
# Isso garante que todos os pacotes e dependências transitivas estejam disponíveis
# O --chown precisa ser feito depois porque COPY preserva symlinks
COPY --from=builder /app/node_modules ./node_modules

# Copiar node_modules do workspace da API (onde estão os symlinks dos pacotes)
# No pnpm workspace, os pacotes da API estão em apps/api/node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Ajustar permissões (symlinks são preservados)
RUN chown -R nodejs:nodejs /app/node_modules /app/apps || true

# Copiar estrutura do workspace para manter compatibilidade (se necessário)
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Copiar Prisma CLI do builder (necessário para executar migrações)
# O Prisma está em devDependencies, mas precisamos dele para migrações
RUN if [ -d "/app/node_modules/.pnpm" ]; then \
        echo "Prisma deve estar no .pnpm store"; \
    fi

# Instalar Prisma e tsx globalmente para poder executar migrações e seed
RUN npm install -g prisma@^5.8.0 tsx@^4.7.0 || echo "Prisma/tsx já podem estar disponíveis via npx"

# Criar symlinks para todos os pacotes do workspace na raiz
# Isso garante que o Node.js encontre todos os pacotes quando executar de /app/dist/index.js
RUN echo "=== Criando symlinks para pacotes do workspace ===" && \
    if [ -d "/app/apps/api/node_modules" ]; then \
        echo "Copiando pacotes de apps/api/node_modules para /app/node_modules..." && \
        cd /app/apps/api/node_modules && \
        for pkg in *; do \
            if [ "$pkg" != "node_modules" ] && [ ! -e "/app/node_modules/$pkg" ]; then \
                if [[ "$pkg" == @* ]]; then \
                    # É um diretório com escopo (@prisma, @types, etc)
                    mkdir -p "/app/node_modules/$(dirname "$pkg")" 2>/dev/null || true; \
                    ln -s "../../apps/api/node_modules/$pkg" "/app/node_modules/$pkg" 2>/dev/null || true; \
                else \
                    # É um pacote normal
                    ln -s "../apps/api/node_modules/$pkg" "/app/node_modules/$pkg" 2>/dev/null || true; \
                fi; \
            fi; \
        done && \
        echo "✅ Symlinks criados"; \
    fi

# Verificar pacotes críticos
RUN echo "=== Verificando pacotes críticos ===" && \
    MISSING_PACKAGES="" && \
    for pkg in express cors @prisma/client bcryptjs jsonwebtoken; do \
        if [ ! -d "/app/node_modules/$pkg" ] && [ ! -L "/app/node_modules/$pkg" ]; then \
            MISSING_PACKAGES="$MISSING_PACKAGES $pkg"; \
        fi; \
    done && \
    if [ -n "$MISSING_PACKAGES" ]; then \
        echo "❌ Pacotes faltando:$MISSING_PACKAGES"; \
        echo "Conteúdo de /app/node_modules:"; \
        ls -la /app/node_modules/ 2>/dev/null | head -20 || echo "node_modules vazio"; \
        echo "Conteúdo de /app/apps/api/node_modules:"; \
        ls -la /app/apps/api/node_modules/ 2>/dev/null | head -20 || echo "apps/api/node_modules não existe"; \
        exit 1; \
    else \
        echo "✅ Todos os pacotes críticos encontrados"; \
        ls -la /app/node_modules/ | grep -E "express|cors|@prisma" | head -5; \
    fi

# Criar diretório para uploads
RUN mkdir -p /app/uploads && chown -R nodejs:nodejs /app/uploads

USER nodejs

EXPOSE 4000

# Comando para iniciar a aplicação
CMD ["node", "dist/index.js"]
