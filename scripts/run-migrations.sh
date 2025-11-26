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

# Obter DATABASE_URL do container
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Executar migrações passando DATABASE_URL explicitamente
echo -e "${YELLOW}Executando migrações com DATABASE_URL explícita...${NC}"
docker exec agilepm-api sh -c "DATABASE_URL='$DB_URL' prisma migrate deploy --schema=$SCHEMA_PATH" || \
docker exec agilepm-api sh -c "DATABASE_URL='$DB_URL' npx prisma migrate deploy --schema=$SCHEMA_PATH" || {
    echo -e "${RED}❌ Erro ao executar migrações${NC}"
    echo -e "${YELLOW}📋 Verificando DATABASE_URL...${NC}"
    MASKED_URL=$(echo "$DB_URL" | sed 's/:[^@]*@/:***@/')
    echo "DATABASE_URL: $MASKED_URL"
    echo -e "${YELLOW}💡 A senha pode ter caracteres especiais que precisam ser codificados${NC}"
    exit 1
}

echo -e "${GREEN}✅ Migrações executadas com sucesso!${NC}"
