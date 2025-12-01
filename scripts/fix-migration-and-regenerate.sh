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

echo -e "${YELLOW}1️⃣ Verificando localização do schema...${NC}"

# Verificar onde está o schema
SCHEMA_PATH=""
if docker exec agilepm-api sh -c "test -f /app/prisma/schema.prisma" 2>/dev/null; then
    SCHEMA_PATH="/app/prisma/schema.prisma"
elif docker exec agilepm-api sh -c "test -f /app/apps/api/prisma/schema.prisma" 2>/dev/null; then
    SCHEMA_PATH="/app/apps/api/prisma/schema.prisma"
else
    echo -e "${RED}❌ Schema do Prisma não encontrado!${NC}"
    echo -e "${YELLOW}📋 Verificando estrutura do container...${NC}"
    docker exec agilepm-api sh -c "find /app -name schema.prisma 2>/dev/null | head -5"
    exit 1
fi

echo -e "${GREEN}✅ Schema encontrado em: $SCHEMA_PATH${NC}"
echo ""

echo -e "${YELLOW}2️⃣ Executando migrations...${NC}"

# Executar migrations
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate deploy --schema=$SCHEMA_PATH" || \
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' prisma migrate deploy --schema=$SCHEMA_PATH" || {
    echo -e "${RED}❌ Erro ao executar migrations${NC}"
    exit 1
}

echo -e "${GREEN}✅ Migrations executadas!${NC}"
echo ""

echo -e "${YELLOW}3️⃣ Regenerando Prisma Client...${NC}"

# Regenerar Prisma Client no diretório do projeto
# O Prisma Client é gerado em node_modules/.prisma/client dentro do projeto
WORK_DIR="/app"
if docker exec agilepm-api sh -c "test -d /app/apps/api" 2>/dev/null; then
    WORK_DIR="/app/apps/api"
fi

docker exec agilepm-api sh -c "cd $WORK_DIR && DATABASE_URL='$DB_URL' npx prisma generate --schema=$SCHEMA_PATH" || \
docker exec agilepm-api sh -c "cd $WORK_DIR && DATABASE_URL='$DB_URL' node node_modules/.bin/prisma generate --schema=$SCHEMA_PATH" || {
    echo -e "${YELLOW}⚠️  Não foi possível regenerar Prisma Client manualmente${NC}"
    echo -e "${YELLOW}💡 O Prisma Client será regenerado no próximo build do Docker${NC}"
    echo -e "${YELLOW}💡 Fazendo rebuild do container...${NC}"
    
    # Reconstruir container como fallback
    docker-compose -f docker-compose.prod.yml --env-file .env.production build api
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d api
}

echo -e "${GREEN}✅ Prisma Client regenerado!${NC}"
echo ""

echo -e "${YELLOW}4️⃣ Reiniciando container da API...${NC}"

# Reiniciar container para carregar novo Prisma Client
docker restart agilepm-api

echo -e "${GREEN}✅ Container reiniciado!${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Tudo pronto! Agora você pode criar projetos.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

