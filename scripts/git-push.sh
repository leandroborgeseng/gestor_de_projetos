#!/bin/bash

# Script para fazer commit e push das alterações
# Uso: ./scripts/git-push.sh "mensagem do commit"

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Verificar se mensagem foi fornecida
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erro: Mensagem de commit não fornecida${NC}"
    echo ""
    echo "Uso: ./scripts/git-push.sh \"sua mensagem de commit\""
    echo ""
    echo "Exemplo:"
    echo "  ./scripts/git-push.sh \"feat: adicionar configuração Docker para produção\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo -e "${BLUE}📦 Preparando commit e push...${NC}"
echo ""

# Verificar status
echo -e "${YELLOW}📊 Verificando status do Git...${NC}"
git status --short

echo ""
read -p "Continuar com commit e push? (s/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
    echo -e "${YELLOW}❌ Operação cancelada${NC}"
    exit 1
fi

# Adicionar todos os arquivos
echo -e "${YELLOW}➕ Adicionando arquivos...${NC}"
git add .

# Verificar se há algo para commitar
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠ Nenhuma alteração para commitar${NC}"
    exit 0
fi

# Fazer commit
echo -e "${YELLOW}💾 Fazendo commit...${NC}"
git commit -m "$COMMIT_MESSAGE"

# Verificar se há remote configurado
if ! git remote | grep -q origin; then
    echo -e "${YELLOW}⚠ Nenhum remote 'origin' configurado${NC}"
    echo "Configure com: git remote add origin <url>"
    exit 0
fi

# Fazer push
echo -e "${YELLOW}🚀 Fazendo push...${NC}"
BRANCH=$(git branch --show-current)

if git ls-remote --heads origin "$BRANCH" | grep -q "$BRANCH"; then
    # Branch já existe no remote
    git push origin "$BRANCH"
else
    # Primeira vez, criar branch no remote
    echo -e "${YELLOW}🌿 Criando branch $BRANCH no remote...${NC}"
    git push -u origin "$BRANCH"
fi

echo ""
echo -e "${GREEN}✅ Commit e push concluídos com sucesso!${NC}"
echo ""
echo "📋 Resumo:"
echo "   Branch: $BRANCH"
echo "   Commit: $COMMIT_MESSAGE"
echo ""

