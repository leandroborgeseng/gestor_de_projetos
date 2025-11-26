#!/bin/bash

# Script para verificar e corrigir DATABASE_URL
# Uso: ./scripts/check-db-url.sh

set -e

echo "🔍 Verificando DATABASE_URL..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Carregar variáveis do .env.production
if [ -f .env.production ]; then
    source .env.production
    echo -e "${BLUE}Variáveis carregadas do .env.production${NC}"
else
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL não está definida${NC}"
    echo "Construindo DATABASE_URL a partir das variáveis individuais..."
    
    if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
        echo -e "${RED}❌ POSTGRES_USER, POSTGRES_PASSWORD ou POSTGRES_DB não estão definidos${NC}"
        exit 1
    fi
    
    # Codificar senha para URL (escapar caracteres especiais)
    ENCODED_PASSWORD=$(echo -n "$POSTGRES_PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))" 2>/dev/null || echo "$POSTGRES_PASSWORD")
    
    DATABASE_URL="postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@db:5432/${POSTGRES_DB}"
    echo -e "${GREEN}✓ DATABASE_URL construída: postgresql://${POSTGRES_USER}:***@db:5432/${POSTGRES_DB}${NC}"
else
    echo -e "${GREEN}✓ DATABASE_URL encontrada${NC}"
fi

# Verificar formato da URL
if echo "$DATABASE_URL" | grep -qE "^postgresql://[^:]+:[^@]+@[^:]+:[0-9]+/[^/]+"; then
    echo -e "${GREEN}✓ Formato da DATABASE_URL parece correto${NC}"
else
    echo -e "${YELLOW}⚠️  Formato da DATABASE_URL pode estar incorreto${NC}"
    echo "Formato esperado: postgresql://user:password@host:port/database"
fi

# Verificar se a senha precisa ser codificada
if echo "$POSTGRES_PASSWORD" | grep -qE "[@#\$%&*()+=<>?/\\|]"; then
    echo -e "${YELLOW}⚠️  Senha contém caracteres especiais que podem precisar ser codificados${NC}"
    echo "Senha atual: $POSTGRES_PASSWORD"
    ENCODED_PASSWORD=$(echo -n "$POSTGRES_PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))" 2>/dev/null || echo "$POSTGRES_PASSWORD")
    echo "Senha codificada: $ENCODED_PASSWORD"
    echo ""
    echo "DATABASE_URL corrigida seria:"
    echo "postgresql://${POSTGRES_USER}:${ENCODED_PASSWORD}@db:5432/${POSTGRES_DB}"
fi

# Testar conexão
echo ""
echo -e "${BLUE}Testando conexão com o banco...${NC}"
if docker exec agilepm-api sh -c "cd /app/prisma && prisma db execute --stdin --schema=schema.prisma <<< 'SELECT 1;'" 2>/dev/null; then
    echo -e "${GREEN}✓ Conexão com banco funcionando!${NC}"
else
    echo -e "${YELLOW}⚠️  Não foi possível testar conexão${NC}"
    echo "Verifique se o container da API está rodando"
fi

echo ""
echo -e "${GREEN}✅ Verificação concluída!${NC}"

