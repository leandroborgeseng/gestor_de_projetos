#!/bin/bash

# Script de Backup do Banco de Dados
# Uso: ./scripts/backup.sh

set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Criar diretório de backups se não existir
mkdir -p $BACKUP_DIR

# Verificar se o arquivo .env.production existe
if [ ! -f .env.production ]; then
    echo "❌ Arquivo .env.production não encontrado!"
    exit 1
fi

echo "📦 Criando backup do banco de dados..."

# Criar backup
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_dump -U postgres agilepm > $BACKUP_FILE

# Comprimir backup
gzip $BACKUP_FILE
BACKUP_FILE="${BACKUP_FILE}.gz"

# Verificar se o backup foi criado
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✅ Backup criado com sucesso: $BACKUP_FILE ($SIZE)"
else
    echo "❌ Erro ao criar backup!"
    exit 1
fi

# Manter apenas últimos 7 backups
echo "🧹 Removendo backups antigos (mantendo últimos 7)..."
ls -t $BACKUP_DIR/*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f

echo "✅ Backup concluído!"

