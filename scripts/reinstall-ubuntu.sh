#!/bin/bash

# Script para reinstalar o projeto no Ubuntu
# Uso: ./scripts/reinstall-ubuntu.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_DIR="/opt/apps/agilepm"
ENV_BACKUP="$HOME/agilepm.env.backup"

echo -e "${BLUE}🔄 Reinstalação do Agile PM no Ubuntu${NC}"
echo ""

# Verificar se a pasta existe
if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}📁 Pasta encontrada: $PROJECT_DIR${NC}"
    
    # Fazer backup do .env.production
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        echo -e "${YELLOW}💾 Fazendo backup do .env.production...${NC}"
        cp "$PROJECT_DIR/.env.production" "$ENV_BACKUP"
        echo -e "${GREEN}✅ Backup salvo em: $ENV_BACKUP${NC}"
    else
        echo -e "${YELLOW}⚠ Arquivo .env.production não encontrado${NC}"
    fi
    
    # Parar containers
    echo -e "${YELLOW}🛑 Parando containers...${NC}"
    cd "$PROJECT_DIR"
    if [ -f "docker-compose.prod.yml" ] && [ -f ".env.production" ]; then
        docker compose -f docker-compose.prod.yml --env-file .env.production down -v || true
    fi
    
    # Remover pasta
    echo -e "${YELLOW}🗑️ Removendo pasta...${NC}"
    cd /opt/apps
    sudo rm -rf agilepm
    echo -e "${GREEN}✅ Pasta removida${NC}"
else
    echo -e "${YELLOW}⚠ Pasta não encontrada: $PROJECT_DIR${NC}"
fi

# Clonar repositório
echo -e "${YELLOW}📥 Clonando repositório...${NC}"
cd /opt/apps
sudo git clone https://github.com/leandroborgeseng/gestor_de_projetos.git agilepm
sudo chown -R $USER:$USER /opt/apps/agilepm
cd agilepm
echo -e "${GREEN}✅ Repositório clonado${NC}"

# Restaurar .env.production
if [ -f "$ENV_BACKUP" ]; then
    echo -e "${YELLOW}📋 Restaurando .env.production...${NC}"
    cp "$ENV_BACKUP" .env.production
    echo -e "${GREEN}✅ .env.production restaurado${NC}"
else
    echo -e "${YELLOW}⚠ Backup do .env.production não encontrado${NC}"
    echo -e "${YELLOW}📝 Criando .env.production do exemplo...${NC}"
    if [ -f "env.production.COMPLETO" ]; then
        cp env.production.COMPLETO .env.production
        echo -e "${GREEN}✅ .env.production criado do exemplo${NC}"
        echo -e "${YELLOW}⚠ IMPORTANTE: Edite o .env.production com os valores corretos!${NC}"
    else
        echo -e "${RED}❌ Arquivo env.production.COMPLETO não encontrado${NC}"
        echo -e "${YELLOW}📝 Crie o .env.production manualmente${NC}"
    fi
fi

# Dar permissões aos scripts
echo -e "${YELLOW}🔧 Configurando permissões...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✅ Permissões configuradas${NC}"

echo ""
echo -e "${GREEN}✅ Reinstalação concluída!${NC}"
echo ""
echo "Próximos passos:"
echo "1. Verificar/editar .env.production:"
echo "   nano .env.production"
echo ""
echo "2. Fazer deploy:"
echo "   ./scripts/deploy.sh"
echo ""
echo "3. Ou manualmente:"
echo "   docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache"
echo "   docker compose -f docker-compose.prod.yml --env-file .env.production up -d"
echo "   docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma migrate deploy"
echo ""

