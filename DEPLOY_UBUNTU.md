# 🐧 Guia de Deploy em Ubuntu 24

Este guia explica passo a passo como fazer o deploy da aplicação Agile Project Manager em um servidor Ubuntu 24.

## 📋 Pré-requisitos

- Servidor Ubuntu 24.04 LTS
- Acesso SSH com privilégios de root ou sudo
- Domínio configurado (opcional, mas recomendado)

## 🔧 Passo 1: Atualizar o Sistema

```bash
# Atualizar lista de pacotes
sudo apt update && sudo apt upgrade -y

# Instalar pacotes essenciais
sudo apt install -y curl wget git ufw software-properties-common
```

## 🐳 Passo 2: Instalar Docker

### 2.1. Adicionar repositório oficial do Docker

```bash
# Adicionar chave GPG
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Adicionar repositório
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 2.2. Instalar Docker Engine

```bash
# Atualizar lista de pacotes
sudo apt update

# Instalar Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar instalação
sudo docker --version
sudo docker compose version
```

### 2.3. Configurar Docker para rodar sem sudo (opcional)

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER

# Aplicar mudanças (ou fazer logout/login)
newgrp docker

# Testar sem sudo
docker ps
```

## 📦 Passo 3: Clonar o Repositório

```bash
# Criar diretório para aplicações
sudo mkdir -p /opt/apps
cd /opt/apps

# Clonar repositório (substitua pela URL do seu repositório)
sudo git clone <seu-repositorio> agilepm
cd agilepm

# Dar permissões ao usuário atual
sudo chown -R $USER:$USER /opt/apps/agilepm
```

## 🔐 Passo 4: Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.production.example .env.production

# Editar arquivo
nano .env.production
```

Configure as seguintes variáveis:

```bash
# Banco de dados
POSTGRES_USER=postgres
POSTGRES_PASSWORD=GERAR_SENHA_FORTE_AQUI
POSTGRES_DB=agilepm
POSTGRES_PORT=5432

# API
DATABASE_URL=postgresql://postgres:GERAR_SENHA_FORTE_AQUI@db:5432/agilepm
JWT_SECRET=GERAR_SECRET_FORTE_AQUI
JWT_REFRESH_SECRET=GERAR_REFRESH_SECRET_FORTE_AQUI
API_PORT=4000

# Frontend
FRONTEND_URL=http://SEU_IP_OU_DOMINIO
VITE_API_URL=http://SEU_IP_OU_DOMINIO/api
WEB_PORT=80
```

### Gerar Secrets Fortes

```bash
# Gerar senha para PostgreSQL
openssl rand -base64 32

# Gerar JWT_SECRET
openssl rand -base64 32

# Gerar JWT_REFRESH_SECRET
openssl rand -base64 32
```

## 🔒 Passo 5: Configurar Firewall

```bash
# Habilitar firewall
sudo ufw enable

# Permitir SSH (IMPORTANTE - faça antes de bloquear tudo!)
sudo ufw allow 22/tcp

# Permitir HTTP
sudo ufw allow 80/tcp

# Permitir HTTPS
sudo ufw allow 443/tcp

# Verificar regras
sudo ufw status
```

## 🚀 Passo 6: Fazer o Deploy

### 6.1. Usando o Script Automatizado

```bash
# Dar permissão de execução
chmod +x scripts/deploy.sh

# Executar deploy
./scripts/deploy.sh
```

### 6.2. Ou Manualmente

```bash
# Build das imagens
docker compose -f docker-compose.prod.yml --env-file .env.production build

# Iniciar serviços
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Aguardar banco estar pronto
sleep 10

# Executar migrações
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma migrate deploy

# (Opcional) Executar seed
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma db seed
```

## ✅ Passo 7: Verificar o Deploy

```bash
# Verificar status dos containers
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Ver logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Testar API
curl http://localhost:4000/health

# Testar Frontend
curl http://localhost:80
```

## 🌐 Passo 8: Configurar Domínio (Opcional)

### 8.1. Instalar Nginx como Reverse Proxy

```bash
# Instalar Nginx
sudo apt install -y nginx

# Parar Nginx (vamos usar o do Docker)
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### 8.2. Configurar DNS

Configure os registros DNS do seu domínio para apontar para o IP do servidor:
- Tipo A: `@` → IP do servidor
- Tipo A: `www` → IP do servidor

### 8.3. Instalar Certbot (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Gerar certificado (substitua pelo seu domínio)
sudo certbot certonly --standalone -d seu-dominio.com -d www.seu-dominio.com

# Copiar certificados
sudo mkdir -p /opt/apps/agilepm/nginx/ssl
sudo cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem /opt/apps/agilepm/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem /opt/apps/agilepm/nginx/ssl/key.pem
sudo chown -R $USER:$USER /opt/apps/agilepm/nginx/ssl
```

### 8.4. Atualizar .env.production

```bash
nano .env.production
```

Altere:
```bash
FRONTEND_URL=https://seu-dominio.com
VITE_API_URL=https://seu-dominio.com/api
```

### 8.5. Editar nginx/nginx.conf

Descomente e configure as seções HTTPS no arquivo `nginx/nginx.conf`.

### 8.6. Reiniciar com Nginx

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production --profile with-proxy up -d
```

