# 🚀 Guia de Deploy em Produção

Este guia explica como fazer o deploy da aplicação Agile Project Manager em produção usando Docker Compose.

## 📋 Pré-requisitos

- Docker 20.10+ instalado
- Docker Compose 2.0+ instalado
- Acesso a um servidor (VPS, Cloud, etc.)
- Domínio configurado (opcional, mas recomendado)

## 🔧 Passo 1: Preparar o Ambiente

### 1.1. Clonar o Repositório

```bash
git clone <seu-repositorio>
cd projeto-project
```

### 1.2. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e configure:

```bash
cp .env.production.example .env.production
```

Edite o arquivo `.env.production` e configure:

```bash
# Gerar secrets fortes
openssl rand -base64 32  # Para JWT_SECRET
openssl rand -base64 32  # Para JWT_REFRESH_SECRET

# Configure as variáveis
POSTGRES_PASSWORD=sua_senha_forte_aqui
JWT_SECRET=seu_jwt_secret_aqui
JWT_REFRESH_SECRET=seu_refresh_secret_aqui
FRONTEND_URL=https://seu-dominio.com
VITE_API_URL=https://seu-dominio.com/api
```

## 🐳 Passo 2: Build e Deploy

### 2.1. Build das Imagens Docker

```bash
# Build de todas as imagens
docker-compose -f docker-compose.prod.yml build

# Ou build específico
docker-compose -f docker-compose.prod.yml build api
docker-compose -f docker-compose.prod.yml build web
```

### 2.2. Iniciar os Serviços

```bash
# Iniciar todos os serviços
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Ver logs
docker-compose -f docker-compose.prod.yml logs -f

# Ver status
docker-compose -f docker-compose.prod.yml ps
```

### 2.3. Executar Migrações do Banco

```bash
# Executar migrações
docker-compose -f docker-compose.prod.yml exec api pnpm prisma migrate deploy

# (Opcional) Executar seed para dados iniciais
docker-compose -f docker-compose.prod.yml exec api pnpm prisma db seed
```

## 🔒 Passo 3: Configurar SSL/HTTPS (Recomendado)

### 3.1. Usando Certbot (Let's Encrypt)

```bash
# Instalar certbot
sudo apt-get update
sudo apt-get install certbot

# Gerar certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Copiar certificados para o diretório nginx
sudo cp /etc/letsencrypt/live/seu-dominio.com/fullchain.pem ./nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/seu-dominio.com/privkey.pem ./nginx/ssl/key.pem
```

### 3.2. Configurar Nginx com SSL

Edite `nginx/nginx.conf` e descomente as seções HTTPS.

## 📊 Passo 4: Verificar o Deploy

### 4.1. Verificar Saúde dos Serviços

```bash
# Health check da API
curl http://localhost:4000/health

# Verificar logs
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs web
docker-compose -f docker-compose.prod.yml logs db
```

### 4.2. Acessar a Aplicação

- Frontend: `http://seu-servidor:80` ou `https://seu-dominio.com`
- API: `http://seu-servidor:4000` ou `https://seu-dominio.com/api`
- Swagger: `http://seu-servidor:4000/api-docs` ou `https://seu-dominio.com/api/api-docs`

## 🔄 Passo 5: Comandos Úteis

### 5.1. Gerenciamento de Containers

```bash
# Parar serviços
docker-compose -f docker-compose.prod.yml stop

# Iniciar serviços
docker-compose -f docker-compose.prod.yml start

# Reiniciar serviços
docker-compose -f docker-compose.prod.yml restart

# Parar e remover containers
docker-compose -f docker-compose.prod.yml down

# Parar, remover containers e volumes (CUIDADO!)
docker-compose -f docker-compose.prod.yml down -v
```

### 5.2. Atualizar a Aplicação

```bash
# 1. Fazer pull das mudanças
git pull

# 2. Rebuild das imagens
docker-compose -f docker-compose.prod.yml build

# 3. Parar serviços
docker-compose -f docker-compose.prod.yml down

# 4. Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# 5. Executar migrações (se houver)
docker-compose -f docker-compose.prod.yml exec api pnpm prisma migrate deploy
```

### 5.3. Backup do Banco de Dados

```bash
# Criar backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U postgres agilepm > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U postgres agilepm < backup.sql
```

### 5.4. Logs e Monitoramento

```bash
# Ver logs de todos os serviços
docker-compose -f docker-compose.prod.yml logs -f

# Ver logs de um serviço específico
docker-compose -f docker-compose.prod.yml logs -f api

# Ver últimas 100 linhas
docker-compose -f docker-compose.prod.yml logs --tail=100 api
```

## 🛠️ Passo 6: Configurações Avançadas

### 6.1. Usar Nginx como Reverse Proxy

Se quiser usar o Nginx como reverse proxy (recomendado para produção):

```bash
# Iniciar com Nginx
docker-compose -f docker-compose.prod.yml --profile with-proxy up -d
```

### 6.2. Configurar Firewall

```bash
# Permitir apenas portas necessárias
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 6.3. Configurar Auto-restart

O `docker-compose.prod.yml` já está configurado com `restart: unless-stopped`, então os containers reiniciarão automaticamente após reinicialização do servidor.

## 📝 Passo 7: Checklist de Produção

- [ ] Variáveis de ambiente configuradas
- [ ] Secrets JWT fortes gerados
- [ ] SSL/HTTPS configurado
- [ ] Firewall configurado
- [ ] Backup do banco de dados configurado
- [ ] Monitoramento configurado (opcional)
- [ ] Logs sendo coletados
- [ ] Testes de carga realizados
- [ ] Documentação atualizada

## 🐛 Troubleshooting

### Problema: Container não inicia

```bash
# Ver logs detalhados
docker-compose -f docker-compose.prod.yml logs api

# Verificar se o banco está acessível
docker-compose -f docker-compose.prod.yml exec api ping db
```

### Problema: Erro de conexão com banco

```bash
# Verificar se o banco está rodando
docker-compose -f docker-compose.prod.yml ps db

# Verificar logs do banco
docker-compose -f docker-compose.prod.yml logs db

# Testar conexão
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d agilepm
```

### Problema: Frontend não carrega

```bash
# Verificar se a API está acessível
curl http://localhost:4000/health

# Verificar variável VITE_API_URL
docker-compose -f docker-compose.prod.yml exec web env | grep VITE
```

## 📚 Recursos Adicionais

- [Documentação Docker Compose](https://docs.docker.com/compose/)
- [Documentação Prisma](https://www.prisma.io/docs)
- [Documentação Nginx](https://nginx.org/en/docs/)

## 🆘 Suporte

Em caso de problemas, verifique:
1. Logs dos containers
2. Variáveis de ambiente
3. Conectividade entre containers
4. Permissões de arquivos
5. Espaço em disco

