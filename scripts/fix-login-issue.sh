#!/bin/bash

# Script para corrigir problemas de login
# Uso: ./scripts/fix-login-issue.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Corrigindo problemas de login${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Resetar senha do superadmin
echo -e "${YELLOW}1️⃣  Resetando senha do superadmin...${NC}"
./scripts/reset-superadmin.sh superadmin@agilepm.com superadmin123
echo ""

# 2. Testar login
echo -e "${YELLOW}2️⃣  Testando login...${NC}"
./scripts/test-login-api.sh superadmin@agilepm.com superadmin123
echo ""

# 3. Verificar logs da API
echo -e "${YELLOW}3️⃣  Verificando logs da API...${NC}"
docker logs agilepm-api --tail 30 | grep -i "login\|auth\|error" || echo "Nenhum log relacionado"
echo ""

echo -e "${GREEN}✅ Processo concluído${NC}"

