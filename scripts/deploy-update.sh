#!/bin/bash

# Script para atualizar aplicação em produção
# Uso: ./scripts/deploy-update.sh

set -e

echo "🚀 Atualizando aplicação em produção..."
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

# 1. Atualizar código do GitHub
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1️⃣  Atualizando código do GitHub...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
git pull origin main || {
    echo -e "${YELLOW}⚠️  Não foi possível fazer pull. Continuando com código local...${NC}"
}
echo -e "${GREEN}✓ Código atualizado${NC}"
echo ""

# 2. Reconstruir containers
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2️⃣  Reconstruindo containers...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Reconstruir API
echo -e "${YELLOW}📦 Reconstruindo API...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production build api

# Reconstruir Web
echo -e "${YELLOW}📦 Reconstruindo Frontend...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production build web

echo -e "${GREEN}✓ Containers reconstruídos${NC}"
echo ""

# 3. Reiniciar serviços
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3️⃣  Reiniciando serviços...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Parar e remover containers antigos (incluindo corrompidos)
echo -e "${YELLOW}🛑 Parando containers antigos...${NC}"
docker stop agilepm-api agilepm-web 2>/dev/null || true
docker rm agilepm-api agilepm-web 2>/dev/null || true

# Limpar containers órfãos e corrompidos
echo -e "${YELLOW}🧹 Limpando containers corrompidos...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production down --remove-orphans 2>/dev/null || true

# Remover containers órfãos manualmente
docker container prune -f 2>/dev/null || true

# Iniciar novos containers
echo -e "${YELLOW}🚀 Iniciando novos containers...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d api web

echo -e "${GREEN}✓ Serviços reiniciados${NC}"
echo ""

# 4. Aguardar serviços estarem prontos
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4️⃣  Aguardando serviços estarem prontos...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

MAX_RETRIES=30
RETRY_COUNT=0

# Aguardar API (verificar se container está rodando)
echo -e "${YELLOW}⏳ Aguardando API...${NC}"
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker ps | grep -q agilepm-api; then
    CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' agilepm-api 2>/dev/null || echo "not-found")
    if [ "$CONTAINER_STATUS" = "running" ]; then
      echo -e "${GREEN}✓ API está rodando${NC}"
      break
    fi
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${YELLOW}⚠️  Timeout aguardando API (mas pode estar funcionando)${NC}"
  else
    sleep 2
  fi
done

# Aguardar Web
echo -e "${YELLOW}⏳ Aguardando Frontend...${NC}"
sleep 3
if docker ps | grep -q agilepm-web; then
  echo -e "${GREEN}✓ Frontend está rodando${NC}"
else
  echo -e "${YELLOW}⚠️  Frontend pode não estar rodando${NC}"
fi

echo ""

# 5. Verificar status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5️⃣  Verificando status...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker ps | grep agilepm || echo -e "${YELLOW}⚠️  Nenhum container encontrado${NC}"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Informações:"
echo "  • Frontend: http://localhost:8080"
echo "  • API: http://localhost:4000"
echo ""
echo "📋 Novas funcionalidades:"
echo "  • Importação de projetos do Monday.com via Excel"
echo "  • Rate limiting ajustado (mais generoso)"
echo "  • Scripts de gerenciamento de usuários super admin"
echo ""

