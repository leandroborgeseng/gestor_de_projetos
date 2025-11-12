#!/bin/bash

# Script para testar a API após o build
# Uso: ./scripts/test-api.sh

echo "🧪 Testando API..."
echo ""

cd /opt/apps/agilepm || exit 1

# 1. Verificar status dos containers
echo "1. Status dos containers:"
docker ps | grep agilepm
echo ""

# 2. Verificar se a API está rodando
if docker ps | grep -q agilepm-api; then
    echo "✅ Container da API está rodando"
    echo ""
    
    # 3. Ver logs recentes
    echo "2. Últimos logs da API:"
    docker logs agilepm-api --tail 30
    echo ""
    
    # 4. Aguardar alguns segundos para garantir que iniciou
    echo "3. Aguardando API iniciar completamente..."
    sleep 5
    echo ""
    
    # 5. Testar health check
    echo "4. Testando health check:"
    curl -f http://localhost:4000/health && echo "" && echo "✅ Health check OK!" || echo "❌ Health check falhou"
    echo ""
    
    # 6. Testar login
    echo "5. Testando login:"
    curl -X POST http://localhost:4000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"superadmin@agilepm.com","password":"superadmin123"}' \
      -w "\nHTTP Status: %{http_code}\n" || echo "❌ Login falhou"
    echo ""
    
    # 7. Verificar portas
    echo "6. Verificando portas:"
    docker port agilepm-api
    echo ""
    
else
    echo "❌ Container da API NÃO está rodando"
    echo ""
    echo "Verificando logs do container parado:"
    docker logs agilepm-api --tail 50
    echo ""
    echo "Tentando iniciar o container:"
    docker compose -f docker-compose.prod.yml --env-file .env.production up -d api
    echo ""
    echo "Aguardando 10 segundos..."
    sleep 10
    echo ""
    echo "Verificando logs após iniciar:"
    docker logs agilepm-api --tail 30
fi

echo ""
echo "✅ Teste concluído!"

