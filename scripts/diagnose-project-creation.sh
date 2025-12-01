#!/bin/bash

# Script para diagnosticar problemas na criação de projetos
# Uso: ./scripts/diagnose-project-creation.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Diagnosticando criação de projetos${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Verificar se o container da API está rodando
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    exit 1
fi

# Obter DATABASE_URL
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

echo -e "${YELLOW}1️⃣ Verificando schema do banco de dados...${NC}"

# Verificar se a coluna publicReportToken existe
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -t -c \"SELECT column_name FROM information_schema.columns WHERE table_name='Project' AND column_name='publicReportToken';\" 2>/dev/null | grep -q publicReportToken" && \
  echo -e "${GREEN}   ✅ Coluna publicReportToken existe${NC}" || \
  echo -e "${RED}   ❌ Coluna publicReportToken NÃO existe (execute migrations!)${NC}"

echo ""
echo -e "${YELLOW}2️⃣ Verificando usuários...${NC}"

# Verificar superadmin
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -t -c \"SELECT COUNT(*) FROM \"User\" WHERE role='SUPERADMIN';\" 2>/dev/null" | tr -d ' ' | while read count; do
  if [ "$count" -gt 0 ]; then
    echo -e "${GREEN}   ✅ Superadmin existe ($count usuário(s))${NC}"
  else
    echo -e "${RED}   ❌ Nenhum superadmin encontrado${NC}"
  fi
done

echo ""
echo -e "${YELLOW}3️⃣ Verificando empresas...${NC}"

# Verificar empresas
docker exec agilepm-api sh -c "cd /app && DATABASE_URL='$DB_URL' psql -t -c \"SELECT COUNT(*) FROM \"Company\" WHERE \"isActive\"=true;\" 2>/dev/null" | tr -d ' ' | while read count; do
  if [ "$count" -gt 0 ]; then
    echo -e "${GREEN}   ✅ Empresas ativas: $count${NC}"
  else
    echo -e "${RED}   ❌ Nenhuma empresa ativa encontrada${NC}"
  fi
done

echo ""
echo -e "${YELLOW}4️⃣ Verificando logs recentes da API...${NC}"
echo ""
docker logs --tail 50 agilepm-api | grep -E "(Erro|Error|ERROR|❌|criar projeto|createProject)" | tail -10 || echo "   (nenhum erro recente encontrado nos logs)"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}💡 Próximos passos:${NC}"
echo ""
echo "1. Se a coluna publicReportToken não existe, execute:"
echo "   ./scripts/run-migrations.sh"
echo ""
echo "2. Se não há superadmin, execute:"
echo "   ./scripts/fix-superadmin-login.sh"
echo ""
echo "3. Se não há empresas, execute:"
echo "   ./scripts/restore-seed-data.sh"
echo ""
echo "4. Para ver logs em tempo real:"
echo "   docker logs -f agilepm-api"

