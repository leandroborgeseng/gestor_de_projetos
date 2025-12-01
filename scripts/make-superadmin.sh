#!/bin/bash

# Script para tornar um usuário super admin
# Uso: ./scripts/make-superadmin.sh <email> [senha]

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EMAIL="${1:-leandro.borges@aion.eng.br}"
PASSWORD="${2:-}"

if [ -z "$EMAIL" ]; then
    echo -e "${RED}❌ Email é obrigatório${NC}"
    echo "Uso: ./scripts/make-superadmin.sh <email> [senha]"
    exit 1
fi

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Tornando usuário super admin${NC}"
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

# Copiar script para o container no diretório prisma (onde os módulos estão disponíveis)
echo -e "${YELLOW}📝 Copiando script para o container...${NC}"
docker cp scripts/make-superadmin.ts agilepm-api:/app/prisma/make-superadmin.ts

# Obter DATABASE_URL do container
DB_URL=$(docker exec agilepm-api sh -c 'echo "$DATABASE_URL"' 2>/dev/null || echo "")

if [ -z "$DB_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL não está definida no container${NC}"
    exit 1
fi

# Executar script TypeScript no container de dentro do diretório prisma
echo -e "${YELLOW}🚀 Executando script no container...${NC}"

if [ -z "$PASSWORD" ]; then
    docker exec agilepm-api sh -c "cd /app/prisma && DATABASE_URL='$DB_URL' tsx make-superadmin.ts '$EMAIL'"
else
    docker exec agilepm-api sh -c "cd /app/prisma && DATABASE_URL='$DB_URL' tsx make-superadmin.ts '$EMAIL' '$PASSWORD'"
fi

# Limpar arquivo temporário
docker exec agilepm-api rm -f /app/prisma/make-superadmin.ts

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Usuário $EMAIL agora é SUPERADMIN!${NC}"
    echo ""
    echo "Você pode fazer login com este email."
    if [ -n "$PASSWORD" ]; then
        echo "Senha: $PASSWORD"
    else
        echo "Use a senha que você já tinha configurada."
    fi
else
    echo ""
    echo -e "${RED}❌ Falha ao tornar usuário super admin${NC}"
    exit 1
fi

