#!/bin/bash

# Script para diagnosticar problemas de login
# Uso: ./scripts/diagnose-login.sh

set -e

echo "🔍 Diagnosticando problemas de login..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Verificar se containers estão rodando
echo -e "${BLUE}1. Verificando containers...${NC}"
if docker ps | grep -q agilepm-api; then
    echo -e "${GREEN}✓ Container da API está rodando${NC}"
else
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    echo "Execute: docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
    exit 1
fi

if docker ps | grep -q agilepm-db; then
    echo -e "${GREEN}✓ Container do banco está rodando${NC}"
else
    echo -e "${RED}❌ Container do banco não está rodando${NC}"
    exit 1
fi

# 2. Verificar se API está respondendo
echo ""
echo -e "${BLUE}2. Verificando se API está respondendo...${NC}"
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API está respondendo${NC}"
else
    echo -e "${RED}❌ API não está respondendo${NC}"
    echo -e "${YELLOW}📋 Logs da API:${NC}"
    docker logs agilepm-api --tail 30
    exit 1
fi

# 3. Verificar se há usuários no banco
echo ""
echo -e "${BLUE}3. Verificando se há usuários no banco...${NC}"
USER_COUNT=$(docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db psql -U postgres -d agilepm -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo -e "${YELLOW}⚠️  Nenhum usuário encontrado no banco${NC}"
    echo -e "${YELLOW}💡 Executando seed...${NC}"
    docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma db seed || {
        echo -e "${RED}❌ Erro ao executar seed${NC}"
        echo -e "${YELLOW}📋 Logs:${NC}"
        docker logs agilepm-api --tail 20
        exit 1
    }
    echo -e "${GREEN}✓ Seed executado com sucesso${NC}"
else
    echo -e "${GREEN}✓ Encontrados $USER_COUNT usuário(s) no banco${NC}"
fi

# 4. Listar usuários disponíveis
echo ""
echo -e "${BLUE}4. Usuários disponíveis:${NC}"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db psql -U postgres -d agilepm -c "SELECT email, name, role FROM \"User\" ORDER BY email;" 2>/dev/null || echo "Erro ao listar usuários"

# 5. Testar login
echo ""
echo -e "${BLUE}5. Testando login...${NC}"
echo -e "${YELLOW}Testando com: superadmin@agilepm.com / superadmin123${NC}"

RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@agilepm.com","password":"superadmin123"}' 2>&1)

if echo "$RESPONSE" | grep -q "token"; then
    echo -e "${GREEN}✓ Login funcionando!${NC}"
    echo -e "${GREEN}Resposta: ${RESPONSE:0:100}...${NC}"
else
    echo -e "${RED}❌ Login falhou${NC}"
    echo -e "${YELLOW}Resposta: $RESPONSE${NC}"
    echo ""
    echo -e "${YELLOW}💡 Possíveis causas:${NC}"
    echo "  1. Seed não foi executado"
    echo "  2. Senha incorreta"
    echo "  3. Problema com hash de senha"
    echo "  4. API não está processando requisições corretamente"
fi

# 6. Verificar logs da API
echo ""
echo -e "${BLUE}6. Últimos logs da API:${NC}"
docker logs agilepm-api --tail 10

echo ""
echo -e "${GREEN}✅ Diagnóstico concluído!${NC}"

