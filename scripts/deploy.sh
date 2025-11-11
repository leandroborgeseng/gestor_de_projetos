#!/bin/bash

# Script de Deploy para Produção
# Uso: ./scripts/deploy.sh

set -e

echo "🚀 Iniciando deploy da aplicação..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se o arquivo .env.production existe
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    echo "Copie .env.production.example para .env.production e configure as variáveis."
    exit 1
fi

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    exit 1
fi

# Verificar se Docker Compose está instalado
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não está instalado!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker e Docker Compose encontrados${NC}"

# Parar containers existentes
echo -e "${YELLOW}📦 Parando containers existentes...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production down || true

# Build das imagens
echo -e "${YELLOW}🔨 Construindo imagens Docker...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

# Iniciar serviços
echo -e "${YELLOW}🚀 Iniciando serviços...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Aguardar banco de dados estar pronto
echo -e "${YELLOW}⏳ Aguardando banco de dados estar pronto...${NC}"
sleep 10

# Executar migrações
echo -e "${YELLOW}📊 Executando migrações do banco de dados...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma migrate deploy || {
    echo -e "${RED}❌ Erro ao executar migrações${NC}"
    exit 1
}

# Verificar saúde dos serviços
echo -e "${YELLOW}🏥 Verificando saúde dos serviços...${NC}"
sleep 5

# Health check da API
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API está respondendo${NC}"
else
    echo -e "${RED}❌ API não está respondendo${NC}"
    docker-compose -f docker-compose.prod.yml --env-file .env.production logs api
    exit 1
fi

# Health check do Frontend
if curl -f http://localhost:80 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend está respondendo${NC}"
else
    echo -e "${YELLOW}⚠ Frontend pode não estar respondendo ainda${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo "📋 Serviços disponíveis:"
echo "   • Frontend: http://localhost:80"
echo "   • API: http://localhost:4000"
echo "   • Swagger: http://localhost:4000/api-docs"
echo ""
echo "📊 Para ver logs:"
echo "   docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f"
echo ""
echo "🛑 Para parar os serviços:"
echo "   docker-compose -f docker-compose.prod.yml --env-file .env.production down"

