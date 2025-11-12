#!/bin/bash

# Script para corrigir problemas de build do Docker
# Uso: ./scripts/fix-docker-build.sh

echo "🔧 Corrigindo problemas de build do Docker..."
echo ""

cd /opt/apps/agilepm || exit 1

# 1. Parar containers
echo "1. Parando containers..."
docker compose -f docker-compose.prod.yml --env-file .env.production down

# 2. Limpar imagens antigas
echo ""
echo "2. Limpando imagens antigas..."
docker rmi agilepm-api agilepm-web 2>/dev/null || true
docker system prune -f

# 3. Rebuild sem cache
echo ""
echo "3. Fazendo rebuild sem cache..."
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache api

# 4. Verificar se o build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build concluído com sucesso!"
    echo ""
    echo "4. Iniciando containers..."
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d
    
    echo ""
    echo "5. Aguardando API iniciar..."
    sleep 10
    
    echo ""
    echo "6. Verificando logs da API..."
    docker logs agilepm-api --tail 30
    
    echo ""
    echo "7. Testando conexão..."
    curl -f http://localhost:4000/health && echo "" && echo "✅ API está respondendo!" || echo "❌ API não está respondendo"
else
    echo ""
    echo "❌ Build falhou. Verifique os logs acima."
    exit 1
fi

