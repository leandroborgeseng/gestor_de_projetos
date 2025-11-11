# 🐧 Clonar e Configurar no Ubuntu

Guia rápido para clonar o projeto no Ubuntu e rodar a instalação.

## 📋 Passo 1: No Mac - Fazer Commit e Push

### 1.1. Verificar status

```bash
git status
```

### 1.2. Adicionar e commitar

```bash
git add .
git commit -m "feat: versão 1.0 completa - pronta para produção"
```

### 1.3. Fazer push

**Opção A: Se já configurou GitHub CLI**
```bash
git push -u origin main
```

**Opção B: Se usar Personal Access Token**
```bash
git push -u origin main
# Quando pedir:
#   Username: leandroborgeseng
#   Password: [seu token do GitHub]
```

## 🐧 Passo 2: No Ubuntu - Clonar o Repositório

### 2.1. Conectar no servidor Ubuntu

```bash
ssh usuario@seu-servidor-ip
```

### 2.2. Instalar Git (se não tiver)

```bash
sudo apt update
sudo apt install -y git
```

### 2.3. Clonar o repositório

```bash
# Criar diretório para aplicações
sudo mkdir -p /opt/apps
cd /opt/apps

# Clonar repositório
sudo git clone https://github.com/leandroborgeseng/gestor_de_projetos.git agilepm

# Dar permissões ao usuário atual
sudo chown -R $USER:$USER /opt/apps/agilepm
cd agilepm
```

### 2.4. Verificar se clonou corretamente

```bash
ls -la
# Deve mostrar os arquivos do projeto
```

## 🚀 Passo 3: No Ubuntu - Rodar Instalação

### 3.1. Executar script de instalação

```bash
# Dar permissão de execução
chmod +x scripts/install-ubuntu.sh

# Executar instalação (precisa de sudo)
sudo ./scripts/install-ubuntu.sh
```

O script irá:
- ✅ Atualizar o sistema
- ✅ Instalar Docker
- ✅ Instalar Docker Compose
- ✅ Configurar permissões

### 3.2. Configurar variáveis de ambiente

```bash
# Copiar arquivo de exemplo
cp .env.production.example .env.production

# Editar arquivo
nano .env.production
```

Configure:
```bash
POSTGRES_PASSWORD=GERAR_SENHA_FORTE_AQUI
JWT_SECRET=GERAR_SECRET_FORTE_AQUI
JWT_REFRESH_SECRET=GERAR_REFRESH_SECRET_FORTE_AQUI
FRONTEND_URL=http://SEU_IP_OU_DOMINIO
VITE_API_URL=http://SEU_IP_OU_DOMINIO/api
```

Gerar secrets:
```bash
openssl rand -base64 32  # Para POSTGRES_PASSWORD
openssl rand -base64 32  # Para JWT_SECRET
openssl rand -base64 32  # Para JWT_REFRESH_SECRET
```

### 3.3. Configurar firewall

```bash
sudo ufw allow 22/tcp  # SSH (IMPORTANTE!)
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

### 3.4. Fazer deploy

```bash
# Dar permissão de execução
chmod +x scripts/deploy.sh

# Executar deploy
./scripts/deploy.sh
```

Ou manualmente:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma migrate deploy
```

### 3.5. Verificar se está rodando

```bash
# Ver status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Ver logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Testar API
curl http://localhost:4000/health
```

## 📝 Comandos Rápidos (Copy & Paste)

### No Mac (antes de ir pro Ubuntu):

```bash
cd /Users/leandroborges/projeto-project
git add .
git commit -m "feat: versão 1.0 completa - pronta para produção"
git push -u origin main
```

### No Ubuntu (depois de conectar):

```bash
# 1. Instalar Git
sudo apt update && sudo apt install -y git

# 2. Clonar
sudo mkdir -p /opt/apps && cd /opt/apps
sudo git clone https://github.com/leandroborgeseng/gestor_de_projetos.git agilepm
sudo chown -R $USER:$USER /opt/apps/agilepm
cd agilepm

# 3. Instalar Docker
chmod +x scripts/install-ubuntu.sh
sudo ./scripts/install-ubuntu.sh

# 4. Configurar
cp .env.production.example .env.production
nano .env.production  # Editar e salvar

# 5. Firewall
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw enable

# 6. Deploy
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## ✅ Checklist

### No Mac:
- [ ] Código commitado
- [ ] Push feito com sucesso
- [ ] Repositório atualizado no GitHub

### No Ubuntu:
- [ ] Git instalado
- [ ] Repositório clonado
- [ ] Docker instalado (via script)
- [ ] .env.production configurado
- [ ] Firewall configurado
- [ ] Deploy executado
- [ ] Aplicação rodando

## 🆘 Troubleshooting

### Erro ao clonar: "Permission denied"

```bash
# Verificar se tem acesso ao repositório
# Se for privado, pode precisar configurar autenticação
```

### Erro: "Docker não encontrado"

```bash
# Verificar se o script de instalação rodou
sudo ./scripts/install-ubuntu.sh

# Ou instalar manualmente
sudo apt install -y docker.io docker-compose
```

### Erro: "Permission denied" no Docker

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Fazer logout e login novamente
# Ou executar:
newgrp docker
```

## 🎉 Pronto!

Depois de seguir esses passos, sua aplicação estará rodando no Ubuntu!

Acesse:
- Frontend: `http://SEU_IP`
- API: `http://SEU_IP:4000`
- Swagger: `http://SEU_IP:4000/api-docs`

