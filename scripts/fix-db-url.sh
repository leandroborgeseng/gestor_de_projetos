#!/bin/bash

# Script para corrigir DATABASE_URL no .env.production e no container
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
    elif command -v node &> /dev/null; then
        ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('$POSTGRES_PASSWORD'))")
    else
        echo -e "${RED}❌ Python ou Node não encontrado. Não é possível codificar a senha.${NC}"
        echo -e "${YELLOW}💡 Instale Python ou Node, ou codifique a senha manualmente${NC}"
        exit 1
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
    
    # Atualizar variável no container da API
    echo ""
    echo -e "${YELLOW}Atualizando DATABASE_URL no container da API...${NC}"
    
    # Parar e remover container
    docker stop agilepm-api 2>/dev/null || true
    docker rm agilepm-api 2>/dev/null || true
    
    # Reiniciar com nova variável
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d api
    
    # Verificar se a variável foi aplicada corretamente
    sleep 3
    echo ""
    echo -e "${BLUE}Verificando DATABASE_URL no container...${NC}"
    CONTAINER_DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")
    if [ -n "$CONTAINER_DB_URL" ]; then
        MASKED=$(echo "$CONTAINER_DB_URL" | sed 's/:[^@]*@/:***@/')
        echo -e "${GREEN}✓ DATABASE_URL no container: $MASKED${NC}"
    else
        echo -e "${RED}❌ DATABASE_URL não encontrada no container${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ DATABASE_URL corrigida!${NC}"
    echo ""
    echo "Aguardando API iniciar..."
    sleep 5
    echo ""
    echo "Agora execute:"
    echo "  ./scripts/run-migrations.sh"
    echo "  ./scripts/run-seed.sh"
else
    echo -e "${RED}❌ POSTGRES_USER, POSTGRES_PASSWORD ou POSTGRES_DB não estão definidos${NC}"
    exit 1
fi

