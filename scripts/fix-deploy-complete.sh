#!/bin/bash

# Script completo para corrigir deploy
# Uso: ./scripts/fix-deploy-complete.sh

set -e

echo "🔧 Corrigindo deploy completo..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

# 1. Limpar containers
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  Limpando containers...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker stop agilepm-api agilepm-web agilepm-db 2>/dev/null || true
docker rm agilepm-api agilepm-web agilepm-db 2>/dev/null || true
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Containers limpos${NC}"
echo ""

# 2. Alterar senha do banco
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  Alterando senha do banco...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
NEW_PASSWORD="agilepm2024"

# Atualizar senha no .env.production
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$NEW_PASSWORD|" .env.production

# Construir DATABASE_URL
NEW_DATABASE_URL="postgresql://postgres:${NEW_PASSWORD}@db:5432/agilepm"

# Atualizar DATABASE_URL
if grep -q "^DATABASE_URL=" .env.production; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_DATABASE_URL|" .env.production
else
    echo "DATABASE_URL=$NEW_DATABASE_URL" >> .env.production
fi

echo -e "${GREEN}✓ .env.production atualizado${NC}"
echo ""

# 3. Iniciar banco
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3️⃣  Iniciando banco de dados...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d db

# Aguardar banco estar pronto
echo -e "${YELLOW}⏳ Aguardando banco estar pronto...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker exec agilepm-db pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Banco está pronto${NC}"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Timeout aguardando banco${NC}"
    exit 1
  fi
  sleep 2
done

# Alterar senha no PostgreSQL
echo -e "${YELLOW}Alterando senha no PostgreSQL...${NC}"
docker exec agilepm-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_PASSWORD';" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Não foi possível alterar senha (pode já estar correta)${NC}"
}
echo ""

# 4. Iniciar API
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4️⃣  Iniciando API...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d api
sleep 5
echo -e "${GREEN}✓ API iniciada${NC}"
echo ""

# 5. Executar migrações
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5️⃣  Executando migrações...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ -f scripts/run-migrations.sh ]; then
    ./scripts/run-migrations.sh
else
    echo -e "${YELLOW}⚠️  Script de migrações não encontrado${NC}"
fi
echo ""

# 6. Executar seed
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6️⃣  Executando seed...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
if [ -f scripts/run-seed.sh ]; then
    ./scripts/run-seed.sh
else
    echo -e "${YELLOW}⚠️  Script de seed não encontrado${NC}"
fi
echo ""

# 7. Iniciar Web
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}7️⃣  Iniciando Frontend...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d web
echo -e "${GREEN}✓ Frontend iniciado${NC}"
echo ""

# 8. Verificar status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}8️⃣  Verificando status...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
sleep 3
docker ps | grep agilepm || echo -e "${YELLOW}⚠️  Nenhum container encontrado${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deploy corrigido com sucesso!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Informações:"
echo "  • Senha do banco: $NEW_PASSWORD"
echo "  • Frontend: http://localhost:8080"
echo "  • API: http://localhost:4000"
echo ""
echo "📋 Credenciais de teste:"
echo "  • superadmin@agilepm.com / superadmin123"
echo "  • ceo@alpha.com / alpha123"
echo ""

