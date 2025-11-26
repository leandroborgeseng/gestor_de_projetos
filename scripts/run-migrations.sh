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
SCHEMA_PATH=""
if docker exec agilepm-api sh -c "test -f /app/prisma/schema.prisma" 2>/dev/null; then
    SCHEMA_PATH="/app/prisma/schema.prisma"
elif docker exec agilepm-api sh -c "test -f /app/apps/api/prisma/schema.prisma" 2>/dev/null; then
    SCHEMA_PATH="/app/apps/api/prisma/schema.prisma"
fi

if [ -z "$SCHEMA_PATH" ]; then
    echo -e "${RED}❌ Schema do Prisma não encontrado!${NC}"
    echo -e "${YELLOW}📋 Verificando estrutura do container...${NC}"
    docker exec agilepm-api sh -c "ls -la /app/ | head -20"
    docker exec agilepm-api sh -c "find /app -name schema.prisma 2>/dev/null | head -5"
    exit 1
fi

echo -e "${GREEN}✓ Schema encontrado em: $SCHEMA_PATH${NC}"

# Executar migrações usando o caminho absoluto do schema
docker exec agilepm-api sh -c "prisma migrate deploy --schema=$SCHEMA_PATH" || \
docker exec agilepm-api sh -c "npx prisma migrate deploy --schema=$SCHEMA_PATH" || {
    echo -e "${RED}❌ Erro ao executar migrações${NC}"
    echo -e "${YELLOW}📋 Verificando se Prisma está instalado...${NC}"
    docker exec agilepm-api sh -c "which prisma || echo 'prisma não encontrado'"
    exit 1
}

echo -e "${GREEN}✅ Migrações executadas com sucesso!${NC}"
