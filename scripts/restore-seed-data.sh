#!/bin/bash

# Script para restaurar dados do seed
# Uso: ./scripts/restore-seed-data.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🌱 Restaurando dados do seed${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se o container da API está rodando
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    echo -e "${YELLOW}💡 Tentando iniciar containers...${NC}"
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    sleep 10
    if ! docker ps | grep -q agilepm-api; then
        echo -e "${RED}❌ Falha ao iniciar containers${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}1️⃣ Executando seed do banco de dados...${NC}"

# Obter DATABASE_URL
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Executar seed
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' tsx prisma/seed.ts"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Seed executado com sucesso!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📝 Agora execute o script para garantir que o superadmin tenha acesso:"
    echo "   ./scripts/fix-superadmin-login.sh"
else
    echo ""
    echo -e "${RED}❌ Falha ao executar seed${NC}"
    exit 1
fi

