#!/bin/bash

# Script para diagnosticar conexão entre frontend e backend
# Uso: ./scripts/diagnose-api-connection.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Diagnosticando conexão Frontend ↔ Backend${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Verificar containers
echo -e "${YELLOW}1️⃣  Verificando containers...${NC}"
if docker ps | grep -q agilepm-api; then
    echo -e "${GREEN}✓ Container da API está rodando${NC}"
else
    echo -e "${RED}❌ Container da API NÃO está rodando${NC}"
    exit 1
fi

if docker ps | grep -q agilepm-web; then
    echo -e "${GREEN}✓ Container do Frontend está rodando${NC}"
else
    echo -e "${RED}❌ Container do Frontend NÃO está rodando${NC}"
    exit 1
fi
echo ""

# 2. Verificar se API está respondendo diretamente
echo -e "${YELLOW}2️⃣  Testando API diretamente (do host)...${NC}"
if curl -s http://localhost:4000/health | grep -q "ok"; then
    echo -e "${GREEN}✓ API está respondendo em http://localhost:4000/health${NC}"
else
    echo -e "${RED}❌ API NÃO está respondendo em http://localhost:4000/health${NC}"
    echo -e "${YELLOW}📋 Logs da API:${NC}"
    docker logs agilepm-api --tail 20
fi
echo ""

# 3. Verificar se API está acessível do container do frontend
echo -e "${YELLOW}3️⃣  Testando API do container do frontend...${NC}"
if docker exec agilepm-web wget -q -O- http://agilepm-api:4000/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✓ Frontend consegue acessar API em http://agilepm-api:4000${NC}"
elif docker exec agilepm-web curl -s http://agilepm-api:4000/health 2>/dev/null | grep -q "ok"; then
    echo -e "${GREEN}✓ Frontend consegue acessar API em http://agilepm-api:4000 (via curl)${NC}"
else
    echo -e "${RED}❌ Frontend NÃO consegue acessar API${NC}"
    echo -e "${YELLOW}💡 Verificando rede...${NC}"
    docker network inspect agilepm_agilepm-network 2>/dev/null | grep -A 5 "agilepm-api" || echo "Rede não encontrada"
fi
echo ""

# 4. Verificar proxy do nginx
echo -e "${YELLOW}4️⃣  Testando proxy do nginx...${NC}"
if curl -s http://localhost:8080/api/health | grep -q "ok"; then
    echo -e "${GREEN}✓ Proxy do nginx está funcionando (http://localhost:8080/api/health)${NC}"
else
    echo -e "${RED}❌ Proxy do nginx NÃO está funcionando${NC}"
    echo -e "${YELLOW}📋 Verificando configuração do nginx...${NC}"
    docker exec agilepm-web cat /etc/nginx/conf.d/default.conf | grep -A 10 "location /api" || echo "Configuração não encontrada"
fi
echo ""

# 5. Testar login diretamente na API
echo -e "${YELLOW}5️⃣  Testando endpoint de login na API...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@agilepm.com","password":"superadmin123"}' 2>&1)

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
    echo -e "${GREEN}✓ Login funcionando na API${NC}"
elif echo "$LOGIN_RESPONSE" | grep -q "Invalid"; then
    echo -e "${YELLOW}⚠️  Login retornou 'Invalid' - pode ser problema de senha ou usuário${NC}"
    echo -e "${YELLOW}Resposta: $LOGIN_RESPONSE${NC}"
else
    echo -e "${RED}❌ Login NÃO está funcionando${NC}"
    echo -e "${YELLOW}Resposta: $LOGIN_RESPONSE${NC}"
fi
echo ""

# 6. Verificar logs da API para erros
echo -e "${YELLOW}6️⃣  Verificando logs recentes da API...${NC}"
echo -e "${YELLOW}Últimas 10 linhas:${NC}"
docker logs agilepm-api --tail 10 2>&1 | tail -10
echo ""

# 7. Verificar logs do frontend
echo -e "${YELLOW}7️⃣  Verificando logs do frontend...${NC}"
echo -e "${YELLOW}Últimas 10 linhas:${NC}"
docker logs agilepm-web --tail 10 2>&1 | tail -10
echo ""

# 8. Verificar variáveis de ambiente
echo -e "${YELLOW}8️⃣  Verificando variáveis de ambiente da API...${NC}"
echo -e "${YELLOW}DATABASE_URL:${NC}"
docker exec agilepm-api sh -c 'echo $DATABASE_URL' | head -c 50
echo "..."
echo -e "${YELLOW}JWT_SECRET:${NC}"
docker exec agilepm-api sh -c 'if [ -n "$JWT_SECRET" ]; then echo "✅ Definido"; else echo "❌ NÃO definido"; fi'
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ Diagnóstico concluído${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

