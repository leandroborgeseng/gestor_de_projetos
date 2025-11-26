#!/bin/bash

# Script para verificar DATABASE_URL no container
# Uso: ./scripts/check-db-url.sh

set -e

echo "🔍 Verificando DATABASE_URL no container..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar DATABASE_URL no container
echo -e "${BLUE}DATABASE_URL no container da API:${NC}"
DB_URL=$(docker exec agilepm-api sh -c 'echo $DATABASE_URL' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
else
    # Mostrar URL mascarada (esconder senha)
    MASKED_URL=$(echo "$DB_URL" | sed 's/:[^@]*@/:***@/')
    echo -e "${GREEN}✓ DATABASE_URL: $MASKED_URL${NC}"
    
    # Verificar se tem caracteres problemáticos
    if echo "$DB_URL" | grep -qE "[@#\$%&*()+=<>?/\\|]"; then
        echo -e "${YELLOW}⚠️  URL pode conter caracteres especiais não codificados${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Variáveis do .env.production:${NC}"
if [ -f .env.production ]; then
    source .env.production
    echo "POSTGRES_USER: ${POSTGRES_USER:-não definido}"
    echo "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:+*** (definida)}"
    echo "POSTGRES_DB: ${POSTGRES_DB:-não definido}"
    
    if [ -n "$POSTGRES_PASSWORD" ]; then
        echo ""
        echo -e "${YELLOW}Codificando senha para URL...${NC}"
        if command -v python3 &> /dev/null; then
            ENCODED=$(echo -n "$POSTGRES_PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))")
            echo "Senha original: $POSTGRES_PASSWORD"
            echo "Senha codificada: $ENCODED"
            echo ""
            echo -e "${GREEN}DATABASE_URL correta seria:${NC}"
            echo "postgresql://${POSTGRES_USER:-postgres}:${ENCODED}@db:5432/${POSTGRES_DB:-agilepm}"
        else
            echo -e "${YELLOW}Python não encontrado, não é possível codificar${NC}"
        fi
    fi
else
    echo -e "${RED}❌ Arquivo .env.production não encontrado${NC}"
fi
