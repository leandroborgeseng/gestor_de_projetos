#!/bin/bash

# Script para adicionar superadmin a todas as empresas
# Uso: ./scripts/add-superadmin-to-all-companies.sh [email]

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMAIL="${1:-superadmin@agilepm.com}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}👤 Adicionando superadmin a todas as empresas${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Email: $EMAIL"
echo ""

# Verificar se o container da API está rodando
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    exit 1
fi

# Copiar script para o container
echo -e "${YELLOW}📝 Copiando script para o container...${NC}"
docker cp scripts/add-superadmin-to-all-companies.ts agilepm-api:/app/prisma/add-superadmin-to-all-companies.ts

# Obter DATABASE_URL do container
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Executar script
echo -e "${YELLOW}🚀 Executando script...${NC}"
docker exec agilepm-api sh -c "cd /app/prisma && DATABASE_URL='$DB_URL' tsx add-superadmin-to-all-companies.ts '$EMAIL'"

EXIT_CODE=$?

# Limpar arquivo temporário
docker exec agilepm-api rm -f /app/prisma/add-superadmin-to-all-companies.ts

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Superadmin adicionado a todas as empresas!${NC}"
    echo ""
    echo "O usuário $EMAIL agora é membro de todas as empresas como ADMIN."
    echo "Faça logout e login novamente para ver todas as empresas."
else
    echo ""
    echo -e "${RED}❌ Falha ao adicionar superadmin às empresas${NC}"
    exit 1
fi

