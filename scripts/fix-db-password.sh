#!/bin/bash

# Script para alterar senha do PostgreSQL para uma mais simples
# Uso: ./scripts/fix-db-password.sh

set -e

echo "🔧 Alterando senha do PostgreSQL para uma mais simples..."
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

# Gerar nova senha simples (sem caracteres especiais problemáticos)
NEW_PASSWORD="agilepm2024"

echo -e "${YELLOW}⚠️  ATENÇÃO: Isso vai alterar a senha do banco de dados!${NC}"
echo -e "${YELLOW}Nova senha será: $NEW_PASSWORD${NC}"
echo ""
read -p "Deseja continuar? (s/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    exit 1
fi

# Atualizar senha no .env.production
sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$NEW_PASSWORD|" .env.production

# Construir DATABASE_URL (senha simples não precisa codificação)
NEW_DATABASE_URL="postgresql://postgres:${NEW_PASSWORD}@db:5432/agilepm"

# Atualizar DATABASE_URL
if grep -q "^DATABASE_URL=" .env.production; then
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$NEW_DATABASE_URL|" .env.production
else
    echo "DATABASE_URL=$NEW_DATABASE_URL" >> .env.production
fi

echo -e "${GREEN}✓ .env.production atualizado${NC}"

# Alterar senha no PostgreSQL
echo ""
echo -e "${YELLOW}Alterando senha no PostgreSQL...${NC}"
docker exec agilepm-db psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_PASSWORD';" 2>/dev/null || {
    echo -e "${YELLOW}⚠️  Não foi possível alterar senha (pode já estar correta)${NC}"
}

# Reiniciar containers
echo ""
echo -e "${YELLOW}Reiniciando containers...${NC}"
docker stop agilepm-api agilepm-db 2>/dev/null || true
docker rm agilepm-api agilepm-db 2>/dev/null || true

# Iniciar banco primeiro
echo -e "${YELLOW}Iniciando banco de dados...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d db

# Aguardar banco estar pronto
echo -e "${YELLOW}Aguardando banco estar pronto...${NC}"
sleep 5
MAX_RETRIES=30
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker exec agilepm-db pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Banco está pronto${NC}"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  sleep 2
done

# Iniciar API
echo -e "${YELLOW}Iniciando API...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d api

echo ""
echo -e "${GREEN}✅ Senha alterada!${NC}"
echo ""
echo "Nova senha: $NEW_PASSWORD"
echo "DATABASE_URL: postgresql://postgres:***@db:5432/agilepm"
echo ""
echo "Agora execute:"
echo "  ./scripts/run-migrations.sh"
echo "  ./scripts/run-seed.sh"

