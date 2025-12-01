#!/bin/bash

# Script para verificar erros na criação de projetos
# Uso: ./scripts/check-project-creation-error.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Verificando erros na criação de projetos${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Verificar logs recentes da API
echo -e "${YELLOW}1️⃣  Últimos logs da API relacionados a projetos...${NC}"
docker logs agilepm-api --tail 50 2>&1 | grep -i "project\|erro\|error\|create" | tail -20 || echo "Nenhum log relacionado encontrado"
echo ""

# 2. Testar criação de projeto diretamente
echo -e "${YELLOW}2️⃣  Testando criação de projeto via API...${NC}"

# Obter token de autenticação
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@agilepm.com","password":"superadmin123"}' | jq -r '.accessToken' 2>/dev/null || echo "")

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo -e "${RED}❌ Não foi possível obter token de autenticação${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Token obtido${NC}"

# Obter primeira empresa
COMPANY_ID=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@agilepm.com","password":"superadmin123"}' | jq -r '.companies[0].id' 2>/dev/null || echo "")

if [ -z "$COMPANY_ID" ] || [ "$COMPANY_ID" = "null" ]; then
    echo -e "${RED}❌ Não foi possível obter ID da empresa${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Empresa ID: $COMPANY_ID${NC}"

# Tentar criar projeto
echo -e "${YELLOW}Tentando criar projeto de teste...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:4000/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Company-Id: $COMPANY_ID" \
  -d '{"name":"Projeto Teste '$(date +%s)'","description":"Teste de criação"}' 2>&1)

echo "Resposta:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${RED}❌ Erro ao criar projeto${NC}"
    ERROR_MSG=$(echo "$RESPONSE" | jq -r '.error' 2>/dev/null || echo "$RESPONSE")
    echo "Mensagem de erro: $ERROR_MSG"
else
    echo -e "${GREEN}✓ Projeto criado com sucesso!${NC}"
fi
echo ""

# 3. Verificar se superadmin tem membership na empresa
echo -e "${YELLOW}3️⃣  Verificando membership do superadmin...${NC}"
docker exec agilepm-db psql -U postgres -d agilepm -t -c \
  "SELECT cu.\"role\", c.name FROM \"CompanyUser\" cu JOIN \"Company\" c ON cu.\"companyId\" = c.id WHERE cu.\"userId\" = (SELECT id FROM \"User\" WHERE email = 'superadmin@agilepm.com');" 2>/dev/null || echo "Erro ao verificar membership"
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ Verificação concluída${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

