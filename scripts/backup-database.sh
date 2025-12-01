#!/bin/bash

# Script para fazer backup do banco de dados
# Uso: ./scripts/backup-database.sh [nome-do-backup]

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_NAME="${1:-backup-$(date +%Y%m%d-%H%M%S)}"
BACKUP_DIR="./backups"
BACKUP_FILE="${BACKUP_DIR}/${BACKUP_NAME}.sql"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}💾 Fazendo backup do banco de dados${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se o container do banco está rodando
if ! docker ps | grep -q agilepm-db; then
    echo -e "${RED}❌ Container do banco de dados não está rodando${NC}"
    exit 1
fi

# Criar diretório de backups se não existir
mkdir -p "$BACKUP_DIR"

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

echo -e "${YELLOW}📦 Fazendo backup do banco: ${DB_NAME}${NC}"
echo -e "${YELLOW}📁 Arquivo: ${BACKUP_FILE}${NC}"
echo ""

# Fazer backup usando pg_dump dentro do container
docker exec agilepm-db pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    # Comprimir o backup
    echo -e "${YELLOW}🗜️  Comprimindo backup...${NC}"
    gzip -f "$BACKUP_FILE"
    BACKUP_FILE="${BACKUP_FILE}.gz"
    
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ Backup criado com sucesso!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "📁 Arquivo: ${BACKUP_FILE}"
    echo "📊 Tamanho: ${BACKUP_SIZE}"
    echo ""
    echo "💡 Para restaurar este backup, execute:"
    echo "   ./scripts/restore-database.sh ${BACKUP_NAME}"
else
    echo ""
    echo -e "${RED}❌ Erro ao criar backup${NC}"
    exit 1
fi

