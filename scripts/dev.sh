#!/bin/bash

# Script para iniciar a aplicação em modo desenvolvimento
# Uso: ./scripts/dev.sh

set -e

echo "🚀 Iniciando aplicação em modo desenvolvimento..."
echo ""

# Verificar se estamos na raiz do projeto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script da raiz do projeto!"
    exit 1
fi

# 1. Verificar/Criar arquivo .env
if [ ! -f ".env" ]; then
    echo "📝 Criando arquivo .env..."
    cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agilepm
JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-key-change-in-production
PORT=4000
FRONTEND_URL=http://localhost:3000
EOF
    echo "✅ Arquivo .env criado!"
else
    echo "✅ Arquivo .env já existe"
fi
echo ""

# 2. Verificar se pnpm está instalado
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm não está instalado!"
    echo "Instale com: npm install -g pnpm"
    exit 1
fi

# 3. Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    pnpm install
    echo "✅ Dependências instaladas!"
else
    echo "✅ Dependências já instaladas"
fi
echo ""

# 4. Verificar Docker
if ! docker info &> /dev/null; then
    echo "❌ Docker não está rodando!"
    echo "Por favor, inicie o Docker Desktop e tente novamente."
    exit 1
fi

# 5. Iniciar banco de dados
echo "🐘 Iniciando PostgreSQL..."
if docker ps | grep -q "agilepm.*db\|postgres.*agilepm"; then
    echo "✅ Banco de dados já está rodando"
else
    docker-compose up -d db
    echo "⏳ Aguardando banco de dados ficar pronto..."
    sleep 5
    
    # Verificar se o banco está realmente pronto
    for i in {1..30}; do
        if docker exec $(docker ps -q -f name=agilepm.*db) pg_isready -U postgres &> /dev/null; then
            echo "✅ Banco de dados pronto!"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "⚠️  Banco de dados pode não estar totalmente pronto, mas continuando..."
        fi
        sleep 1
    done
fi
echo ""

# 6. Configurar banco de dados
echo "🔧 Configurando banco de dados..."
cd apps/api

# Gerar Prisma Client
echo "📦 Gerando Prisma Client..."
pnpm prisma generate

# Executar migrações
echo "🔄 Executando migrações..."
pnpm prisma migrate deploy || pnpm prisma migrate dev --name init

# Verificar se precisa fazer seed
echo "🌱 Verificando seed..."
USER_COUNT=$(pnpm prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | grep -o '[0-9]' | head -1 || echo "0")
if [ "$USER_COUNT" = "0" ] || [ -z "$USER_COUNT" ]; then
    echo "🌱 Executando seed..."
    pnpm prisma db seed
else
    echo "✅ Banco já possui dados"
fi

cd ../..
echo ""

# 7. Iniciar aplicação
echo "🎯 Iniciando aplicação..."
echo ""
echo "📌 A aplicação será iniciada em modo desenvolvimento"
echo "📌 API: http://localhost:4000"
echo "📌 Frontend: http://localhost:3000"
echo ""
echo "🔑 Credenciais de teste:"
echo "   Alpha Tech: ceo@alpha.com / alpha123"
echo "   Beta Logistics: diretoria@beta.com / beta123"
echo ""
echo "💡 Para parar, pressione Ctrl+C"
echo ""

# Usar turbo para rodar ambos em paralelo
pnpm dev

