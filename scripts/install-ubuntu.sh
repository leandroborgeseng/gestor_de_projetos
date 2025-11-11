#!/bin/bash

# Script de Instalação para Ubuntu 24
# Uso: ./scripts/install-ubuntu.sh

set -e

echo "🐧 Instalando dependências no Ubuntu 24..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se está rodando como root ou com sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠ Este script precisa de privilégios sudo${NC}"
    echo "Execute: sudo ./scripts/install-ubuntu.sh"
    exit 1
fi

echo -e "${YELLOW}📦 Atualizando sistema...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}📦 Instalando pacotes essenciais...${NC}"
apt install -y curl wget git ufw software-properties-common

echo -e "${YELLOW}🐳 Instalando Docker...${NC}"

# Verificar se Docker já está instalado
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker já está instalado${NC}"
else
    # Adicionar repositório Docker
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt update
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Verificar instalação
if docker --version &> /dev/null; then
    echo -e "${GREEN}✓ Docker instalado: $(docker --version)${NC}"
else
    echo -e "${RED}❌ Erro ao instalar Docker${NC}"
    exit 1
fi

if docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose instalado: $(docker compose version)${NC}"
else
    echo -e "${RED}❌ Erro ao instalar Docker Compose${NC}"
    exit 1
fi

# Adicionar usuário atual ao grupo docker (se não for root)
if [ "$SUDO_USER" ]; then
    echo -e "${YELLOW}👤 Adicionando usuário $SUDO_USER ao grupo docker...${NC}"
    usermod -aG docker $SUDO_USER
    echo -e "${GREEN}✓ Usuário adicionado ao grupo docker${NC}"
    echo -e "${YELLOW}⚠ Faça logout e login novamente para aplicar as mudanças${NC}"
fi

echo ""
echo -e "${GREEN}✅ Instalação concluída!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Configure o arquivo .env.production"
echo "2. Execute: ./scripts/deploy.sh"
echo ""

