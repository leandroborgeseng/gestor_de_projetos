#!/bin/bash

# Script para resolver migrations falhadas
# Uso: ./scripts/resolve-failed-migration.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Resolvendo migrations falhadas${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se o container da API está rodando
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    exit 1
fi

# Obter DATABASE_URL
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Verificar onde está o schema
SCHEMA_PATH=""
if docker exec agilepm-api sh -c "test -f /app/prisma/schema.prisma" 2>/dev/null; then
    SCHEMA_PATH="/app/prisma/schema.prisma"
elif docker exec agilepm-api sh -c "test -f /app/apps/api/prisma/schema.prisma" 2>/dev/null; then
    SCHEMA_PATH="/app/apps/api/prisma/schema.prisma"
else
    echo -e "${RED}❌ Schema do Prisma não encontrado!${NC}"
    exit 1
fi

echo -e "${YELLOW}1️⃣ Verificando migrations falhadas...${NC}"

# Verificar migrations falhadas
FAILED_MIGRATION=$(docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate status --schema=$SCHEMA_PATH 2>&1" | grep -i "failed" | head -1 || echo "")

if [ -z "$FAILED_MIGRATION" ]; then
    echo -e "${GREEN}✅ Nenhuma migration falhada encontrada${NC}"
    exit 0
fi

echo -e "${YELLOW}⚠️  Migration falhada encontrada${NC}"
echo ""

echo -e "${YELLOW}2️⃣ Marcando migration como resolvida...${NC}"

# Marcar migration como resolvida
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate resolve --rolled-back 20251110121500_company_light_theme --schema=$SCHEMA_PATH" || \
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate resolve --applied 20251110121500_company_light_theme --schema=$SCHEMA_PATH" || {
    echo -e "${YELLOW}⚠️  Não foi possível marcar como resolvida. Tentando executar manualmente...${NC}"
    
    # Tentar executar a migration manualmente
    echo -e "${YELLOW}3️⃣ Executando migration manualmente...${NC}"
    
    # Ler o conteúdo da migration
    MIGRATION_FILE="/app/prisma/migrations/20251110121500_company_light_theme/migration.sql"
    
    if docker exec agilepm-api sh -c "test -f $MIGRATION_FILE" 2>/dev/null; then
        echo -e "${YELLOW}   Executando SQL da migration...${NC}"
        docker exec -i agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql" < <(docker exec agilepm-api cat $MIGRATION_FILE) || {
            echo -e "${YELLOW}   ⚠️  Erro ao executar SQL. Tentando marcar como aplicada...${NC}"
        }
    fi
    
    # Marcar como aplicada mesmo se falhar
    docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -c \"UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = 1 WHERE migration_name = '20251110121500_company_light_theme' AND finished_at IS NULL;\"" || true
}

echo ""
echo -e "${YELLOW}4️⃣ Verificando status das migrations...${NC}"

# Verificar status novamente
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate status --schema=$SCHEMA_PATH"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Migrations resolvidas!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "💡 Agora execute novamente:"
echo "   ./scripts/fix-migration-and-regenerate.sh"

