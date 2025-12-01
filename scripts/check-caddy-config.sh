#!/bin/bash

# Script para verificar configuração do Caddy
# Uso: ./scripts/check-caddy-config.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Verificando configuração do Caddy${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Verificar se Caddy está rodando
echo -e "${YELLOW}1️⃣  Verificando container do Caddy...${NC}"
if docker ps | grep -q caddy; then
    echo -e "${GREEN}✓ Caddy está rodando${NC}"
    docker ps | grep caddy
else
    echo -e "${RED}❌ Caddy não está rodando${NC}"
    exit 1
fi
echo ""

# 2. Verificar rede do Caddy
echo -e "${YELLOW}2️⃣  Verificando rede do Caddy...${NC}"
CADDY_NETWORKS=$(docker inspect aion-caddy 2>/dev/null | grep -A 5 "Networks" | grep -o '"[^"]*"' | tr -d '"' | grep -v "Networks" || echo "")
echo "Redes do Caddy: $CADDY_NETWORKS"

# Verificar se agilepm-web está na mesma rede
AGILEPM_NETWORKS=$(docker inspect agilepm-web 2>/dev/null | grep -A 5 "Networks" | grep -o '"[^"]*"' | tr -d '"' | grep -v "Networks" || echo "")
echo "Redes do agilepm-web: $AGILEPM_NETWORKS"

if [ -n "$CADDY_NETWORKS" ] && [ -n "$AGILEPM_NETWORKS" ]; then
    if echo "$CADDY_NETWORKS" | grep -q "$AGILEPM_NETWORKS"; then
        echo -e "${GREEN}✓ Caddy e agilepm-web estão na mesma rede${NC}"
    else
        echo -e "${RED}❌ Caddy e agilepm-web NÃO estão na mesma rede${NC}"
        echo -e "${YELLOW}💡 Eles precisam estar na mesma rede Docker para se comunicarem${NC}"
    fi
fi
echo ""

# 3. Verificar se Caddy consegue acessar agilepm-web
echo -e "${YELLOW}3️⃣  Testando acesso do Caddy ao agilepm-web...${NC}"
if docker exec aion-caddy wget -q -O- http://agilepm-web:80 2>/dev/null | head -c 100 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Caddy consegue acessar agilepm-web${NC}"
elif docker exec aion-caddy curl -s http://agilepm-web:80 2>/dev/null | head -c 100 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Caddy consegue acessar agilepm-web (via curl)${NC}"
else
    echo -e "${RED}❌ Caddy NÃO consegue acessar agilepm-web${NC}"
    echo -e "${YELLOW}💡 Verificando se estão na mesma rede...${NC}"
    
    # Tentar ping
    if docker exec aion-caddy ping -c 1 agilepm-web 2>/dev/null > /dev/null; then
        echo -e "${GREEN}✓ Caddy consegue fazer ping no agilepm-web${NC}"
    else
        echo -e "${RED}❌ Caddy NÃO consegue fazer ping no agilepm-web${NC}"
        echo -e "${YELLOW}💡 Eles precisam estar na mesma rede Docker${NC}"
    fi
fi
echo ""

# 4. Verificar logs do Caddy
echo -e "${YELLOW}4️⃣  Verificando logs do Caddy...${NC}"
docker logs aion-caddy --tail 30 2>&1 | grep -i "pm.aion\|agilepm\|error\|502" || echo "Nenhum log relacionado encontrado"
echo ""

# 5. Verificar configuração do Caddy
echo -e "${YELLOW}5️⃣  Verificando configuração do Caddy...${NC}"
CADDY_CONFIG_PATH=$(docker inspect aion-caddy 2>/dev/null | grep -i "Caddyfile\|config" | head -5 || echo "")
echo "Configuração do Caddy: $CADDY_CONFIG_PATH"

# Tentar encontrar arquivo de configuração
if [ -f "/opt/caddy/Caddyfile" ]; then
    echo -e "${GREEN}✓ Arquivo de configuração encontrado: /opt/caddy/Caddyfile${NC}"
    echo -e "${YELLOW}Conteúdo relacionado a pm.aion.eng.br:${NC}"
    grep -A 10 "pm.aion.eng.br" /opt/caddy/Caddyfile 2>/dev/null || echo "Não encontrado"
elif [ -f "/etc/caddy/Caddyfile" ]; then
    echo -e "${GREEN}✓ Arquivo de configuração encontrado: /etc/caddy/Caddyfile${NC}"
    echo -e "${YELLOW}Conteúdo relacionado a pm.aion.eng.br:${NC}"
    grep -A 10 "pm.aion.eng.br" /etc/caddy/Caddyfile 2>/dev/null || echo "Não encontrado"
else
    echo -e "${YELLOW}⚠️  Arquivo de configuração não encontrado nos locais padrão${NC}"
    echo -e "${YELLOW}💡 Verifique onde o Caddy está montando o arquivo de configuração${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ Verificação concluída${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

