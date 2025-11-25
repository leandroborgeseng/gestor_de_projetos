#!/bin/bash

# Script para verificar e corrigir conflito de porta 80
# Uso: ./scripts/fix-port-80.sh

set -e

echo "🔍 Verificando conflito de porta 80..."
echo ""

# Verificar se há containers usando porta 80
echo "📋 Containers Docker usando porta 80:"
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":80" || echo "Nenhum container encontrado"

echo ""
echo "📋 Processos do sistema usando porta 80:"
if command -v lsof &> /dev/null; then
    lsof -i :80 2>/dev/null || echo "Nenhum processo encontrado"
else
    echo "lsof não está instalado, pulando verificação de processos"
fi

echo ""
echo "💡 Soluções:"
echo ""
echo "1. Parar containers antigos:"
echo "   docker stop \$(docker ps -q --filter 'publish=80')"
echo ""
echo "2. Verificar .env.production:"
echo "   grep WEB_PORT .env.production"
echo "   Se estiver definido como 80, altere para 8080:"
echo "   sed -i 's/WEB_PORT=80/WEB_PORT=8080/' .env.production"
echo ""
echo "3. Ou definir WEB_PORT=8080 antes do deploy:"
echo "   export WEB_PORT=8080"
echo "   ./scripts/deploy.sh"

