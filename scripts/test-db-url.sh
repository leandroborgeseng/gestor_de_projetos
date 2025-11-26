#!/bin/bash

# Script para testar DATABASE_URL diretamente
# Uso: ./scripts/test-db-url.sh

set -e

echo "🧪 Testando DATABASE_URL..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Obter DATABASE_URL do container
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

MASKED_URL=$(echo "$DB_URL" | sed 's/:[^@]*@/:***@/')
echo -e "${BLUE}DATABASE_URL: $MASKED_URL${NC}"
echo ""

# Testar parsing da URL com Node.js
echo -e "${BLUE}Testando parsing da URL...${NC}"
PARSE_TEST=$(docker exec agilepm-api sh -c "node -e \"
const url = require('url');
try {
    const parsed = new URL('$DB_URL');
    console.log('Protocol:', parsed.protocol);
    console.log('Username:', parsed.username);
    console.log('Hostname:', parsed.hostname);
    console.log('Port:', parsed.port);
    console.log('Pathname:', parsed.pathname);
    console.log('✅ URL válida');
} catch (e) {
    console.log('❌ Erro:', e.message);
    process.exit(1);
}
\"" 2>&1)

if echo "$PARSE_TEST" | grep -q "✅ URL válida"; then
    echo -e "${GREEN}✓ URL é válida${NC}"
    echo "$PARSE_TEST"
else
    echo -e "${RED}❌ URL inválida${NC}"
    echo "$PARSE_TEST"
    echo ""
    echo -e "${YELLOW}💡 A senha pode ter caracteres que precisam ser codificados${NC}"
    exit 1
fi

# Testar conexão com Prisma
echo ""
echo -e "${BLUE}Testando conexão com Prisma...${NC}"
PRISMA_TEST=$(docker exec agilepm-api sh -c "cd /app/prisma && DATABASE_URL='$DB_URL' prisma db execute --stdin --schema=schema.prisma <<< 'SELECT 1;'" 2>&1)

if echo "$PRISMA_TEST" | grep -q "1"; then
    echo -e "${GREEN}✓ Prisma consegue conectar!${NC}"
elif echo "$PRISMA_TEST" | grep -q "invalid port number"; then
    echo -e "${RED}❌ Erro: invalid port number${NC}"
    echo ""
    echo -e "${YELLOW}💡 O problema é que a senha tem caracteres especiais${NC}"
    echo -e "${YELLOW}💡 Solução:${NC}"
    echo "1. Verifique a senha no .env.production"
    echo "2. Se tiver caracteres como /, @, #, etc., eles precisam ser codificados"
    echo "3. Execute: ./scripts/fix-db-url.sh"
else
    echo -e "${YELLOW}⚠️  Resposta:${NC}"
    echo "$PRISMA_TEST"
fi

