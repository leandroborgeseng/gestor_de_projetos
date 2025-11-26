#!/bin/bash

# Script para verificar e testar conexão com o banco
# Uso: ./scripts/verify-db-connection.sh

set -e

echo "🔍 Verificando conexão com o banco de dados..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar DATABASE_URL no container
echo -e "${BLUE}1. Verificando DATABASE_URL no container...${NC}"
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Mostrar URL mascarada
MASKED_URL=$(echo "$DB_URL" | sed 's/:[^@]*@/:***@/')
echo -e "${GREEN}✓ DATABASE_URL encontrada: $MASKED_URL${NC}"

# Verificar se a URL está correta
if echo "$DB_URL" | grep -qE "^postgresql://[^:]+:[^@]+@[^:]+:[0-9]+/[^/]+"; then
    echo -e "${GREEN}✓ Formato da URL parece correto${NC}"
else
    echo -e "${YELLOW}⚠️  Formato da URL pode estar incorreto${NC}"
fi

# Testar conexão usando psql diretamente
echo ""
echo -e "${BLUE}2. Testando conexão com psql...${NC}"
if docker exec agilepm-db psql -U postgres -d agilepm -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Conexão com banco funcionando via psql${NC}"
else
    echo -e "${RED}❌ Não foi possível conectar ao banco via psql${NC}"
fi

# Testar conexão usando Prisma
echo ""
echo -e "${BLUE}3. Testando conexão com Prisma...${NC}"
PRISMA_TEST=$(docker exec agilepm-api sh -c "cd /app/prisma && prisma db execute --stdin --schema=schema.prisma <<< 'SELECT 1;'" 2>&1)

if echo "$PRISMA_TEST" | grep -q "1"; then
    echo -e "${GREEN}✓ Conexão com banco funcionando via Prisma${NC}"
elif echo "$PRISMA_TEST" | grep -q "invalid port number"; then
    echo -e "${RED}❌ Erro: invalid port number${NC}"
    echo -e "${YELLOW}💡 A senha pode ter caracteres especiais que estão quebrando a URL${NC}"
    echo ""
    echo -e "${YELLOW}Solução:${NC}"
    echo "1. Verifique a senha no .env.production"
    echo "2. Se tiver caracteres especiais, use o script fix-db-url.sh"
    echo "3. Ou defina DATABASE_URL manualmente com a senha codificada"
elif echo "$PRISMA_TEST" | grep -q "connection"; then
    echo -e "${RED}❌ Erro de conexão:${NC}"
    echo "$PRISMA_TEST"
else
    echo -e "${YELLOW}⚠️  Resposta inesperada:${NC}"
    echo "$PRISMA_TEST"
fi

echo ""
echo -e "${GREEN}✅ Verificação concluída!${NC}"

