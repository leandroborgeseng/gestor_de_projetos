#!/bin/bash

# Script para conectar Caddy à rede do AgilePM
# Uso: ./scripts/fix-caddy-connection.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Conectando Caddy à rede do AgilePM${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 1. Verificar rede do AgilePM
echo -e "${YELLOW}1️⃣  Verificando rede do AgilePM...${NC}"
AGILEPM_NETWORK=$(docker inspect agilepm-web 2>/dev/null | grep -A 10 "Networks" | grep -o '"[^"]*"' | tr -d '"' | grep -v "Networks" | head -1 || echo "")

if [ -z "$AGILEPM_NETWORK" ]; then
    echo -e "${RED}❌ Não foi possível identificar a rede do AgilePM${NC}"
    echo -e "${YELLOW}💡 Verificando manualmente...${NC}"
    docker network ls | grep agilepm || echo "Nenhuma rede agilepm encontrada"
    exit 1
fi

echo -e "${GREEN}✓ Rede do AgilePM: $AGILEPM_NETWORK${NC}"
echo ""

# 2. Verificar se Caddy está na mesma rede
echo -e "${YELLOW}2️⃣  Verificando se Caddy está na mesma rede...${NC}"
CADDY_IN_NETWORK=$(docker inspect aion-caddy 2>/dev/null | grep -A 10 "Networks" | grep -o "$AGILEPM_NETWORK" || echo "")

if [ -n "$CADDY_IN_NETWORK" ]; then
    echo -e "${GREEN}✓ Caddy já está na rede $AGILEPM_NETWORK${NC}"
else
    echo -e "${YELLOW}⚠️  Caddy NÃO está na rede $AGILEPM_NETWORK${NC}"
    echo -e "${YELLOW}Conectando Caddy à rede...${NC}"
    
    # Conectar Caddy à rede
    docker network connect "$AGILEPM_NETWORK" aion-caddy 2>/dev/null && {
        echo -e "${GREEN}✓ Caddy conectado à rede $AGILEPM_NETWORK${NC}"
    } || {
        echo -e "${RED}❌ Erro ao conectar Caddy à rede${NC}"
        echo -e "${YELLOW}💡 Pode ser necessário reiniciar o Caddy${NC}"
    }
fi
echo ""

# 3. Verificar se Caddy consegue acessar agilepm-web
echo -e "${YELLOW}3️⃣  Testando acesso do Caddy ao agilepm-web...${NC}"
sleep 2  # Aguardar conexão de rede

if docker exec aion-caddy wget -q -O- http://agilepm-web:80 2>/dev/null | head -c 100 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Caddy consegue acessar agilepm-web${NC}"
elif docker exec aion-caddy curl -s http://agilepm-web:80 2>/dev/null | head -c 100 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Caddy consegue acessar agilepm-web (via curl)${NC}"
else
    echo -e "${YELLOW}⚠️  Caddy ainda não consegue acessar agilepm-web${NC}"
    echo -e "${YELLOW}💡 Pode ser necessário reiniciar o Caddy${NC}"
    echo -e "${YELLOW}💡 Ou verificar a configuração do Caddyfile${NC}"
fi
echo ""

# 4. Verificar configuração do Caddy
echo -e "${YELLOW}4️⃣  Verificando configuração do Caddy para pm.aion.eng.br...${NC}"
echo -e "${YELLOW}💡 O Caddyfile precisa ter algo como:${NC}"
echo ""
echo "pm.aion.eng.br {"
echo "    reverse_proxy agilepm-web:80"
echo "}"
echo ""

# Verificar se existe configuração
if docker exec aion-caddy cat /etc/caddy/Caddyfile 2>/dev/null | grep -q "pm.aion.eng.br"; then
    echo -e "${GREEN}✓ Configuração encontrada no Caddyfile${NC}"
    docker exec aion-caddy cat /etc/caddy/Caddyfile 2>/dev/null | grep -A 5 "pm.aion.eng.br"
else
    echo -e "${YELLOW}⚠️  Configuração para pm.aion.eng.br não encontrada${NC}"
    echo -e "${YELLOW}💡 Você precisa adicionar a configuração no Caddyfile${NC}"
    echo -e "${YELLOW}💡 Veja o exemplo em: caddy/Caddyfile.example${NC}"
fi
echo ""

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}✅ Processo concluído${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo "1. Se o Caddy foi conectado à rede, reinicie o Caddy:"
echo "   docker restart aion-caddy"
echo ""
echo "2. Verifique se o Caddyfile tem a configuração para pm.aion.eng.br"
echo ""
echo "3. Teste novamente: https://pm.aion.eng.br"

