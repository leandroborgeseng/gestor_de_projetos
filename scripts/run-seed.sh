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

# Verificar onde está o seed
echo -e "${YELLOW}Verificando localização do seed...${NC}"
SEED_PATH=$(docker exec agilepm-api sh -c "ls -la /app/prisma/seed.ts 2>/dev/null && echo '/app/prisma/seed.ts' || ls -la /app/apps/api/prisma/seed.ts 2>/dev/null && echo '/app/apps/api/prisma/seed.ts' || echo ''")

if [ -z "$SEED_PATH" ]; then
    echo -e "${RED}❌ Seed não encontrado!${NC}"
    echo -e "${YELLOW}📋 Verificando estrutura do container...${NC}"
    docker exec agilepm-api sh -c "ls -la /app/prisma/ 2>/dev/null | head -10"
    docker exec agilepm-api sh -c "find /app -name seed.ts 2>/dev/null | head -5"
    exit 1
fi

echo -e "${GREEN}✓ Seed encontrado em: $SEED_PATH${NC}"

# Executar seed usando o caminho correto
if [ "$SEED_PATH" = "/app/prisma/seed.ts" ]; then
    # Seed está em /app/prisma, executar de lá
    docker exec agilepm-api sh -c "cd /app && prisma db seed --schema=prisma/schema.prisma" || \
    docker exec agilepm-api sh -c "cd /app && npx prisma db seed --schema=prisma/schema.prisma" || \
    docker exec agilepm-api sh -c "cd /app && node --loader tsx/esm prisma/seed.ts" || {
        echo -e "${RED}❌ Erro ao executar seed${NC}"
        echo -e "${YELLOW}💡 Tentando com tsx diretamente...${NC}"
        docker exec agilepm-api sh -c "cd /app && npx tsx prisma/seed.ts" || {
            echo -e "${RED}❌ Falha ao executar seed${NC}"
            exit 1
        }
    }
else
    docker exec agilepm-api sh -c "cd /app/apps/api && prisma db seed" || \
    docker exec agilepm-api sh -c "cd /app/apps/api && npx prisma db seed" || {
        echo -e "${RED}❌ Erro ao executar seed${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Seed executado com sucesso!${NC}"
echo ""
echo -e "${GREEN}📋 Credenciais de teste:${NC}"
echo "   • ceo@alpha.com / alpha123"
echo "   • diretoria@beta.com / beta123"
echo "   • superadmin@agilepm.com / superadmin123"

