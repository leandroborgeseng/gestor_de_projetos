#!/bin/bash

# Script para verificar e resolver conflitos de porta
# Uso: ./scripts/fix-port-conflict.sh

set -e

echo "🔍 Verificando conflitos de porta..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar porta 80
echo -e "${YELLOW}📌 Verificando porta 80...${NC}"
if lsof -i :80 2>/dev/null || netstat -tuln | grep -q ":80 "; then
    echo -e "${RED}❌ Porta 80 está em uso!${NC}"
    echo ""
    echo "Processos usando a porta 80:"
    lsof -i :80 2>/dev/null || netstat -tulpn | grep ":80 " || echo "Não foi possível identificar"
    echo ""
    echo -e "${YELLOW}💡 Opções para resolver:${NC}"
    echo "1. Parar o serviço que está usando a porta 80"
    echo "2. Usar uma porta alternativa (ex: 8080)"
    echo "3. Verificar se há outro container Docker usando a porta"
    echo ""
    
    # Verificar containers Docker
    echo "Containers Docker usando porta 80:"
    docker ps --format "table {{.Names}}\t{{.Ports}}" | grep ":80" || echo "Nenhum container Docker encontrado"
    echo ""
    
    # Verificar nginx
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Nginx está rodando no sistema${NC}"
        echo "Para parar: sudo systemctl stop nginx"
    fi
    
    # Verificar Apache
    if systemctl is-active --quiet apache2 2>/dev/null || systemctl is-active --quiet httpd 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Apache está rodando no sistema${NC}"
        echo "Para parar: sudo systemctl stop apache2 (ou httpd)"
    fi
    
    exit 1
else
    echo -e "${GREEN}✓ Porta 80 está livre${NC}"
fi

# Verificar porta 4000
echo ""
echo -e "${YELLOW}📌 Verificando porta 4000...${NC}"
if lsof -i :4000 2>/dev/null || netstat -tuln | grep -q ":4000 "; then
    echo -e "${YELLOW}⚠️  Porta 4000 está em uso${NC}"
    lsof -i :4000 2>/dev/null || netstat -tulpn | grep ":4000 " || true
else
    echo -e "${GREEN}✓ Porta 4000 está livre${NC}"
fi

# Verificar porta 5432 (PostgreSQL)
echo ""
echo -e "${YELLOW}📌 Verificando porta 5432 (PostgreSQL)...${NC}"
if lsof -i :5432 2>/dev/null || netstat -tuln | grep -q ":5432 "; then
    echo -e "${YELLOW}⚠️  Porta 5432 está em uso${NC}"
    lsof -i :5432 2>/dev/null || netstat -tulpn | grep ":5432 " || true
else
    echo -e "${GREEN}✓ Porta 5432 está livre${NC}"
fi

echo ""
echo -e "${GREEN}✅ Verificação concluída!${NC}"