## 🔄 Passo 9: Configurar Auto-start (Systemd)

Criar um serviço systemd para iniciar automaticamente:

```bash
sudo nano /etc/systemd/system/agilepm.service
```

Adicione:

```ini
[Unit]
Description=Agile Project Manager
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/apps/agilepm
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml --env-file .env.production up -d
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml --env-file .env.production down
User=SEU_USUARIO
Group=SEU_USUARIO

[Install]
WantedBy=multi-user.target
```

Ativar o serviço:

```bash
# Recarregar systemd
sudo systemctl daemon-reload

# Habilitar serviço
sudo systemctl enable agilepm.service

# Iniciar serviço
sudo systemctl start agilepm.service

# Verificar status
sudo systemctl status agilepm.service
```

## 📊 Passo 10: Monitoramento e Manutenção

### 10.1. Ver Logs

```bash
# Todos os serviços
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Apenas API
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f api

# Últimas 100 linhas
docker compose -f docker-compose.prod.yml --env-file .env.production logs --tail=100
```

### 10.2. Backup do Banco de Dados

Criar script de backup:

```bash
nano /opt/apps/agilepm/scripts/backup.sh
```

Adicione:

```bash
#!/bin/bash
BACKUP_DIR="/opt/apps/agilepm/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db pg_dump -U postgres agilepm > $BACKUP_DIR/backup_$DATE.sql

# Manter apenas últimos 7 backups
ls -t $BACKUP_DIR/*.sql | tail -n +8 | xargs -r rm

echo "Backup criado: backup_$DATE.sql"
```

Tornar executável:

```bash
chmod +x /opt/apps/agilepm/scripts/backup.sh
```

Agendar backup diário (cron):

```bash
crontab -e
```

Adicione (backup diário às 2h da manhã):

```
0 2 * * * /opt/apps/agilepm/scripts/backup.sh
```

### 10.3. Atualizar Aplicação

```bash
cd /opt/apps/agilepm

# Fazer backup antes
./scripts/backup.sh

# Atualizar código
git pull

# Rebuild e reiniciar
docker compose -f docker-compose.prod.yml --env-file .env.production build
docker compose -f docker-compose.prod.yml --env-file .env.production down
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# Executar migrações (se houver)
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma migrate deploy
```

## 🛠️ Comandos Úteis

### Gerenciar Containers

```bash
# Ver status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Parar serviços
docker compose -f docker-compose.prod.yml --env-file .env.production stop

# Iniciar serviços
docker compose -f docker-compose.prod.yml --env-file .env.production start

# Reiniciar serviços
docker compose -f docker-compose.prod.yml --env-file .env.production restart

# Parar e remover
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Ver uso de recursos
docker stats
```

### Limpeza

```bash
# Remover imagens não utilizadas
docker image prune -a

# Remover volumes não utilizados
docker volume prune

# Limpeza completa (CUIDADO!)
docker system prune -a --volumes
```

## 🐛 Troubleshooting

### Problema: Container não inicia

```bash
# Ver logs detalhados
docker compose -f docker-compose.prod.yml --env-file .env.production logs api

# Verificar se há erros
docker compose -f docker-compose.prod.yml --env-file .env.production ps -a
```

### Problema: Erro de permissão

```bash
# Verificar permissões do diretório
ls -la /opt/apps/agilepm

# Corrigir permissões
sudo chown -R $USER:$USER /opt/apps/agilepm
```

### Problema: Porta já em uso

```bash
# Verificar qual processo está usando a porta
sudo lsof -i :80
sudo lsof -i :4000

# Parar processo (substitua PID)
sudo kill -9 PID
```

### Problema: Banco de dados não conecta

```bash
# Verificar se o banco está rodando
docker compose -f docker-compose.prod.yml --env-file .env.production ps db

# Testar conexão
docker compose -f docker-compose.prod.yml --env-file .env.production exec db psql -U postgres -d agilepm
```

## 📝 Checklist Final

- [ ] Docker e Docker Compose instalados
- [ ] Repositório clonado
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets fortes gerados
- [ ] Firewall configurado
- [ ] Aplicação rodando
- [ ] Migrações executadas
- [ ] Health checks passando
- [ ] Domínio configurado (se aplicável)
- [ ] SSL/HTTPS configurado (se aplicável)
- [ ] Backup configurado
- [ ] Auto-start configurado
- [ ] Monitoramento configurado

## 🎉 Pronto!

Sua aplicação está rodando em produção no Ubuntu 24!

**Acesse:**
- Frontend: `http://SEU_IP` ou `https://seu-dominio.com`
- API: `http://SEU_IP:4000` ou `https://seu-dominio.com/api`
- Swagger: `http://SEU_IP:4000/api-docs` ou `https://seu-dominio.com/api/api-docs`

## 📚 Recursos Adicionais

- [Documentação Docker](https://docs.docker.com/)
- [Documentação Ubuntu](https://ubuntu.com/server/docs)
- [Documentação Let's Encrypt](https://letsencrypt.org/docs/)

