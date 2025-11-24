#!/bin/bash

# Script para testar login na API
# Uso: ./scripts/test-login.sh

set -e

echo "🔐 Testando login na API..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar se API está rodando
echo -e "${YELLOW}1. Verificando se API está rodando...${NC}"
if ! curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${RED}❌ API não está respondendo em http://localhost:4000/health${NC}"
    echo "Verifique os logs: docker logs agilepm-api --tail 50"
    exit 1
fi
echo -e "${GREEN}✓ API está respondendo${NC}"
echo ""

# Testar login
echo -e "${YELLOW}2. Testando login...${NC}"
echo "Tentando fazer login com: ceo@alpha.com / alpha123"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@alpha.com","password":"alpha123"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Login bem-sucedido!${NC}"
    echo "Resposta:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ Login falhou (HTTP $HTTP_CODE)${NC}"
    echo "Resposta:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""
    echo -e "${YELLOW}💡 Possíveis causas:${NC}"
    echo "1. Usuário não existe no banco (seed não foi executado)"
    echo "2. Senha incorreta"
    echo "3. Problema de CORS"
    echo "4. API não está configurada corretamente"
    echo ""
    echo "Verificar logs: docker logs agilepm-api --tail 50"
fi

echo ""
echo -e "${YELLOW}3. Verificando usuários no banco...${NC}"
USER_COUNT=$(docker exec agilepm-db psql -U postgres -d agilepm -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' \n' || echo "0")
echo "Usuários no banco: $USER_COUNT"

if [ "$USER_COUNT" = "0" ]; then
    echo -e "${YELLOW}⚠️  Nenhum usuário encontrado!${NC}"
    echo "Execute o seed: docker exec agilepm-api pnpm prisma db seed"
fi

echo ""
echo "✅ Teste concluído!"

