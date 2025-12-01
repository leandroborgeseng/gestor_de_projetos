#!/bin/bash

# Script para reabilitar rate limiting
# Uso: ./scripts/enable-rate-limit.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔒 Reabilitando Rate Limiting${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

# Atualizar DISABLE_RATE_LIMIT para false
if grep -q "^DISABLE_RATE_LIMIT=" .env.production; then
    sed -i "s|^DISABLE_RATE_LIMIT=.*|DISABLE_RATE_LIMIT=false|" .env.production
    echo -e "${GREEN}✓ DISABLE_RATE_LIMIT atualizado para false${NC}"
else
    echo "DISABLE_RATE_LIMIT=false" >> .env.production
    echo -e "${GREEN}✓ DISABLE_RATE_LIMIT adicionado como false${NC}"
fi

echo ""
echo -e "${YELLOW}🔄 Reiniciando container da API...${NC}"
docker restart agilepm-api

echo ""
echo -e "${GREEN}✅ Rate limiting reabilitado!${NC}"
echo ""
echo "O container da API foi reiniciado com rate limiting reabilitado."
echo "Limites configurados:"
echo "  • Geral: 10000 requisições / 15 minutos"
echo "  • Autenticação: 20 tentativas / 15 minutos"
echo "  • Escrita: 500 requisições / 15 minutos"
echo "  • Busca: 200 requisições / minuto"
echo "  • Upload: 100 uploads / hora"
echo "  • Webhook: 200 requisições / minuto"

