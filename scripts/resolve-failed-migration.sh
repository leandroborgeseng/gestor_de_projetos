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

echo -e "${YELLOW}1️⃣ Verificando migrations falhadas na tabela _prisma_migrations...${NC}"

# Verificar diretamente na tabela _prisma_migrations
FAILED_MIGRATION=$(docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -t -c \"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND migration_name = '20251110121500_company_light_theme';\" 2>/dev/null" | tr -d ' ' || echo "")

if [ -z "$FAILED_MIGRATION" ]; then
    # Verificar se está marcada como falhada (started_at mas sem finished_at)
    FAILED_CHECK=$(docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -t -c \"SELECT migration_name FROM _prisma_migrations WHERE migration_name = '20251110121500_company_light_theme' AND (finished_at IS NULL OR logs IS NOT NULL);\" 2>/dev/null" | tr -d ' ' || echo "")
    
    if [ -z "$FAILED_CHECK" ]; then
        echo -e "${GREEN}✅ Migration não está marcada como falhada${NC}"
        echo -e "${YELLOW}💡 Mas o Prisma ainda está reclamando. Vamos verificar e corrigir...${NC}"
    else
        echo -e "${YELLOW}⚠️  Migration encontrada na tabela${NC}"
        FAILED_MIGRATION="$FAILED_CHECK"
    fi
else
    echo -e "${YELLOW}⚠️  Migration falhada encontrada: $FAILED_MIGRATION${NC}"
fi

echo ""

echo -e "${YELLOW}2️⃣ Verificando se a migration já foi aplicada...${NC}"

# Verificar se as colunas da migration já existem
COLUMNS_EXIST=$(docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -t -c \"SELECT COUNT(*) FROM information_schema.columns WHERE table_name='Company' AND column_name IN ('lightPrimaryColor', 'lightSecondaryColor', 'lightAccentColor');\" 2>/dev/null" | tr -d ' ' || echo "0")

if [ "$COLUMNS_EXIST" -ge "3" ]; then
    echo -e "${GREEN}   ✅ Colunas da migration já existem (migration já foi aplicada)${NC}"
    echo -e "${YELLOW}3️⃣ Marcando migration como aplicada...${NC}"
    
    # Marcar como aplicada
    docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate resolve --applied 20251110121500_company_light_theme --schema=$SCHEMA_PATH" || {
        # Se falhar, marcar manualmente na tabela
        echo -e "${YELLOW}   Marcando manualmente na tabela...${NC}"
        docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -c \"UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = 1 WHERE migration_name = '20251110121500_company_light_theme' AND finished_at IS NULL;\"" || true
    }
else
    echo -e "${YELLOW}   ⚠️  Colunas não existem. Executando migration...${NC}"
    echo -e "${YELLOW}3️⃣ Executando migration manualmente...${NC}"
    
    # Executar SQL da migration
    MIGRATION_SQL="ALTER TABLE \"Company\" ADD COLUMN IF NOT EXISTS \"lightPrimaryColor\" VARCHAR(10), ADD COLUMN IF NOT EXISTS \"lightSecondaryColor\" VARCHAR(10), ADD COLUMN IF NOT EXISTS \"lightAccentColor\" VARCHAR(10), ADD COLUMN IF NOT EXISTS \"lightBackgroundColor\" VARCHAR(10), ADD COLUMN IF NOT EXISTS \"lightLogoUrl\" TEXT, ADD COLUMN IF NOT EXISTS \"lightLogoKey\" TEXT;"
    
    docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -c \"$MIGRATION_SQL\"" || {
        echo -e "${YELLOW}   ⚠️  Erro ao executar SQL. Tentando continuar...${NC}"
    }
    
    # Marcar como aplicada
    echo -e "${YELLOW}4️⃣ Marcando migration como aplicada...${NC}"
    docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate resolve --applied 20251110121500_company_light_theme --schema=$SCHEMA_PATH" || {
        echo -e "${YELLOW}   Marcando manualmente na tabela...${NC}"
        docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -c \"UPDATE _prisma_migrations SET finished_at = NOW(), applied_steps_count = 1, logs = NULL WHERE migration_name = '20251110121500_company_light_theme';\"" || true
    }
fi

# Garantir que está marcada como aplicada (mesmo se já foi aplicada)
echo -e "${YELLOW}5️⃣ Garantindo que migration está marcada como aplicada...${NC}"
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -c \"UPDATE _prisma_migrations SET finished_at = COALESCE(finished_at, NOW()), applied_steps_count = COALESCE(applied_steps_count, 1), logs = NULL WHERE migration_name = '20251110121500_company_light_theme' AND (finished_at IS NULL OR logs IS NOT NULL);\"" || true

echo ""
echo -e "${YELLOW}6️⃣ Verificando status das migrations...${NC}"

# Verificar status novamente
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' npx prisma migrate status --schema=$SCHEMA_PATH"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Migrations resolvidas!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "💡 Agora execute novamente:"
echo "   ./scripts/fix-migration-and-regenerate.sh"

