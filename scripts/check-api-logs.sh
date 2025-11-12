#!/bin/bash

# Script rápido para verificar logs da API
# Uso: ./scripts/check-api-logs.sh

echo "📋 Últimos logs da API:"
echo "===================="
docker logs agilepm-api --tail 100

echo ""
echo ""
echo "📊 Status do container:"
docker ps -a | grep agilepm-api

echo ""
echo ""
echo "🔍 Tentando entrar no container (aguardando ele estar estável)..."
sleep 5
docker exec agilepm-api sh -c "ls -la /app/node_modules/express 2>&1 || echo 'express não encontrado'" 2>&1 || echo "Container não está acessível"

