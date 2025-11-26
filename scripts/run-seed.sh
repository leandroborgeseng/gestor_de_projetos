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

# Tentar diferentes formas
docker exec agilepm-api sh -c "cd /app && npx prisma db seed --schema=apps/api/prisma/schema.prisma" || \
docker exec agilepm-api sh -c "cd /app/apps/api && npx prisma db seed" || {
    echo -e "${RED}❌ Erro ao executar seed${NC}"
    echo -e "${YELLOW}📋 Verificando se Prisma está disponível...${NC}"
    docker exec agilepm-api sh -c "which prisma || which npx || echo 'npx não encontrado'"
    exit 1
}

echo -e "${GREEN}✅ Seed executado com sucesso!${NC}"
echo ""
echo -e "${GREEN}📋 Credenciais de teste:${NC}"
echo "   • ceo@alpha.com / alpha123"
echo "   • diretoria@beta.com / beta123"
echo "   • superadmin@agilepm.com / superadmin123"

