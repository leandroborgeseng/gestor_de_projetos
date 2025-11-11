# 📦 Guia de Workflow Git

Este guia explica como fazer commit e push das alterações para o repositório Git.

## 🚀 Comandos Rápidos

### 1. Verificar Status

```bash
git status
```

### 2. Adicionar Arquivos

```bash
# Adicionar todos os arquivos modificados
git add .

# Ou adicionar arquivos específicos
git add arquivo1.ts arquivo2.ts
```

### 3. Fazer Commit

```bash
git commit -m "Descrição das alterações"
```

### 4. Fazer Push

```bash
# Primeira vez (criar branch remota)
git push -u origin main

# Próximas vezes
git push
```

## 📝 Exemplo Completo

```bash
# 1. Ver o que foi alterado
git status

# 2. Adicionar todas as alterações
git add .

# 3. Fazer commit com mensagem descritiva
git commit -m "feat: adicionar configuração Docker para produção

- Adicionar Dockerfiles para API e Web
- Criar docker-compose.prod.yml
- Adicionar guias de deploy para Ubuntu 24
- Configurar Nginx como reverse proxy
- Adicionar scripts de backup e deploy"

# 4. Fazer push
git push
```

## 🎯 Convenções de Commit

Use prefixos para organizar os commits:

- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação (não afeta código)
- `refactor:` - Refatoração
- `test:` - Testes
- `chore:` - Tarefas de manutenção
- `deploy:` - Deploy/configuração

Exemplos:
```bash
git commit -m "feat: adicionar modo compacto de visualização"
git commit -m "fix: corrigir erro de autenticação"
git commit -m "docs: atualizar guia de deploy"
git commit -m "chore: atualizar dependências"
```

## 🔄 Workflow Completo

### Primeira Vez (Configuração Inicial)

```bash
# 1. Inicializar repositório (se ainda não foi feito)
git init

# 2. Adicionar remote (substitua pela URL do seu repositório)
git remote add origin https://github.com/seu-usuario/projeto-project.git

# 3. Adicionar todos os arquivos
git add .

# 4. Fazer commit inicial
git commit -m "feat: versão inicial do projeto"

# 5. Criar branch main (se necessário)
git branch -M main

# 6. Fazer push inicial
git push -u origin main
```

### Atualizações Regulares

```bash
# 1. Verificar status
git status

# 2. Ver diferenças (opcional)
git diff

# 3. Adicionar alterações
git add .

# 4. Fazer commit
git commit -m "descrição das alterações"

# 5. Fazer push
git push
```

## 🔀 Trabalhando com Branches

### Criar Nova Branch

```bash
git checkout -b feature/nova-funcionalidade
```

### Mudar de Branch

```bash
git checkout main
```

### Fazer Merge

```bash
# Mudar para branch principal
git checkout main

# Fazer merge da branch
git merge feature/nova-funcionalidade

# Deletar branch local (opcional)
git branch -d feature/nova-funcionalidade
```

## 📋 Checklist Antes do Push

- [ ] Código testado e funcionando
- [ ] Arquivos sensíveis não commitados (.env, secrets)
- [ ] Mensagem de commit descritiva
- [ ] Apenas arquivos relevantes adicionados
- [ ] .gitignore configurado corretamente

## 🚫 Arquivos que NÃO devem ser commitados

Certifique-se de que o `.gitignore` está configurado para ignorar:

- `.env` e `.env.*`
- `node_modules/`
- `dist/` e `build/`
- `uploads/`
- `backups/`
- Arquivos de IDE (`.vscode/`, `.idea/`)
- Logs (`*.log`)

## 🔍 Comandos Úteis

```bash
# Ver histórico de commits
git log --oneline

# Ver diferenças antes de adicionar
git diff

# Ver diferenças de arquivos já adicionados
git diff --staged

# Desfazer alterações em arquivo (antes de add)
git checkout -- arquivo.ts

# Remover arquivo do staging (depois de add, antes de commit)
git reset HEAD arquivo.ts

# Alterar último commit (antes de push)
git commit --amend -m "Nova mensagem"

# Ver branches
git branch

# Ver remotes
git remote -v
```

## 🆘 Resolução de Problemas

### Erro: "Your branch is ahead of origin/main"

```bash
# Simplesmente fazer push
git push
```

### Erro: "Updates were rejected"

```bash
# Fazer pull primeiro
git pull origin main

# Resolver conflitos se houver, depois:
git add .
git commit -m "merge: resolver conflitos"
git push
```

### Desfazer último commit (antes de push)

```bash
git reset --soft HEAD~1  # Mantém alterações
git reset --hard HEAD~1   # Remove alterações (CUIDADO!)
```

## 📚 Recursos Adicionais

- [Documentação Git](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Conventional Commits](https://www.conventionalcommits.org/)

