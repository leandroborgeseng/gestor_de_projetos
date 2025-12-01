#!/bin/bash

# Script para listar backups disponíveis
# Uso: ./scripts/list-backups.sh

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BACKUP_DIR="./backups"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Backups disponíveis${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A $BACKUP_DIR/*.sql.gz 2>/dev/null)" ]; then
    echo -e "${YELLOW}⚠️  Nenhum backup encontrado${NC}"
    echo ""
    echo "Para fazer um backup agora, execute:"
    echo "   ./scripts/backup-database.sh"
    exit 0
fi

echo "Backups encontrados:"
echo ""
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | awk '{print "  📦 " $9 " (" $5 ")"}' | sed "s|$BACKUP_DIR/||" | sed "s|.sql.gz||"
echo ""
echo "Para restaurar um backup, execute:"
echo "   ./scripts/restore-database.sh [nome-do-backup]"

