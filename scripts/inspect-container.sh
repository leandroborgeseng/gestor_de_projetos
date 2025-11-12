#!/bin/bash

# Script para inspecionar o container e verificar node_modules
# Uso: ./scripts/inspect-container.sh

echo "🔍 Inspecionando container da API..."
echo ""

cd /opt/apps/agilepm || exit 1

# Parar o container para poder inspecionar
echo "1. Parando container..."
docker stop agilepm-api 2>/dev/null || true

# Criar um container temporário da mesma imagem para inspecionar
echo ""
echo "2. Criando container temporário para inspecionar..."
CONTAINER_ID=$(docker create agilepm-api 2>/dev/null || echo "")

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ Não foi possível criar container. Verificando imagem..."
    docker images | grep agilepm-api
    exit 1
fi

echo "Container ID: $CONTAINER_ID"
echo ""

# Verificar estrutura de diretórios
echo "3. Verificando estrutura de diretórios:"
docker cp $CONTAINER_ID:/app - | tar -tv | head -50 || echo "Erro ao copiar"

echo ""
echo "4. Verificando se node_modules existe:"
docker exec $CONTAINER_ID ls -la /app/node_modules 2>&1 || docker run --rm --entrypoint sh agilepm-api -c "ls -la /app/node_modules" 2>&1 || echo "Não foi possível verificar"

echo ""
echo "5. Verificando se express existe:"
docker run --rm --entrypoint sh agilepm-api -c "ls -la /app/node_modules/express 2>&1 || echo 'express não encontrado'" 2>&1

echo ""
echo "6. Listando primeiros 30 itens de node_modules:"
docker run --rm --entrypoint sh agilepm-api -c "ls -la /app/node_modules | head -30" 2>&1

echo ""
echo "7. Verificando estrutura completa:"
docker run --rm --entrypoint sh agilepm-api -c "find /app -name 'node_modules' -type d 2>/dev/null | head -10" 2>&1

echo ""
echo "8. Verificando se dist/index.js existe:"
docker run --rm --entrypoint sh agilepm-api -c "ls -la /app/dist/index.js" 2>&1

# Limpar
docker rm $CONTAINER_ID 2>/dev/null || true

echo ""
echo "✅ Inspeção concluída!"

