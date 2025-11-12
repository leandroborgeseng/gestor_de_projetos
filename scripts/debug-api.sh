#!/bin/bash

# Script para debugar problemas da API
# Uso: ./scripts/debug-api.sh

echo "🔍 Diagnosticando problemas da API..."
echo ""

cd /opt/apps/agilepm || exit 1

# 1. Verificar containers
echo "1. Status dos containers:"
docker ps -a | grep agilepm || echo "Nenhum container encontrado"
echo ""

# 2. Verificar se a API está rodando
echo "2. Verificando container da API:"
if docker ps | grep -q agilepm-api; then
    echo "✅ Container da API está rodando"
    echo ""
    echo "3. Verificando logs da API (últimas 50 linhas):"
    docker logs agilepm-api --tail 50
    echo ""
    echo "4. Verificando se a API está escutando na porta 4000 dentro do container:"
    docker exec agilepm-api netstat -tlnp 2>/dev/null | grep 4000 || docker exec agilepm-api ss -tlnp 2>/dev/null | grep 4000 || echo "Não foi possível verificar portas"
    echo ""
    echo "5. Testando conexão interna no container:"
    docker exec agilepm-api wget -qO- http://localhost:4000/health 2>&1 || docker exec agilepm-api curl http://localhost:4000/health 2>&1 || echo "API não responde internamente"
    echo ""
    echo "6. Verificando variáveis de ambiente:"
    docker exec agilepm-api env | grep -E "PORT|DATABASE_URL|NODE_ENV" | head -10
    echo ""
    echo "7. Verificando se node_modules existe:"
    docker exec agilepm-api ls -la /app/node_modules 2>&1 | head -5 || echo "node_modules não encontrado"
    echo ""
    echo "8. Verificando se dist/index.js existe:"
    docker exec agilepm-api ls -la /app/dist/index.js 2>&1 || echo "dist/index.js não encontrado"
    echo ""
    echo "9. Tentando executar o arquivo diretamente:"
    docker exec agilepm-api node /app/dist/index.js 2>&1 | head -20 || echo "Erro ao executar"
else
    echo "❌ Container da API NÃO está rodando"
    echo ""
    echo "3. Verificando logs do container parado:"
    docker logs agilepm-api --tail 50 2>&1 || echo "Container não existe"
    echo ""
    echo "4. Tentando iniciar o container:"
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
    echo ""
    echo "Aguardando 10 segundos..."
    sleep 10
    echo ""
    echo "5. Verificando logs após iniciar:"
    docker logs agilepm-api --tail 30
fi

echo ""
echo "10. Verificando mapeamento de portas:"
docker port agilepm-api 2>&1 || echo "Não foi possível verificar portas"

echo ""
echo "11. Verificando se algo está usando a porta 4000:"
sudo lsof -i :4000 2>/dev/null || sudo netstat -tlnp 2>/dev/null | grep :4000 || echo "Porta 4000 não está em uso"

echo ""
echo "12. Verificando arquivo .env.production:"
if [ -f .env.production ]; then
    grep -E "API_PORT|PORT" .env.production | grep -v "^#" || echo "Variáveis de porta não encontradas"
else
    echo "❌ Arquivo .env.production não encontrado"
fi

