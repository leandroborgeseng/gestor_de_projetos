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

# Tentar diferentes formas
docker exec agilepm-api sh -c "cd /app && npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma" || \
docker exec agilepm-api sh -c "cd /app/apps/api && npx prisma migrate deploy" || {
    echo -e "${RED}❌ Erro ao executar migrações${NC}"
    echo -e "${YELLOW}📋 Verificando se Prisma está disponível...${NC}"
    docker exec agilepm-api sh -c "which prisma || which npx || echo 'npx não encontrado'"
    exit 1
}

echo -e "${GREEN}✅ Migrações executadas com sucesso!${NC}"
