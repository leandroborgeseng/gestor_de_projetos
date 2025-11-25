#!/bin/bash

# Script para reiniciar apenas o container web
# Uso: ./scripts/restart-web.sh

set -e

echo "🔄 Reiniciando container web..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parar e remover container web
echo -e "${YELLOW}📦 Parando e removendo container web...${NC}"
docker stop agilepm-web 2>/dev/null || true
docker rm agilepm-web 2>/dev/null || true

# Rebuild e iniciar
echo -e "${YELLOW}🔨 Rebuild e iniciando container web...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build web

echo ""
echo -e "${GREEN}✅ Container web reiniciado!${NC}"
echo ""
echo "Verificar logs:"
echo "  docker logs agilepm-web -f"

