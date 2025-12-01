#!/bin/bash

# Script para desabilitar rate limiting
# Uso: ./scripts/disable-rate-limit.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔓 Desabilitando Rate Limiting${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

# Adicionar ou atualizar DISABLE_RATE_LIMIT
if grep -q "^DISABLE_RATE_LIMIT=" .env.production; then
    sed -i "s|^DISABLE_RATE_LIMIT=.*|DISABLE_RATE_LIMIT=true|" .env.production
    echo -e "${GREEN}✓ DISABLE_RATE_LIMIT atualizado para true${NC}"
else
    echo "DISABLE_RATE_LIMIT=true" >> .env.production
    echo -e "${GREEN}✓ DISABLE_RATE_LIMIT adicionado como true${NC}"
fi

echo ""
echo -e "${YELLOW}🔄 Reiniciando container da API...${NC}"
docker restart agilepm-api

echo ""
echo -e "${GREEN}✅ Rate limiting desabilitado!${NC}"
echo ""
echo "O container da API foi reiniciado com rate limiting desabilitado."
echo "Para reabilitar, edite .env.production e mude DISABLE_RATE_LIMIT=false"

