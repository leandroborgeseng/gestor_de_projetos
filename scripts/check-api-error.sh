#!/bin/bash

# Script para verificar erros da API
# Uso: ./scripts/check-api-error.sh

echo "🔍 Verificando erros da API..."
echo ""

# Ver status do container
echo "📊 Status do container:"
docker ps -a | grep agilepm-api
echo ""

# Ver últimos logs
echo "📋 Últimos 100 logs da API:"
docker logs agilepm-api --tail 100 2>&1
echo ""

# Verificar se o arquivo dist/index.js existe
echo "📁 Verificando arquivos no container:"
docker exec agilepm-api ls -la /app/dist/ 2>&1 || echo "Container não está acessível"
echo ""

# Verificar node_modules
echo "📦 Verificando node_modules:"
docker exec agilepm-api ls -la /app/node_modules/express 2>&1 | head -5 || echo "express não encontrado"
docker exec agilepm-api ls -la /app/node_modules/@prisma/client 2>&1 | head -5 || echo "@prisma/client não encontrado"
echo ""

# Verificar variáveis de ambiente
echo "🔐 Verificando variáveis de ambiente críticas:"
docker exec agilepm-api sh -c 'echo "DATABASE_URL: ${DATABASE_URL:0:50}..."' 2>&1 || echo "Não foi possível verificar"
docker exec agilepm-api sh -c 'echo "JWT_SECRET: ${JWT_SECRET:+definido}"' 2>&1 || echo "Não foi possível verificar"
echo ""

echo "✅ Verificação concluída!"

