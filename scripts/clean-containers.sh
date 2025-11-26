#!/bin/bash

# Script para limpar containers e volumes corrompidos
# Uso: ./scripts/clean-containers.sh

set -e

echo "🧹 Limpando containers e volumes..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parar todos os containers relacionados
echo -e "${YELLOW}🛑 Parando containers...${NC}"
docker stop agilepm-api agilepm-web agilepm-db 2>/dev/null || true

# Remover containers
echo -e "${YELLOW}🗑️  Removendo containers...${NC}"
docker rm agilepm-api agilepm-web agilepm-db 2>/dev/null || true

# Remover containers órfãos (parados)
echo -e "${YELLOW}🧹 Removendo containers órfãos...${NC}"
docker container prune -f

# Remover volumes órfãos (cuidado: isso remove dados não usados)
echo -e "${YELLOW}⚠️  Removendo volumes órfãos...${NC}"
read -p "Deseja remover volumes órfãos? Isso pode remover dados não usados (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    docker volume prune -f
fi

# Limpar imagens não usadas (opcional)
echo -e "${YELLOW}🖼️  Removendo imagens não usadas...${NC}"
read -p "Deseja remover imagens não usadas? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    docker image prune -f
fi

# Forçar remoção do docker-compose (se houver problemas)
echo -e "${YELLOW}🔧 Limpando configuração do docker-compose...${NC}"
docker-compose -f docker-compose.prod.yml down --remove-orphans 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ Limpeza concluída!${NC}"
echo ""
echo "Agora você pode iniciar os containers:"
echo "  ./scripts/start-containers.sh"

