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
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Verificar se o container está rodando (não restarting)
  CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' agilepm-db 2>/dev/null || echo "not-found")
  
  if [ "$CONTAINER_STATUS" = "running" ]; then
    # Tentar conectar ao banco
    if docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_isready -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Banco de dados está pronto${NC}"
      break
    fi
  elif [ "$CONTAINER_STATUS" = "restarting" ] || [ "$CONTAINER_STATUS" = "exited" ]; then
    echo -e "${RED}❌ Container do banco está com problema (status: $CONTAINER_STATUS)${NC}"
    echo -e "${YELLOW}📋 Últimos logs do banco:${NC}"
    docker logs agilepm-db --tail 20 2>&1 || true
    echo ""
    echo -e "${YELLOW}💡 Possíveis causas:${NC}"
    echo "  1. POSTGRES_PASSWORD não está definido no .env.production"
    echo "  2. Problema com permissões do volume"
    echo "  3. Dados corrompidos no volume"
    echo ""
    echo -e "${YELLOW}💡 Para resolver:${NC}"
    echo "  1. Verificar .env.production tem POSTGRES_PASSWORD"
    echo "  2. Parar: docker compose -f docker-compose.prod.yml --env-file .env.production down"
    echo "  3. Remover volume (CUIDADO - apaga dados): docker volume rm agilepm_postgres_data"
    echo "  4. Tentar deploy novamente"
    exit 1
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Timeout aguardando banco de dados${NC}"
    echo -e "${YELLOW}📋 Logs do banco de dados:${NC}"
    docker logs agilepm-db --tail 30 2>&1 || true
    exit 1
  fi
  
  echo -e "${YELLOW}  Aguardando... ($RETRY_COUNT/$MAX_RETRIES)${NC}"
  sleep 2
done

# Executar migrações
echo -e "${YELLOW}📊 Executando migrações do banco de dados...${NC}"
sleep 3  # Aguardar um pouco mais para garantir que está totalmente pronto

docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma migrate deploy || {
    echo -e "${RED}❌ Erro ao executar migrações${NC}"
    echo -e "${YELLOW}📋 Logs da API:${NC}"
    docker logs agilepm-api --tail 20 2>&1 || true
    echo -e "${YELLOW}📋 Logs do banco:${NC}"
    docker logs agilepm-db --tail 20 2>&1 || true
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

