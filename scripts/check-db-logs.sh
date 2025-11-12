#!/bin/bash

# Script para verificar logs do banco de dados
# Uso: ./scripts/check-db-logs.sh

echo "🔍 Verificando logs do container do banco de dados..."
echo ""

docker logs agilepm-db --tail 50

echo ""
echo "📊 Status dos containers:"
docker ps -a | grep agilepm

echo ""
echo "💡 Se o container estiver reiniciando, pode ser:"
echo "  1. Problema com variáveis de ambiente (POSTGRES_PASSWORD vazio)"
echo "  2. Problema com permissões do volume"
echo "  3. Dados corrompidos no volume"
echo ""
echo "Para resolver:"
echo "  1. Verificar .env.production tem POSTGRES_PASSWORD definido"
echo "  2. Parar containers: docker compose -f docker-compose.prod.yml --env-file .env.production down"
echo "  3. Remover volume (CUIDADO - apaga dados): docker volume rm agilepm_postgres_data"
echo "  4. Tentar deploy novamente"

