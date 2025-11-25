#!/bin/bash

# Script para debug detalhado de login
# Uso: ./scripts/debug-login.sh

set -e

echo "🔍 Debug detalhado de login..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar logs do nginx
echo -e "${BLUE}1. Últimos logs do Nginx (web):${NC}"
docker logs agilepm-web --tail 20 2>&1 | grep -i "error\|api\|auth" || echo "Nenhum log relevante encontrado"
echo ""

# 2. Verificar logs da API
echo -e "${BLUE}2. Últimos logs da API:${NC}"
docker logs agilepm-api --tail 30 2>&1 | tail -20
echo ""

# 3. Testar endpoint diretamente
echo -e "${BLUE}3. Testando endpoint /auth/login diretamente na API:${NC}"
curl -v -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@alpha.com","password":"alpha123"}' 2>&1 | head -30
echo ""
echo ""

# 4. Testar endpoint através do proxy
echo -e "${BLUE}4. Testando endpoint /api/auth/login através do proxy:${NC}"
curl -v -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ceo@alpha.com","password":"alpha123"}' 2>&1 | head -30
echo ""
echo ""

# 5. Verificar se o container web consegue acessar a API
echo -e "${BLUE}5. Testando conectividade do container web para API:${NC}"
docker exec agilepm-web wget -qO- http://agilepm-api:4000/health 2>&1 || echo "Erro ao conectar"
echo ""
echo ""

# 6. Verificar configuração do nginx
echo -e "${BLUE}6. Verificando configuração do nginx:${NC}"
docker exec agilepm-web cat /etc/nginx/conf.d/default.conf | grep -A 20 "location /api"
echo ""

# 7. Verificar se há usuários
echo -e "${BLUE}7. Verificando usuários no banco:${NC}"
docker exec agilepm-db psql -U postgres -d agilepm -c "SELECT email, name FROM \"User\" LIMIT 5;" 2>&1 || echo "Erro ao consultar banco"
echo ""

echo -e "${GREEN}✅ Debug concluído!${NC}"

