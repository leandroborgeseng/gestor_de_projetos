#!/bin/bash

# Script para criar .env.production no Ubuntu
# Uso: ./scripts/create-env-ubuntu.sh

set -e

echo "🔧 Criando arquivo .env.production..."

# Verificar se já existe
if [ -f .env.production ]; then
    echo "⚠ Arquivo .env.production já existe!"
    read -p "Deseja sobrescrever? (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        echo "❌ Operação cancelada"
        exit 0
    fi
fi

# Obter IP do servidor
SERVER_IP=$(hostname -I | awk '{print $1}')

# Gerar secrets
echo "🔐 Gerando secrets..."
POSTGRES_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)

# Criar arquivo
cat > .env.production << EOF
# ============================================
# CONFIGURAÇÕES DE PRODUÇÃO
# ============================================
# Gerado automaticamente em $(date)

# ============================================
# BANCO DE DADOS
# ============================================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=agilepm
POSTGRES_PORT=5432

# ============================================
# API BACKEND
# ============================================
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/agilepm
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
API_PORT=4000

# ============================================
# FRONTEND WEB
# ============================================
FRONTEND_URL=http://${SERVER_IP}
VITE_API_URL=http://${SERVER_IP}/api
WEB_PORT=80

# ============================================
# NGINX REVERSE PROXY (Opcional)
# ============================================
NGINX_PORT=8080
EOF

echo "✅ Arquivo .env.production criado com sucesso!"
echo ""
echo "📋 Configurações geradas:"
echo "   • IP do servidor: ${SERVER_IP}"
echo "   • Secrets gerados automaticamente"
echo ""
echo "⚠ IMPORTANTE: Guarde os secrets gerados em local seguro!"
echo ""
echo "Para editar manualmente:"
echo "   nano .env.production"

