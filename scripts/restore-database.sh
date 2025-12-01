#!/bin/bash

# Script para restaurar backup do banco de dados
# Uso: ./scripts/restore-database.sh [nome-do-backup]

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}❌ Nome do backup é obrigatório${NC}"
    echo ""
    echo "Uso: ./scripts/restore-database.sh [nome-do-backup]"
    echo ""
    echo "Backups disponíveis:"
    ls -1t ./backups/*.sql.gz 2>/dev/null | sed 's|./backups/||' | sed 's|.sql.gz||' | head -10 || echo "  (nenhum backup encontrado)"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql.gz"

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Backup não encontrado: ${BACKUP_FILE}${NC}"
    echo ""
    echo "Backups disponíveis:"
    ls -1t ./backups/*.sql.gz 2>/dev/null | sed 's|./backups/||' | sed 's|.sql.gz||' | head -10 || echo "  (nenhum backup encontrado)"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔄 Restaurando backup do banco de dados${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${RED}⚠️  ATENÇÃO: Esta operação vai SUBSTITUIR todos os dados atuais!${NC}"
echo ""
read -p "Tem certeza que deseja continuar? (digite 'sim' para confirmar): " CONFIRM

if [ "$CONFIRM" != "sim" ]; then
    echo -e "${YELLOW}❌ Operação cancelada${NC}"
    exit 0
fi

# Verificar se o container do banco está rodando
if ! docker ps | grep -q agilepm-db; then
    echo -e "${RED}❌ Container do banco de dados não está rodando${NC}"
    echo -e "${YELLOW}💡 Tentando iniciar containers...${NC}"
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d db
    sleep 5
    if ! docker ps | grep -q agilepm-db; then
        echo -e "${RED}❌ Falha ao iniciar container do banco${NC}"
        exit 1
    fi
fi

# Obter variáveis do .env.production
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado${NC}"
    exit 1
fi

source .env.production

DB_NAME="${POSTGRES_DB:-agilepm}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}❌ POSTGRES_PASSWORD não está definido no .env.production${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Restaurando backup: ${BACKUP_NAME}${NC}"
echo -e "${YELLOW}📁 Arquivo: ${BACKUP_FILE}${NC}"
echo ""

# Descomprimir temporariamente
TEMP_FILE="/tmp/restore-${BACKUP_NAME}.sql"
gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"

# Restaurar usando psql dentro do container
echo -e "${YELLOW}🔄 Restaurando dados...${NC}"
docker exec -i agilepm-db psql -U "$DB_USER" -d "$DB_NAME" < "$TEMP_FILE"

# Limpar arquivo temporário
rm -f "$TEMP_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Backup restaurado com sucesso!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "💡 Agora execute as migrations se necessário:"
    echo "   ./scripts/run-migrations.sh"
else
    echo ""
    echo -e "${RED}❌ Erro ao restaurar backup${NC}"
    exit 1
fi

