#!/bin/bash

# Script para resolver conflito de porta PostgreSQL
# Uso: ./scripts/fix-port-conflict.sh

set -e

echo "🔍 Verificando o que está usando a porta 5432..."

# Verificar se há containers Docker rodando na porta 5432
echo "📦 Verificando containers Docker..."
CONTAINERS=$(docker ps -a --filter "publish=5432" --format "{{.ID}} {{.Names}}")

if [ ! -z "$CONTAINERS" ]; then
    echo "⚠️  Containers encontrados usando a porta 5432:"
    echo "$CONTAINERS"
    echo ""
    echo "🛑 Parando containers..."
    docker ps -a --filter "publish=5432" --format "{{.ID}}" | xargs -r docker stop
    docker ps -a --filter "publish=5432" --format "{{.ID}}" | xargs -r docker rm
    echo "✅ Containers parados e removidos"
else
    echo "✅ Nenhum container Docker usando a porta 5432"
fi

# Verificar se há processo PostgreSQL local rodando
echo ""
echo "🔍 Verificando processos PostgreSQL locais..."
if command -v lsof &> /dev/null; then
    PG_PROCESS=$(lsof -ti:5432 2>/dev/null || true)
    if [ ! -z "$PG_PROCESS" ]; then
        echo "⚠️  Processo PostgreSQL local encontrado (PID: $PG_PROCESS)"
        echo "🛑 Parando processo..."
        kill -9 $PG_PROCESS 2>/dev/null || true
        echo "✅ Processo parado"
    else
        echo "✅ Nenhum processo local usando a porta 5432"
    fi
elif command -v netstat &> /dev/null; then
    PG_PROCESS=$(netstat -tlnp 2>/dev/null | grep :5432 | awk '{print $7}' | cut -d'/' -f1 | head -1 || true)
    if [ ! -z "$PG_PROCESS" ]; then
        echo "⚠️  Processo encontrado na porta 5432 (PID: $PG_PROCESS)"
        echo "🛑 Parando processo..."
        kill -9 $PG_PROCESS 2>/dev/null || true
        echo "✅ Processo parado"
    else
        echo "✅ Nenhum processo usando a porta 5432"
    fi
else
    echo "⚠️  Não foi possível verificar processos (lsof/netstat não disponível)"
fi

# Verificar se há serviço systemd do PostgreSQL
echo ""
echo "🔍 Verificando serviço PostgreSQL do systemd..."
if systemctl is-active --quiet postgresql 2>/dev/null || systemctl is-active --quiet postgresql@* 2>/dev/null; then
    echo "⚠️  Serviço PostgreSQL do systemd está rodando"
    echo "💡 Para parar: sudo systemctl stop postgresql"
    echo "💡 Para desabilitar: sudo systemctl disable postgresql"
else
    echo "✅ Nenhum serviço PostgreSQL do systemd rodando"
fi

echo ""
echo "✅ Verificação concluída!"
echo ""
echo "Agora você pode tentar novamente:"
echo "  ./scripts/deploy.sh"

