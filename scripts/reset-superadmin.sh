#!/bin/bash

# Script para resetar senha e garantir que o usuário seja super admin
# Uso: ./scripts/reset-superadmin.sh <email> <nova_senha>

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMAIL="${1:-superadmin@agilepm.com}"
PASSWORD="${2:-}"

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Email é obrigatório${NC}"
    echo "Uso: ./scripts/reset-superadmin.sh <email> <nova_senha>"
    exit 1
fi

if [ -z "$PASSWORD" ]; then
    echo -e "${RED}❌ Nova senha é obrigatória${NC}"
    echo "Uso: ./scripts/reset-superadmin.sh <email> <nova_senha>"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 Resetando senha e configurando super admin${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Email: $EMAIL"
echo ""

# Verificar se o container da API está rodando
if ! docker ps | grep -q agilepm-api; then
    echo -e "${RED}❌ Container da API não está rodando${NC}"
    echo -e "${YELLOW}💡 Tentando iniciar containers...${NC}"
    docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
    sleep 5
    if ! docker ps | grep -q agilepm-api; then
        echo -e "${RED}❌ Falha ao iniciar containers${NC}"
        exit 1
    fi
fi

# Primeiro, resetar senha e tornar super admin
echo -e "${YELLOW}📝 Copiando script para o container...${NC}"
docker cp scripts/make-superadmin.ts agilepm-api:/app/prisma/make-superadmin.ts

# Obter DATABASE_URL do container
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Executar script para tornar super admin (isso também atualiza a senha se fornecida)
echo -e "${YELLOW}🚀 Configurando usuário como super admin e resetando senha...${NC}"
docker exec agilepm-api sh -c "cd /app/prisma && DATABASE_URL='$DB_URL' tsx make-superadmin.ts '$EMAIL' '$PASSWORD'"

EXIT_CODE=$?

# Limpar arquivo temporário
docker exec agilepm-api rm -f /app/prisma/make-superadmin.ts

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Usuário configurado com sucesso!${NC}"
    echo ""
    echo "Email: $EMAIL"
    echo "Senha: $PASSWORD"
    echo "Role: SUPERADMIN"
    echo ""
    echo "Você pode fazer login com estas credenciais."
else
    echo ""
    echo -e "${RED}❌ Falha ao configurar usuário${NC}"
    exit 1
fi

