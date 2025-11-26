#!/bin/bash

# Script para executar seed manualmente
# Uso: ./scripts/run-seed.sh

set -e

echo "🌱 Executando seed do banco de dados..."
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

echo -e "${BLUE}Executando seed...${NC}"

# Verificar onde está o seed e o schema
echo -e "${YELLOW}Verificando localização do seed e schema...${NC}"
SEED_PATH=""
SCHEMA_PATH=""

if docker exec agilepm-api sh -c "test -f /app/prisma/seed.ts" 2>/dev/null; then
    SEED_PATH="/app/prisma/seed.ts"
    SCHEMA_PATH="/app/prisma/schema.prisma"
elif docker exec agilepm-api sh -c "test -f /app/apps/api/prisma/seed.ts" 2>/dev/null; then
    SEED_PATH="/app/apps/api/prisma/seed.ts"
    SCHEMA_PATH="/app/apps/api/prisma/schema.prisma"
fi

if [ -z "$SEED_PATH" ] || [ -z "$SCHEMA_PATH" ]; then
    echo -e "${RED}❌ Seed ou schema não encontrado!${NC}"
    echo -e "${YELLOW}📋 Verificando estrutura do container...${NC}"
    docker exec agilepm-api sh -c "ls -la /app/prisma/ 2>/dev/null | head -10"
    docker exec agilepm-api sh -c "find /app -name seed.ts 2>/dev/null | head -5"
    exit 1
fi

echo -e "${GREEN}✓ Seed encontrado em: $SEED_PATH${NC}"
echo -e "${GREEN}✓ Schema encontrado em: $SCHEMA_PATH${NC}"

# Obter DATABASE_URL do container
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Executar seed usando tsx diretamente com DATABASE_URL explícita
echo -e "${YELLOW}Executando seed com tsx e DATABASE_URL explícita...${NC}"
SEED_DIR=$(dirname "$SEED_PATH")
docker exec agilepm-api sh -c "cd $SEED_DIR && DATABASE_URL='$DB_URL' tsx seed.ts" || \
docker exec agilepm-api sh -c "DATABASE_URL='$DB_URL' tsx $SEED_PATH" || \
docker exec agilepm-api sh -c "DATABASE_URL='$DB_URL' npx tsx $SEED_PATH" || {
    echo -e "${YELLOW}⚠️  tsx falhou, tentando com prisma db seed...${NC}"
    docker exec agilepm-api sh -c "DATABASE_URL='$DB_URL' prisma db seed --schema=$SCHEMA_PATH" || \
    docker exec agilepm-api sh -c "DATABASE_URL='$DB_URL' npx prisma db seed --schema=$SCHEMA_PATH" || {
        echo -e "${RED}❌ Falha ao executar seed${NC}"
        echo -e "${YELLOW}💡 Verifique se a DATABASE_URL está correta${NC}"
        exit 1
    }
}

echo -e "${GREEN}✅ Seed executado com sucesso!${NC}"
echo ""
echo -e "${GREEN}📋 Credenciais de teste:${NC}"
echo "   • ceo@alpha.com / alpha123"
echo "   • diretoria@beta.com / beta123"
echo "   • superadmin@agilepm.com / superadmin123"

