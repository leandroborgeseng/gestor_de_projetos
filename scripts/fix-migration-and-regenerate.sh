#!/bin/bash

# Script para executar migrations e regenerar Prisma Client
# Uso: ./scripts/fix-migration-and-regenerate.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Executando migrations e regenerando Prisma Client${NC}"
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

# Obter DATABASE_URL
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

echo -e "${YELLOW}1️⃣ Executando migrations...${NC}"

# Executar migrations
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma" || \
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' prisma migrate deploy --schema=apps/api/prisma/schema.prisma" || {
    echo -e "${RED}❌ Erro ao executar migrations${NC}"
    exit 1
}

echo -e "${GREEN}✅ Migrations executadas!${NC}"
echo ""

echo -e "${YELLOW}2️⃣ Regenerando Prisma Client...${NC}"

# Regenerar Prisma Client
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma generate --schema=apps/api/prisma/schema.prisma" || \
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' prisma generate --schema=apps/api/prisma/schema.prisma" || {
    echo -e "${RED}❌ Erro ao regenerar Prisma Client${NC}"
    exit 1
}

echo -e "${GREEN}✅ Prisma Client regenerado!${NC}"
echo ""

echo -e "${YELLOW}3️⃣ Reiniciando container da API...${NC}"

# Reiniciar container para carregar novo Prisma Client
docker restart agilepm-api

echo -e "${GREEN}✅ Container reiniciado!${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Tudo pronto! Agora você pode criar projetos.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

