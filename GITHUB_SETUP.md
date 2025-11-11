# 🔐 Configuração de Autenticação GitHub

Este guia explica como configurar a autenticação com o GitHub.

## 🔍 Problema: Permission denied (publickey)

Este erro ocorre quando o GitHub não consegue autenticar você via SSH.

## 🚀 Solução 1: Usar HTTPS (Mais Simples)

### 1.1. Alterar remote para HTTPS

```bash
# Ver remote atual
git remote -v

# Alterar para HTTPS
git remote set-url origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git

# Verificar
git remote -v
```

### 1.2. Usar Personal Access Token

1. **Criar token no GitHub:**
   - Acesse: https://github.com/settings/tokens
   - Clique em "Generate new token (classic)"
   - Dê um nome (ex: "agilepm-projeto")
   - Selecione escopos: `repo` (acesso completo a repositórios)
   - Clique em "Generate token"
   - **COPIE O TOKEN** (não será mostrado novamente!)

2. **Fazer push usando o token:**

```bash
# Quando pedir senha, use o token no lugar da senha
git push -u origin main

# Ou configurar para salvar credenciais
git config --global credential.helper store
git push -u origin main
# Digite seu usuário e o token como senha
```

### 1.3. Usar GitHub CLI (Recomendado)

```bash
# Instalar GitHub CLI (se não tiver)
brew install gh

# Fazer login
gh auth login

# Seguir as instruções na tela
# Isso configurará automaticamente a autenticação
```

## 🔑 Solução 2: Configurar SSH (Mais Seguro)

### 2.1. Verificar se já existe chave SSH

```bash
ls -la ~/.ssh
```

Procure por arquivos como:
- `id_rsa` e `id_rsa.pub`
- `id_ed25519` e `id_ed25519.pub`

### 2.2. Gerar nova chave SSH (se não existir)

```bash
# Gerar chave SSH
ssh-keygen -t ed25519 -C "seu-email@example.com"

# Ou se ed25519 não for suportado:
ssh-keygen -t rsa -b 4096 -C "seu-email@example.com"

# Pressione Enter para aceitar o local padrão
# Defina uma senha (opcional, mas recomendado)
```

### 2.3. Adicionar chave ao ssh-agent

```bash
# Iniciar ssh-agent
eval "$(ssh-agent -s)"

# Adicionar chave
ssh-add ~/.ssh/id_ed25519
# Ou se usou RSA:
# ssh-add ~/.ssh/id_rsa
```

### 2.4. Copiar chave pública

```bash
# Copiar chave pública para clipboard
cat ~/.ssh/id_ed25519.pub | pbcopy

# Ou visualizar
cat ~/.ssh/id_ed25519.pub
```

### 2.5. Adicionar chave no GitHub

1. Acesse: https://github.com/settings/keys
2. Clique em "New SSH key"
3. Dê um título (ex: "MacBook Air")
4. Cole a chave pública
5. Clique em "Add SSH key"

### 2.6. Testar conexão

```bash
ssh -T git@github.com
```

Você deve ver:
```
Hi SEU_USUARIO! You've successfully authenticated...
```

### 2.7. Fazer push

```bash
git push -u origin main
```

## 🛠️ Solução 3: Verificar Configuração Atual

### 3.1. Ver remote configurado

```bash
git remote -v
```

### 3.2. Ver chaves SSH carregadas

```bash
ssh-add -l
```

### 3.3. Testar conexão SSH

```bash
ssh -T git@github.com
```

## 📋 Checklist Rápido

- [ ] Remote configurado corretamente
- [ ] Chave SSH gerada (se usar SSH)
- [ ] Chave SSH adicionada ao ssh-agent
- [ ] Chave SSH adicionada no GitHub
- [ ] Conexão SSH testada e funcionando
- [ ] Ou token GitHub criado (se usar HTTPS)

## 🚨 Problemas Comuns

### Erro: "Could not resolve hostname github.com"

```bash
# Verificar conexão com internet
ping github.com
```

### Erro: "Permission denied (publickey)"

- Verificar se a chave está no ssh-agent: `ssh-add -l`
- Verificar se a chave está no GitHub: https://github.com/settings/keys
- Tentar usar HTTPS como alternativa

### Erro: "Host key verification failed"

```bash
# Remover GitHub do known_hosts
ssh-keygen -R github.com

# Tentar novamente
ssh -T git@github.com
```

## 💡 Recomendação

Para começar rapidamente, use **HTTPS com GitHub CLI**:

```bash
# Instalar GitHub CLI
brew install gh

# Fazer login
gh auth login

# Isso configurará tudo automaticamente!
```

## 📚 Recursos

- [Documentação GitHub SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Documentação GitHub HTTPS](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub CLI](https://cli.github.com/)

