# ⚡ Quick Start - Ubuntu

## 🖥️ No Mac (Agora)

```bash
# 1. Adicionar arquivo de documentação (se ainda não fez)
git add CLONE_UBUNTU.md
git commit -m "docs: adicionar guia para clonar no Ubuntu"
git push
```

## 🐧 No Ubuntu (Depois)

### Passo 1: Conectar e Clonar

```bash
# Conectar no servidor
ssh usuario@seu-servidor-ip

# Instalar Git
sudo apt update && sudo apt install -y git

# Clonar projeto
sudo mkdir -p /opt/apps && cd /opt/apps
sudo git clone https://github.com/leandroborgeseng/gestor_de_projetos.git agilepm
sudo chown -R $USER:$USER /opt/apps/agilepm
cd agilepm
```

### Passo 2: Instalar Docker

```bash
chmod +x scripts/install-ubuntu.sh
sudo ./scripts/install-ubuntu.sh
```

### Passo 3: Configurar

```bash
# Copiar e editar .env
cp .env.production.example .env.production
nano .env.production

# Gerar secrets (execute 3 vezes e copie cada resultado)
openssl rand -base64 32
```

Configure no `.env.production`:
- `POSTGRES_PASSWORD` = primeiro resultado
- `JWT_SECRET` = segundo resultado  
- `JWT_REFRESH_SECRET` = terceiro resultado
- `FRONTEND_URL` = http://SEU_IP
- `VITE_API_URL` = http://SEU_IP/api

### Passo 4: Firewall

```bash
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw enable
```

### Passo 5: Deploy

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Passo 6: Verificar

```bash
# Ver status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Testar
curl http://localhost:4000/health
```

## ✅ Pronto!

Acesse: `http://SEU_IP`

