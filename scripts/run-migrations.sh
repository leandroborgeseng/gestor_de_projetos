#!/bin/bash

# Script para executar migrações manualmente
# Uso: ./scripts/run-migrations.sh

set -e

echo "📊 Executando migrações do banco de dados..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se o container está rodando
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    exit 1
fi

echo -e "${BLUE}Executando migrações...${NC}"

# Verificar onde está o schema do Prisma
echo -e "${YELLOW}Verificando localização do schema...${NC}"
SCHEMA_PATH=$(docker exec agilepm-api sh -c "ls -la /app/prisma/schema.prisma 2>/dev/null && echo '/app/prisma/schema.prisma' || ls -la /app/apps/api/prisma/schema.prisma 2>/dev/null && echo '/app/apps/api/prisma/schema.prisma' || echo ''")

if [ -z "$SCHEMA_PATH" ]; then
    echo -e "${RED}❌ Schema do Prisma não encontrado!${NC}"
    echo -e "${YELLOW}📋 Verificando estrutura do container...${NC}"
    docker exec agilepm-api sh -c "ls -la /app/ | head -20"
    docker exec agilepm-api sh -c "find /app -name schema.prisma 2>/dev/null | head -5"
    exit 1
fi

echo -e "${GREEN}✓ Schema encontrado em: $SCHEMA_PATH${NC}"

# Executar migrações usando o caminho correto
if [ "$SCHEMA_PATH" = "/app/prisma/schema.prisma" ]; then
    docker exec agilepm-api sh -c "cd /app && prisma migrate deploy --schema=prisma/schema.prisma" || \
    docker exec agilepm-api sh -c "cd /app && npx prisma migrate deploy --schema=prisma/schema.prisma" || {
        echo -e "${RED}❌ Erro ao executar migrações${NC}"
        exit 1
    }
else
    docker exec agilepm-api sh -c "cd /app/apps/api && prisma migrate deploy" || \
    docker exec agilepm-api sh -c "cd /app/apps/api && npx prisma migrate deploy" || {
        echo -e "${RED}❌ Erro ao executar migrações${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Migrações executadas com sucesso!${NC}"
