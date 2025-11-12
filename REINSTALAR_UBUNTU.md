# 🔄 Reinstalar no Ubuntu - Guia Completo

Guia para excluir a pasta atual e fazer um clone completo do repositório no Ubuntu.

## 🗑️ Passo 1: Parar e Remover Containers

```bash
# Parar todos os containers
docker compose -f docker-compose.prod.yml --env-file .env.production down

# Ou se estiver na pasta do projeto
cd /opt/apps/agilepm
docker compose -f docker-compose.prod.yml --env-file .env.production down -v
```

## 📁 Passo 2: Fazer Backup do .env.production (IMPORTANTE!)

```bash
# Copiar o arquivo .env.production para um local seguro
cd /opt/apps/agilepm
cp .env.production ~/agilepm.env.backup

# Ou anotar as variáveis importantes
cat .env.production
```

## 🗑️ Passo 3: Remover a Pasta

```bash
# Voltar para o diretório pai
cd /opt/apps

# Remover a pasta do projeto
sudo rm -rf agilepm

# Verificar se foi removida
ls -la
```

## 📥 Passo 4: Clonar Repositório Novamente

```bash
# Clonar o repositório
sudo git clone https://github.com/leandroborgeseng/gestor_de_projetos.git agilepm

# Dar permissões ao usuário atual
sudo chown -R $USER:$USER /opt/apps/agilepm

# Entrar na pasta
cd agilepm
```

## 🔐 Passo 5: Recriar .env.production

```bash
# Copiar o backup de volta
cp ~/agilepm.env.backup .env.production

# OU criar novo com os valores (veja env.production.COMPLETO no repositório)
nano .env.production
```

Cole o conteúdo completo:

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=5DO1CXiQZK3J7NMnP9g8WVXd/DICIGd1IbsFRCb9Abk=
POSTGRES_DB=agilepm
POSTGRES_PORT=5432
DATABASE_URL=postgresql://postgres:5DO1CXiQZK3J7NMnP9g8WVXd/DICIGd1IbsFRCb9Abk=@db:5432/agilepm
JWT_SECRET=t5J7i23t+umEbGcKVOL0JjJ6WESXDjzz8BcP1MeEqFY=
JWT_REFRESH_SECRET=m2SWQqhDce/qjVmKl9X1iiyeCT1go0mdfEnjibxgFo8=
API_PORT=4000
FRONTEND_URL=http://189.90.139.222
VITE_API_URL=http://189.90.139.222/api
WEB_PORT=80
NGINX_PORT=8080
```

## 🚀 Passo 6: Fazer Deploy

```bash
# Dar permissões aos scripts
chmod +x scripts/*.sh

# Fazer deploy
./scripts/deploy.sh

# OU manualmente:
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T api pnpm prisma migrate deploy
```

## ✅ Passo 7: Verificar

```bash
# Ver status
docker compose -f docker-compose.prod.yml --env-file .env.production ps

# Ver logs
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Testar API
curl http://localhost:4000/health
```

## 📋 Comandos Rápidos (Copy & Paste)

```bash
# 1. Parar containers
cd /opt/apps/agilepm
docker compose -f docker-compose.prod.yml --env-file .env.production down -v

# 2. Backup do .env
cp .env.production ~/agilepm.env.backup

# 3. Remover pasta
cd /opt/apps
sudo rm -rf agilepm

# 4. Clonar novamente
sudo git clone https://github.com/leandroborgeseng/gestor_de_projetos.git agilepm
sudo chown -R $USER:$USER /opt/apps/agilepm
cd agilepm

# 5. Recriar .env
cp ~/agilepm.env.backup .env.production
# OU criar novo (veja conteúdo acima)

# 6. Deploy
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

## ⚠️ Importante

- **NÃO esqueça de fazer backup do `.env.production`** antes de remover a pasta
- Se você tinha dados no banco, eles serão perdidos (a menos que tenha feito backup)
- Se quiser manter os dados do banco, faça backup antes:
  ```bash
  docker compose -f docker-compose.prod.yml --env-file .env.production exec db pg_dump -U postgres agilepm > ~/backup_$(date +%Y%m%d).sql
  ```

## 🔄 Restaurar Backup do Banco (Opcional)

Se você fez backup do banco:

```bash
# Após o deploy, restaurar backup
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T db psql -U postgres agilepm < ~/backup_YYYYMMDD.sql
```

