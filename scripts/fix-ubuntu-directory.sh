#!/bin/bash

# Script para corrigir estrutura de diretórios no Ubuntu
# Uso: ./scripts/fix-ubuntu-directory.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Verificando estrutura de diretórios...${NC}"
echo ""

# Verificar se há pasta duplicada
if [ -d "/opt/apps/agilepm/agilepm" ]; then
    echo -e "${YELLOW}⚠ Pasta duplicada detectada: /opt/apps/agilepm/agilepm${NC}"
    echo -e "${YELLOW}📁 Verificando conteúdo...${NC}"
    
    # Verificar se há .env.production na pasta interna
    if [ -f "/opt/apps/agilepm/agilepm/.env.production" ]; then
        echo -e "${YELLOW}💾 Fazendo backup do .env.production...${NC}"
        cp /opt/apps/agilepm/agilepm/.env.production ~/agilepm.env.backup
        echo -e "${GREEN}✅ Backup salvo${NC}"
    fi
    
    # Mover conteúdo para o nível correto
    echo -e "${YELLOW}📦 Movendo arquivos para o nível correto...${NC}"
    cd /opt/apps/agilepm
    mv agilepm/* . 2>/dev/null || true
    mv agilepm/.* . 2>/dev/null || true
    rmdir agilepm 2>/dev/null || true
    echo -e "${GREEN}✅ Estrutura corrigida${NC}"
fi

# Verificar se está no diretório correto
if [ ! -f "/opt/apps/agilepm/docker-compose.prod.yml" ]; then
    echo -e "${RED}❌ docker-compose.prod.yml não encontrado${NC}"
    echo -e "${YELLOW}📁 Diretório atual: $(pwd)${NC}"
    echo -e "${YELLOW}📁 Conteúdo:${NC}"
    ls -la
    exit 1
fi

echo -e "${GREEN}✅ Estrutura de diretórios OK${NC}"
echo ""
echo "Agora você pode:"
echo "1. Verificar containers: docker compose -f docker-compose.prod.yml --env-file .env.production ps"
echo "2. Iniciar containers: docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
echo "3. Fazer backup (se containers estiverem rodando): ./scripts/backup.sh"
echo ""

