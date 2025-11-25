#!/bin/bash

# Script para testar login localmente
# Uso: ./scripts/test-login-local.sh

set -e

echo "🔍 Testando login localmente..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar se API está rodando
echo -e "${BLUE}1. Verificando se API está rodando...${NC}"
if lsof -ti:4000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API está rodando na porta 4000${NC}"
else
    echo -e "${RED}❌ API não está rodando na porta 4000${NC}"
    echo -e "${YELLOW}💡 Inicie a API com: cd apps/api && pnpm dev${NC}"
    exit 1
fi

# 2. Verificar se Frontend está rodando
echo ""
echo -e "${BLUE}2. Verificando se Frontend está rodando...${NC}"
if lsof -ti:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend está rodando na porta 5173${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend não está rodando na porta 5173${NC}"
    echo -e "${YELLOW}💡 Inicie o Frontend com: cd apps/web && pnpm dev${NC}"
fi

# 3. Testar health da API
echo ""
echo -e "${BLUE}3. Testando health da API...${NC}"
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API está respondendo${NC}"
else
    echo -e "${RED}❌ API não está respondendo${NC}"
    exit 1
fi

# 4. Testar login direto na API
echo ""
echo -e "${BLUE}4. Testando login direto na API...${NC}"
echo -e "${YELLOW}Testando com: ceo@alpha.com / alpha123${NC}"

RESPONSE=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@alpha.com","password":"alpha123"}' 2>&1)

if echo "$RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ Login funcionando na API!${NC}"
    echo -e "${GREEN}Resposta: ${RESPONSE:0:150}...${NC}"
else
    echo -e "${RED}❌ Login falhou na API${NC}"
    echo -e "${YELLOW}Resposta: $RESPONSE${NC}"
    echo ""
    echo -e "${YELLOW}💡 Possíveis causas:${NC}"
    echo "  1. Seed não foi executado - Execute: cd apps/api && pnpm prisma db seed"
    echo "  2. Banco de dados não está rodando"
    echo "  3. Senha incorreta"
fi

# 5. Testar login através do proxy do Vite (se frontend estiver rodando)
if lsof -ti:5173 > /dev/null 2>&1; then
    echo ""
    echo -e "${BLUE}5. Testando login através do proxy do Vite...${NC}"
    echo -e "${YELLOW}Testando com: ceo@alpha.com / alpha123${NC}"

    PROXY_RESPONSE=$(curl -s -X POST http://localhost:5173/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"ceo@alpha.com","password":"alpha123"}' 2>&1)

    if echo "$PROXY_RESPONSE" | grep -q "token"; then
        echo -e "${GREEN}✓ Login funcionando através do proxy!${NC}"
        echo -e "${GREEN}Resposta: ${PROXY_RESPONSE:0:150}...${NC}"
    else
        echo -e "${RED}❌ Login falhou através do proxy${NC}"
        echo -e "${YELLOW}Resposta: $PROXY_RESPONSE${NC}"
        echo ""
        echo -e "${YELLOW}💡 Verifique:${NC}"
        echo "  1. O vite.config.ts está configurado corretamente"
        echo "  2. O proxy está apontando para http://localhost:4000"
    fi
fi

echo ""
echo -e "${GREEN}✅ Teste concluído!${NC}"
echo ""
echo -e "${YELLOW}📋 Credenciais de teste:${NC}"
echo "  - ceo@alpha.com / alpha123"
echo "  - diretoria@beta.com / beta123"
echo "  - superadmin@agilepm.com / superadmin123"

