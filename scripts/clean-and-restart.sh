#!/bin/bash

# Script para limpar containers corrompidos e reiniciar
# Uso: ./scripts/clean-and-restart.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧹 Limpando containers e reiniciando...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    exit 1
fi

# 1. Parar todos os containers
echo -e "${YELLOW}1️⃣  Parando todos os containers...${NC}"
docker stop agilepm-api agilepm-web agilepm-db 2>/dev/null || true
echo -e "${GREEN}✓ Containers parados${NC}"
echo ""

# 2. Remover containers
echo -e "${YELLOW}2️⃣  Removendo containers...${NC}"
docker rm agilepm-api agilepm-web agilepm-db 2>/dev/null || true
echo -e "${GREEN}✓ Containers removidos${NC}"
echo ""

# 3. Limpar docker-compose
echo -e "${YELLOW}3️⃣  Limpando configuração do docker-compose...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}✓ Configuração limpa${NC}"
echo ""

# 4. Limpar containers órfãos
echo -e "${YELLOW}4️⃣  Limpando containers órfãos...${NC}"
docker container prune -f 2>/dev/null || true
echo -e "${GREEN}✓ Containers órfãos removidos${NC}"
echo ""

# 5. Iniciar serviços
echo -e "${YELLOW}5️⃣  Iniciando serviços...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
echo -e "${GREEN}✓ Serviços iniciados${NC}"
echo ""

# 6. Aguardar serviços
echo -e "${YELLOW}6️⃣  Aguardando serviços estarem prontos...${NC}"
sleep 5

MAX_RETRIES=30
RETRY_COUNT=0

# Aguardar banco
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker exec agilepm-db pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Banco está pronto${NC}"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${YELLOW}⚠️  Timeout aguardando banco${NC}"
  else
    sleep 2
  fi
done

# Aguardar API (verificar se container está rodando)
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
    echo -e "${YELLOW}⚠️  Timeout aguardando API${NC}"
  else
    sleep 2
  fi
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Limpeza e reinício concluídos!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📋 Status dos containers:"
docker ps | grep agilepm || echo -e "${YELLOW}⚠️  Nenhum container encontrado${NC}"
echo ""

