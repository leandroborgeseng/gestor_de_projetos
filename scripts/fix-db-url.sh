#!/bin/bash

# Script para corrigir DATABASE_URL no .env.production
# Uso: ./scripts/fix-db-url.sh

set -e

echo "🔧 Corrigindo DATABASE_URL..."
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

# Carregar variáveis
source .env.production

# Verificar se tem variáveis individuais
if [ -n "$POSTGRES_USER" ] && [ -n "$POSTGRES_PASSWORD" ] && [ -n "$POSTGRES_DB" ]; then
    echo -e "${BLUE}Construindo DATABASE_URL a partir das variáveis individuais...${NC}"
    
    # Codificar senha (escapar caracteres especiais)
    if command -v python3 &> /dev/null; then
        ENCODED_PASSWORD=$(echo -n "$POSTGRES_PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))")
    else
        # Fallback: usar node se python não estiver disponível
        ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('$POSTGRES_PASSWORD'))")
    fi
    
    NEW_DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@db:5432/${POSTGRES_DB}"
    
    # Atualizar .env.production
    if grep -q "^DATABASE_URL=" .env.production; then
        # Substituir linha existente
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_DATABASE_URL|" .env.production
    else
        # Adicionar nova linha
        echo "DATABASE_URL=$NEW_DATABASE_URL" >> .env.production
    fi
    
    echo -e "${GREEN}✓ DATABASE_URL atualizada no .env.production${NC}"
    echo -e "${GREEN}✓ Formato: postgresql://${POSTGRES_USER}:***@db:5432/${POSTGRES_DB}${NC}"
    
    # Reiniciar container da API para pegar nova variável
    echo ""
    echo -e "${YELLOW}Reiniciando container da API...${NC}"
    docker restart agilepm-api 2>/dev/null || echo "Container não está rodando"
    
    echo ""
    echo -e "${GREEN}✅ DATABASE_URL corrigida!${NC}"
    echo ""
    echo "Agora execute:"
    echo "  ./scripts/run-migrations.sh"
    echo "  ./scripts/run-seed.sh"
else
    echo -e "${RED}❌ POSTGRES_USER, POSTGRES_PASSWORD ou POSTGRES_DB não estão definidos${NC}"
    exit 1
fi

