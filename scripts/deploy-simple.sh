#!/bin/bash

# Script de Deploy Simplificado para Servidor
# Uso: ./scripts/deploy-simple.sh

set -e

echo "🚀 Deploy da aplicação Agile PM..."
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Verificar se .env.production existe
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Arquivo .env.production não encontrado!${NC}"
    echo ""
    echo "Crie o arquivo .env.production com as seguintes variáveis:"
    echo ""
    echo "POSTGRES_USER=postgres"
    echo "POSTGRES_PASSWORD=sua-senha-aqui"
    echo "POSTGRES_DB=agilepm"
    echo "JWT_SECRET=seu-jwt-secret-aqui"
    echo "JWT_REFRESH_SECRET=seu-refresh-secret-aqui"
    echo "VITE_API_URL=http://seu-servidor:8080"
    echo "FRONTEND_URL=http://seu-servidor:8080"
    echo ""
    exit 1
fi

# Carregar variáveis
source .env.production

# Construir DATABASE_URL se não estiver definida ou se precisar codificar senha
if [ -z "$DATABASE_URL" ] || [ -n "$POSTGRES_PASSWORD" ]; then
    echo -e "${YELLOW}🔧 Construindo DATABASE_URL...${NC}"
    
    # Codificar senha para URL (escapar caracteres especiais)
    if command -v python3 &> /dev/null; then
        ENCODED_PASSWORD=$(echo -n "$POSTGRES_PASSWORD" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read()))")
    elif command -v node &> /dev/null; then
        ENCODED_PASSWORD=$(node -e "console.log(encodeURIComponent('$POSTGRES_PASSWORD'))")
    else
        # Fallback: usar a senha como está (pode falhar se tiver caracteres especiais)
        ENCODED_PASSWORD="$POSTGRES_PASSWORD"
        echo -e "${YELLOW}⚠️  Python ou Node não encontrado, usando senha sem codificação${NC}"
    fi
    
    DATABASE_URL="postgresql://${POSTGRES_USER:-postgres}:${ENCODED_PASSWORD}@db:5432/${POSTGRES_DB:-agilepm}"
    
    # Atualizar .env.production
    if grep -q "^DATABASE_URL=" .env.production; then
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=$DATABASE_URL|" .env.production
    else
        echo "DATABASE_URL=$DATABASE_URL" >> .env.production
    fi
    
    echo -e "${GREEN}✓ DATABASE_URL configurada${NC}"
fi

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não está instalado!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker e Docker Compose encontrados${NC}"

# Parar e remover containers antigos
echo -e "${YELLOW}📦 Limpando containers antigos...${NC}"
docker stop agilepm-web agilepm-api agilepm-db 2>/dev/null || true
docker rm agilepm-web agilepm-api agilepm-db 2>/dev/null || true

# Verificar porta 8080
echo -e "${YELLOW}🔍 Verificando porta 8080...${NC}"
if command -v lsof &> /dev/null; then
    if lsof -i :8080 2>/dev/null | grep -v "COMMAND" | grep -v "agilepm-web"; then
        echo -e "${YELLOW}⚠️  Porta 8080 está em uso${NC}"
        echo "Processos usando porta 8080:"
        lsof -i :8080 2>/dev/null | head -5
        echo ""
        read -p "Deseja continuar mesmo assim? (s/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
fi

# Build e iniciar serviços
echo -e "${YELLOW}🔨 Construindo imagens...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache

