#!/bin/bash

# Script para testar login e diagnosticar problemas
# Uso: ./scripts/test-login.sh

set -e

echo "🔍 Testando login e diagnosticando problemas..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar containers
echo -e "${BLUE}1. Verificando containers...${NC}"
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Containers estão rodando${NC}"

# 2. Verificar API diretamente
echo ""
echo -e "${BLUE}2. Testando API diretamente (porta 4000)...${NC}"
API_HEALTH=$(curl -s http://localhost:4000/health 2>&1)
if echo "$API_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓ API está respondendo diretamente${NC}"
else
    echo -e "${RED}❌ API não está respondendo${NC}"
    echo "Resposta: $API_HEALTH"
    echo ""
    echo -e "${YELLOW}📋 Logs da API:${NC}"
    docker logs agilepm-api --tail 20
    exit 1
fi

# 3. Verificar API através do proxy (porta 8080)
echo ""
echo -e "${BLUE}3. Testando API através do proxy (porta 8080)...${NC}"
PROXY_HEALTH=$(curl -s http://localhost:8080/api/health 2>&1)
if echo "$PROXY_HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓ API está respondendo através do proxy${NC}"
else
    echo -e "${YELLOW}⚠️  API não está respondendo através do proxy${NC}"
    echo "Resposta: $PROXY_HEALTH"
    echo ""
    echo -e "${YELLOW}💡 Verifique a configuração do nginx${NC}"
fi

# 4. Verificar usuários no banco
echo ""
echo -e "${BLUE}4. Verificando usuários no banco...${NC}"
USER_COUNT=$(docker exec agilepm-db psql -U postgres -d agilepm -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' \n' || echo "0")

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo -e "${YELLOW}⚠️  Nenhum usuário encontrado no banco${NC}"
    echo -e "${YELLOW}💡 Executando seed...${NC}"
    docker exec agilepm-api pnpm prisma db seed || {
        echo -e "${RED}❌ Erro ao executar seed${NC}"
        docker logs agilepm-api --tail 20
        exit 1
    }
    echo -e "${GREEN}✓ Seed executado${NC}"
else
    echo -e "${GREEN}✓ Encontrados $USER_COUNT usuário(s) no banco${NC}"
fi

# 5. Listar usuários
echo ""
echo -e "${BLUE}5. Usuários disponíveis:${NC}"
docker exec agilepm-db psql -U postgres -d agilepm -c "SELECT email, name, role FROM \"User\" ORDER BY email;" 2>/dev/null || echo "Erro ao listar usuários"

# 6. Testar login diretamente na API
echo ""
echo -e "${BLUE}6. Testando login diretamente na API (porta 4000)...${NC}"
echo -e "${YELLOW}Testando com: ceo@alpha.com / alpha123${NC}"

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@alpha.com","password":"alpha123"}' 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ Login funcionando diretamente na API!${NC}"
    echo -e "${GREEN}Token recebido: ${LOGIN_RESPONSE:0:100}...${NC}"
else
    echo -e "${RED}❌ Login falhou diretamente na API${NC}"
    echo "Resposta: $LOGIN_RESPONSE"
fi

# 7. Testar login através do proxy
echo ""
echo -e "${BLUE}7. Testando login através do proxy (porta 8080)...${NC}"
echo -e "${YELLOW}Testando com: ceo@alpha.com / alpha123${NC}"

PROXY_LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@alpha.com","password":"alpha123"}' 2>&1)

if echo "$PROXY_LOGIN_RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ Login funcionando através do proxy!${NC}"
    echo -e "${GREEN}Token recebido: ${PROXY_LOGIN_RESPONSE:0:100}...${NC}"
else
    echo -e "${RED}❌ Login falhou através do proxy${NC}"
    echo "Resposta: $PROXY_LOGIN_RESPONSE"
    echo ""
    echo -e "${YELLOW}💡 Verifique:${NC}"
    echo "  1. A configuração do nginx (apps/web/nginx.conf)"
    echo "  2. Se o proxy está removendo /api corretamente"
    echo "  3. Se a API está acessível do container web"
fi

# 8. Credenciais de teste
echo ""
echo -e "${GREEN}📋 Credenciais de Teste:${NC}"
echo ""
echo -e "${YELLOW}🔴 SUPERADMIN:${NC}"
echo "   superadmin@agilepm.com / superadmin123"
echo ""
echo -e "${YELLOW}🟢 Alpha Tech Solutions:${NC}"
echo "   ceo@alpha.com / alpha123 (OWNER)"
echo "   pm@alpha.com / alpha123 (ADMIN)"
echo "   dev@alpha.com / alpha123 (MEMBER)"
echo ""
echo -e "${YELLOW}🔵 Beta Logistics:${NC}"
echo "   diretoria@beta.com / beta123 (OWNER)"
echo "   operacoes@beta.com / beta123 (ADMIN)"
echo "   analista@beta.com / beta123 (MEMBER)"

echo ""
echo -e "${GREEN}✅ Teste concluído!${NC}"
