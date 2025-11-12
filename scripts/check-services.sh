#!/bin/bash

# Script para verificar status dos serviços
# Uso: ./scripts/check-services.sh

echo "🔍 Verificando status dos serviços..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar containers
echo -e "${BLUE}1. Status dos containers:${NC}"
docker ps -a | grep agilepm || echo "Nenhum container encontrado"

echo ""
echo -e "${BLUE}2. Verificando portas em uso:${NC}"
echo "Porta 4000 (API):"
sudo lsof -i :4000 2>/dev/null || netstat -tlnp 2>/dev/null | grep :4000 || echo "Porta 4000 não está em uso"

echo ""
echo "Porta 80 (Frontend):"
sudo lsof -i :80 2>/dev/null || netstat -tlnp 2>/dev/null | grep :80 || echo "Porta 80 não está em uso"

echo ""
echo "Porta 5432 (PostgreSQL):"
sudo lsof -i :5432 2>/dev/null || netstat -tlnp 2>/dev/null | grep :5432 || echo "Porta 5432 não está em uso"

echo ""
echo -e "${BLUE}3. Logs da API (últimas 20 linhas):${NC}"
docker logs agilepm-api --tail 20 2>&1 || echo "Container da API não encontrado"

echo ""
echo -e "${BLUE}4. Logs do Frontend (últimas 20 linhas):${NC}"
docker logs agilepm-web --tail 20 2>&1 || echo "Container do Frontend não encontrado"

echo ""
echo -e "${BLUE}5. Verificando variáveis de ambiente:${NC}"
if [ -f .env.production ]; then
    echo "✓ .env.production existe"
    grep -E "API_PORT|WEB_PORT|POSTGRES_PORT" .env.production | grep -v "^#" || echo "Variáveis de porta não encontradas"
else
    echo -e "${RED}❌ .env.production não encontrado${NC}"
fi

echo ""
echo -e "${BLUE}6. Tentando conectar nos containers:${NC}"
if docker ps | grep -q agilepm-api; then
    echo -e "${GREEN}✓ Container da API está rodando${NC}"
    echo "Testando conexão interna no container:"
    docker exec agilepm-api wget -qO- http://localhost:4000/health 2>&1 || echo "API não responde internamente"
else
    echo -e "${RED}❌ Container da API não está rodando${NC}"
fi

if docker ps | grep -q agilepm-web; then
    echo -e "${GREEN}✓ Container do Frontend está rodando${NC}"
else
    echo -e "${RED}❌ Container do Frontend não está rodando${NC}"
fi

echo ""
echo -e "${YELLOW}💡 Para iniciar os serviços:${NC}"
echo "  ./scripts/deploy.sh"
echo ""
echo -e "${YELLOW}💡 Para ver logs em tempo real:${NC}"
echo "  docker compose -f docker-compose.prod.yml --env-file .env.production logs -f"

