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
echo "Status dos containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "NAMES|agilepm" || echo "Nenhum container encontrado"

if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    echo ""
    echo "Tentando iniciar containers..."
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    sleep 5
    if ! docker ps | grep -q agilepm-api; then
        echo -e "${RED}❌ Falha ao iniciar containers${NC}"
        exit 1
    fi
fi

if ! docker ps | grep -q agilepm-web; then
    echo -e "${YELLOW}⚠️  Container do Web não está rodando${NC}"
fi

if ! docker ps | grep -q agilepm-db; then
    echo -e "${YELLOW}⚠️  Container do DB não está rodando${NC}"
fi

echo -e "${GREEN}✓ Containers verificados${NC}"

# 2. Verificar API diretamente
echo ""
echo -e "${BLUE}2. Testando API diretamente (porta 4000)...${NC}"
echo "Testando: curl http://localhost:4000/health"
API_HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:4000/health 2>&1)
HTTP_CODE=$(echo "$API_HEALTH" | grep "HTTP_CODE" | cut -d: -f2)
API_BODY=$(echo "$API_HEALTH" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ] && echo "$API_BODY" | grep -q "ok"; then
    echo -e "${GREEN}✓ API está respondendo diretamente (HTTP $HTTP_CODE)${NC}"
    echo "Resposta: $API_BODY"
else
    echo -e "${RED}❌ API não está respondendo corretamente${NC}"
    echo "HTTP Code: $HTTP_CODE"
    echo "Resposta: $API_BODY"
    echo ""
    echo -e "${YELLOW}📋 Últimos logs da API:${NC}"
    docker logs agilepm-api --tail 30
    echo ""
    echo -e "${YELLOW}💡 Verificando se o container está saudável...${NC}"
    docker inspect agilepm-api --format='{{.State.Status}}' 2>/dev/null || echo "Container não encontrado"
    exit 1
fi

# 3. Verificar API através do proxy (porta 8080)
echo ""
echo -e "${BLUE}3. Testando API através do proxy (porta 8080)...${NC}"
WEB_PORT=${WEB_PORT:-8080}
echo "Testando: curl http://localhost:${WEB_PORT}/api/health"
PROXY_HEALTH=$(curl -s -w "\nHTTP_CODE:%{http_code}" http://localhost:${WEB_PORT}/api/health 2>&1)
PROXY_HTTP_CODE=$(echo "$PROXY_HEALTH" | grep "HTTP_CODE" | cut -d: -f2)
PROXY_BODY=$(echo "$PROXY_HEALTH" | grep -v "HTTP_CODE")

if [ "$PROXY_HTTP_CODE" = "200" ] && echo "$PROXY_BODY" | grep -q "ok"; then
    echo -e "${GREEN}✓ API está respondendo através do proxy (HTTP $PROXY_HTTP_CODE)${NC}"
    echo "Resposta: $PROXY_BODY"
else
    echo -e "${YELLOW}⚠️  API não está respondendo através do proxy${NC}"
    echo "HTTP Code: $PROXY_HTTP_CODE"
    echo "Resposta: $PROXY_BODY"
    echo ""
    echo -e "${YELLOW}💡 Verificando logs do nginx...${NC}"
    docker logs agilepm-web --tail 20 2>&1 | grep -i "error\|api" || echo "Nenhum erro encontrado nos logs"
    echo ""
    echo -e "${YELLOW}💡 Testando conectividade do container web para API...${NC}"
    docker exec agilepm-web wget -qO- http://agilepm-api:4000/health 2>&1 || echo "Erro ao conectar do web para API"
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

LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@alpha.com","password":"alpha123"}' 2>&1)
LOGIN_HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
LOGIN_BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE")

if [ "$LOGIN_HTTP_CODE" = "200" ] && echo "$LOGIN_BODY" | grep -q "token"; then
    echo -e "${GREEN}✓ Login funcionando diretamente na API! (HTTP $LOGIN_HTTP_CODE)${NC}"
    echo -e "${GREEN}Token recebido: ${LOGIN_BODY:0:150}...${NC}"
else
    echo -e "${RED}❌ Login falhou diretamente na API${NC}"
    echo "HTTP Code: $LOGIN_HTTP_CODE"
    echo "Resposta completa: $LOGIN_BODY"
    echo ""
    echo -e "${YELLOW}💡 Possíveis causas:${NC}"
    echo "  - Usuário não existe no banco"
    echo "  - Senha incorreta"
    echo "  - Problema com hash de senha"
fi

# 7. Testar login através do proxy
echo ""
echo -e "${BLUE}7. Testando login através do proxy (porta ${WEB_PORT})...${NC}"
echo -e "${YELLOW}Testando com: ceo@alpha.com / alpha123${NC}"

PROXY_LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:${WEB_PORT}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@alpha.com","password":"alpha123"}' 2>&1)
PROXY_LOGIN_HTTP_CODE=$(echo "$PROXY_LOGIN_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
PROXY_LOGIN_BODY=$(echo "$PROXY_LOGIN_RESPONSE" | grep -v "HTTP_CODE")

if [ "$PROXY_LOGIN_HTTP_CODE" = "200" ] && echo "$PROXY_LOGIN_BODY" | grep -q "token"; then
    echo -e "${GREEN}✓ Login funcionando através do proxy! (HTTP $PROXY_LOGIN_HTTP_CODE)${NC}"
    echo -e "${GREEN}Token recebido: ${PROXY_LOGIN_BODY:0:150}...${NC}"
else
    echo -e "${RED}❌ Login falhou através do proxy${NC}"
    echo "HTTP Code: $PROXY_LOGIN_HTTP_CODE"
    echo "Resposta completa: $PROXY_LOGIN_BODY"
    echo ""
    echo -e "${YELLOW}💡 Verificando configuração do nginx...${NC}"
    docker exec agilepm-web cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /api" || echo "Não foi possível ler configuração do nginx"
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
