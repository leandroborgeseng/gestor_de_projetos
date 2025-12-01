#!/bin/bash

# Script para testar login na API e verificar logs
# Uso: ./scripts/test-login-api.sh [email] [senha]

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMAIL="${1:-superadmin@agilepm.com}"
PASSWORD="${2:-superadmin123}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 Testando Login na API${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Email: $EMAIL"
echo ""

# 1. Verificar se API está rodando
echo -e "${YELLOW}1️⃣  Verificando se API está rodando...${NC}"
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    exit 1
fi
echo -e "${GREEN}✓ API está rodando${NC}"
echo ""

# 2. Testar health endpoint
echo -e "${YELLOW}2️⃣  Testando health endpoint...${NC}"
HEALTH=$(curl -s http://localhost:4000/health)
echo "Resposta: $HEALTH"
if echo "$HEALTH" | grep -q "ok"; then
    echo -e "${GREEN}✓ Health endpoint OK${NC}"
else
    echo -e "${RED}❌ Health endpoint não está OK${NC}"
fi
echo ""

# 3. Verificar variáveis de ambiente
echo -e "${YELLOW}3️⃣  Verificando variáveis de ambiente...${NC}"
JWT_SECRET=$(docker exec agilepm-api sh -c 'echo $JWT_SECRET' 2>/dev/null || echo "")
JWT_REFRESH_SECRET=$(docker exec agilepm-api sh -c 'echo $JWT_REFRESH_SECRET' 2>/dev/null || echo "")
DATABASE_URL=$(docker exec agilepm-api sh -c 'echo $DATABASE_URL' 2>/dev/null | head -c 50 || echo "")

if [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ JWT_SECRET não está definido${NC}"
else
    echo -e "${GREEN}✓ JWT_SECRET está definido${NC}"
fi

if [ -z "$JWT_REFRESH_SECRET" ]; then
    echo -e "${RED}❌ JWT_REFRESH_SECRET não está definido${NC}"
else
    echo -e "${GREEN}✓ JWT_REFRESH_SECRET está definido${NC}"
fi

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definido${NC}"
else
    echo -e "${GREEN}✓ DATABASE_URL está definido${NC}"
fi
echo ""

# 4. Verificar se usuário existe no banco
echo -e "${YELLOW}4️⃣  Verificando se usuário existe no banco...${NC}"
USER_EXISTS=$(docker exec agilepm-db psql -U postgres -d agilepm -t -c "SELECT COUNT(*) FROM \"User\" WHERE email = '$EMAIL';" 2>/dev/null | tr -d ' \n' || echo "0")

if [ "$USER_EXISTS" = "0" ]; then
    echo -e "${RED}❌ Usuário $EMAIL não existe no banco${NC}"
    echo -e "${YELLOW}💡 Execute: ./scripts/run-seed.sh para criar usuários de teste${NC}"
else
    echo -e "${GREEN}✓ Usuário existe no banco${NC}"
    
    # Verificar hash da senha
    echo -e "${YELLOW}📋 Verificando hash da senha...${NC}"
    PASSWORD_HASH=$(docker exec agilepm-db psql -U postgres -d agilepm -t -c "SELECT \"passwordHash\" FROM \"User\" WHERE email = '$EMAIL';" 2>/dev/null | tr -d ' \n' || echo "")
    if [ -n "$PASSWORD_HASH" ]; then
        echo -e "${GREEN}✓ Hash da senha existe${NC}"
    else
        echo -e "${RED}❌ Hash da senha não encontrado${NC}"
    fi
fi
echo ""

# 5. Testar login diretamente na API
echo -e "${YELLOW}5️⃣  Testando login diretamente na API...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>&1)

echo "Resposta completa:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Login funcionou!${NC}"
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken' 2>/dev/null || echo "")
    if [ -n "$TOKEN" ]; then
        echo -e "${GREEN}✓ Token gerado com sucesso${NC}"
    fi
elif echo "$LOGIN_RESPONSE" | grep -qi "invalid\|incorrect\|wrong"; then
    echo -e "${RED}❌ Login falhou: Senha ou email inválido${NC}"
elif echo "$LOGIN_RESPONSE" | grep -qi "error"; then
    echo -e "${RED}❌ Login falhou com erro${NC}"
else
    echo -e "${YELLOW}⚠️  Resposta inesperada${NC}"
fi
echo ""

# 6. Verificar logs da API
echo -e "${YELLOW}6️⃣  Últimos logs da API relacionados a login...${NC}"
docker logs agilepm-api 2>&1 | grep -i "login\|auth\|error" | tail -20 || echo "Nenhum log relacionado encontrado"
echo ""

# 7. Testar via proxy do nginx
echo -e "${YELLOW}7️⃣  Testando login via proxy do nginx...${NC}"
PROXY_RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>&1)

if echo "$PROXY_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Login via proxy funcionou!${NC}"
elif echo "$PROXY_RESPONSE" | grep -qi "502\|503\|504"; then
    echo -e "${RED}❌ Proxy retornou erro 5xx - API não está acessível${NC}"
    echo "Resposta: $PROXY_RESPONSE"
elif echo "$PROXY_RESPONSE" | grep -qi "invalid\|incorrect"; then
    echo -e "${RED}❌ Login via proxy falhou: Senha ou email inválido${NC}"
else
    echo -e "${YELLOW}⚠️  Resposta inesperada do proxy${NC}"
    echo "Resposta: $PROXY_RESPONSE"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ Teste concluído${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

