#!/bin/bash

# Script para corrigir permissões do diretório de uploads

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Corrigindo permissões do diretório de uploads"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

UPLOAD_DIR="./apps/api/uploads"

# Criar diretório se não existir
if [ ! -d "$UPLOAD_DIR" ]; then
  echo "📁 Criando diretório de uploads..."
  mkdir -p "$UPLOAD_DIR"
fi

# Ajustar permissões
echo "🔐 Ajustando permissões..."
chmod 755 "$UPLOAD_DIR"

# Se estiver rodando no servidor, ajustar owner também
if [ "$EUID" -eq 0 ]; then
  echo "👤 Ajustando owner (root)..."
  chown -R 1001:1001 "$UPLOAD_DIR" 2>/dev/null || echo "⚠️ Não foi possível ajustar owner (pode ser normal)"
else
  echo "ℹ️ Executando como usuário normal, owner não será alterado"
fi

echo "✅ Permissões ajustadas!"
echo ""
echo "📋 Permissões atuais:"
ls -ld "$UPLOAD_DIR"

