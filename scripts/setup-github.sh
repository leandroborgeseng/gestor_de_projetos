#!/bin/bash

# Script para configurar autenticação GitHub
# Uso: ./scripts/setup-github.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Configurando autenticação GitHub...${NC}"
echo ""

# Verificar se GitHub CLI está instalado
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}📦 GitHub CLI não encontrado. Instalando...${NC}"
    
    # Verificar se Homebrew está instalado
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}❌ Homebrew não está instalado${NC}"
        echo "Instale o Homebrew primeiro: https://brew.sh"
        exit 1
    fi
    
    brew install gh
    echo -e "${GREEN}✅ GitHub CLI instalado${NC}"
else
    echo -e "${GREEN}✅ GitHub CLI já está instalado${NC}"
fi

echo ""
echo -e "${YELLOW}🔑 Fazendo login no GitHub...${NC}"
echo "Siga as instruções na tela para autenticar."
echo ""

# Fazer login
gh auth login

echo ""
echo -e "${GREEN}✅ Autenticação configurada!${NC}"
echo ""
echo "Agora você pode fazer push normalmente:"
echo "  git push -u origin main"
echo ""

