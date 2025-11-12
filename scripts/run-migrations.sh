#!/bin/bash

# Script para executar migrações do banco de dados
# Uso: ./scripts/run-migrations.sh

set -e

echo "📊 Executando migrações do banco de dados..."

# Verificar se o arquivo .env.production existe
if [ ! -f .env.production ]; then
    echo "❌ Arquivo .env.production não encontrado!"
    exit 1
fi

# Carregar variáveis do .env.production
source .env.production

# Verificar se o banco está pronto
echo "⏳ Verificando se o banco está pronto..."
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_isready -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
    echo "✓ Banco de dados está pronto"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "❌ Timeout aguardando banco de dados"
    exit 1
  fi
  
  echo "  Aguardando... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

# Executar migrações
echo "🚀 Executando migrações..."
docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma migrate deploy

echo "✅ Migrações executadas com sucesso!"