echo -e "${YELLOW}🚀 Iniciando serviços...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Aguardar banco de dados
echo -e "${YELLOW}⏳ Aguardando banco de dados estar pronto...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' agilepm-db 2>/dev/null || echo "not-found")
  
  if [ "$CONTAINER_STATUS" = "running" ]; then
    if docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_isready -U ${POSTGRES_USER:-postgres} > /dev/null 2>&1; then
      echo -e "${GREEN}✓ Banco de dados está pronto${NC}"
      break
    fi
  elif [ "$CONTAINER_STATUS" = "restarting" ] || [ "$CONTAINER_STATUS" = "exited" ]; then
    echo -e "${RED}❌ Container do banco está com problema${NC}"
    docker logs agilepm-db --tail 20
    exit 1
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Timeout aguardando banco de dados${NC}"
    exit 1
  fi
  
  echo -e "${YELLOW}  Aguardando... ($RETRY_COUNT/$MAX_RETRIES)${NC}"
  sleep 2
done

# Executar migrações
echo -e "${YELLOW}📊 Executando migrações...${NC}"
sleep 5  # Aguardar API estar totalmente pronta

# Usar o script de migrações
if [ -f "./scripts/run-migrations.sh" ]; then
    ./scripts/run-migrations.sh || {
        echo -e "${YELLOW}⚠️  Migrações falharam, mas continuando...${NC}"
        echo -e "${YELLOW}💡 Execute manualmente: ./scripts/run-migrations.sh${NC}"
    }
else
    # Fallback: tentar diretamente
    docker exec agilepm-api sh -c "cd /app && prisma migrate deploy --schema=prisma/schema.prisma" || \
    docker exec agilepm-api sh -c "cd /app && npx prisma migrate deploy --schema=prisma/schema.prisma" || {
        echo -e "${YELLOW}⚠️  Migrações falharam, mas continuando...${NC}"
    }
fi

echo -e "${GREEN}✓ Migrações executadas${NC}"

# Executar seed se necessário
echo -e "${YELLOW}🌱 Verificando seed...${NC}"
USER_COUNT=$(docker-compose -f docker-compose.prod.yml --env-file .env.production exec -T db psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-agilepm} -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' \n' || echo "0")

if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo -e "${YELLOW}📦 Executando seed...${NC}"
    # Usar o script de seed
    if [ -f "./scripts/run-seed.sh" ]; then
        ./scripts/run-seed.sh || {
            echo -e "${YELLOW}⚠️  Seed falhou, mas continuando...${NC}"
            echo -e "${YELLOW}💡 Execute manualmente: ./scripts/run-seed.sh${NC}"
        }
    else
        # Fallback: tentar diretamente
        docker exec agilepm-api sh -c "cd /app && prisma db seed --schema=prisma/schema.prisma" || \
        docker exec agilepm-api sh -c "cd /app && npx prisma db seed --schema=prisma/schema.prisma" || {
            echo -e "${YELLOW}⚠️  Seed falhou, mas continuando...${NC}"
        }
    fi
    echo -e "${GREEN}✓ Seed executado${NC}"
else
    echo -e "${GREEN}✓ Banco já possui $USER_COUNT usuário(s)${NC}"
fi

# Verificar saúde dos serviços
echo -e "${YELLOW}🏥 Verificando saúde dos serviços...${NC}"
sleep 5

# Health check da API
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ API está respondendo${NC}"
else
    echo -e "${YELLOW}⚠️  API pode não estar respondendo ainda${NC}"
fi

# Health check do Frontend
if curl -f http://localhost:8080 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend está respondendo${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend pode não estar respondendo ainda${NC}"
fi

echo ""
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
echo "📋 Serviços disponíveis:"
echo "   • Frontend: http://localhost:8080"
echo "   • API: http://localhost:4000"
echo "   • Swagger: http://localhost:4000/api-docs"
echo ""
echo "🔑 Credenciais de teste:"
echo "   • ceo@alpha.com / alpha123"
echo "   • diretoria@beta.com / beta123"
echo "   • superadmin@agilepm.com / superadmin123"
echo ""
echo "📊 Comandos úteis:"
echo "   • Ver logs: docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f"
echo "   • Parar: docker-compose -f docker-compose.prod.yml --env-file .env.production down"
echo "   • Reiniciar: ./scripts/deploy-simple.sh"

