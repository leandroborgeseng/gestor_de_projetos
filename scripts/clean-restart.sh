#!/bin/bash

# Script para limpar e reiniciar todos os containers
# Uso: ./scripts/clean-restart.sh

set -e

echo "🧹 Limpando e reiniciando containers..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parar e remover todos os containers
echo -e "${YELLOW}📦 Parando containers...${NC}"
docker stop agilepm-web agilepm-api agilepm-db 2>/dev/null || true

echo -e "${YELLOW}🗑️  Removendo containers...${NC}"
docker rm agilepm-web agilepm-api agilepm-db 2>/dev/null || true

# Tentar docker-compose down (pode falhar, não importa)
echo -e "${YELLOW}🧹 Limpando com docker-compose...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production down 2>/dev/null || true

# Iniciar containers
echo -e "${YELLOW}🚀 Iniciando containers...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

echo ""
echo -e "${GREEN}✅ Containers reiniciados!${NC}"
echo ""
echo "Verificar status:"
echo "  docker ps"
echo ""
echo "Ver logs:"
echo "  docker logs agilepm-api -f"
echo "  docker logs agilepm-web -f"

