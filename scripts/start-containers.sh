#!/bin/bash

# Script para iniciar containers corretamente
# Uso: ./scripts/start-containers.sh

set -e

echo "🚀 Iniciando containers..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

# Parar e remover containers antigos
echo -e "${YELLOW}📦 Limpando containers antigos...${NC}"
docker stop agilepm-api agilepm-web agilepm-db 2>/dev/null || true
docker rm agilepm-api agilepm-web agilepm-db 2>/dev/null || true

# Iniciar banco primeiro
echo -e "${YELLOW}🗄️  Iniciando banco de dados...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d db

# Aguardar banco estar pronto
echo -e "${YELLOW}⏳ Aguardando banco estar pronto...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker exec agilepm-db pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Banco está pronto${NC}"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Timeout aguardando banco${NC}"
    exit 1
  fi
  echo -e "${YELLOW}  Aguardando... ($RETRY_COUNT/$MAX_RETRIES)${NC}"
  sleep 2
done

# Iniciar API
echo -e "${YELLOW}🔧 Iniciando API...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d api

# Aguardar API iniciar
sleep 5

# Iniciar Web
echo -e "${YELLOW}🌐 Iniciando Frontend...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d web

echo ""
echo -e "${GREEN}✅ Containers iniciados!${NC}"
echo ""
echo "Verificar status:"
echo "  docker ps | grep agilepm"

