#!/bin/bash

# Script para verificar status completo da aplicação
# Uso: ./scripts/check-status.sh

echo "🔍 Verificando status da aplicação..."
echo ""

cd /opt/apps/agilepm || exit 1

# 1. Status dos containers
echo "1. Status dos containers:"
docker ps -a | grep agilepm
echo ""

# 2. Ver logs da API
echo "2. Últimos logs da API:"
docker logs agilepm-api --tail 30 2>&1 | tail -30
echo ""

# 3. Verificar se API está respondendo
echo "3. Testando API:"
curl -f http://localhost:4000/health 2>&1 && echo "" && echo "✅ API está respondendo!" || echo "❌ API não está respondendo"
echo ""

# 4. Verificar versões
echo "4. Versões:"
echo "Node.js no servidor: $(node -v 2>/dev/null || echo 'não encontrado')"
echo "npm no servidor: $(npm -v 2>/dev/null || echo 'não encontrado')"
echo "Node.js no container: $(docker exec agilepm-api node -v 2>&1 || echo 'container não acessível')"
echo ""

# 5. Verificar node_modules no container
echo "5. Verificando node_modules no container:"
docker exec agilepm-api sh -c "ls -la /app/node_modules | head -10" 2>&1 || echo "Container não acessível"
echo ""

echo "✅ Verificação concluída!"

