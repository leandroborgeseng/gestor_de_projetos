# 🚀 Deploy com Coolify

Guia completo para fazer deploy da aplicação Agile PM usando Coolify.

## 📋 Pré-requisitos

1. Coolify instalado e rodando
2. Acesso ao servidor onde o Coolify está instalado
3. Repositório Git configurado (GitHub, GitLab, etc.)

## 🎯 Opção 1: Deploy com Docker Compose (Recomendado)

### Passo 1: Criar Nova Aplicação no Coolify

1. Acesse o painel do Coolify
2. Clique em "New Resource" → "Docker Compose"
3. Configure:
   - **Name**: `agilepm`
   - **Repository**: URL do seu repositório Git
   - **Branch**: `main` (ou a branch que você usa)
   - **Docker Compose File**: `docker-compose.prod.yml`

### Passo 2: Configurar Variáveis de Ambiente

No Coolify, adicione as seguintes variáveis de ambiente:

#### Para o serviço `api`:
```
DATABASE_URL=postgresql://postgres:SUA_SENHA@postgres:5432/agilepm
JWT_SECRET=seu-jwt-secret-super-seguro-aqui
JWT_REFRESH_SECRET=seu-refresh-secret-super-seguro-aqui
PORT=4000
FRONTEND_URL=https://seu-dominio.com
NODE_ENV=production
```

#### Para o serviço `web`:
```
VITE_API_URL=https://seu-dominio.com
```

#### Para o serviço `db` (PostgreSQL):
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua-senha-super-segura
POSTGRES_DB=agilepm
```

### Passo 3: Configurar Banco de Dados

1. No Coolify, crie um novo recurso "PostgreSQL Database"
2. Configure:
   - **Name**: `agilepm-db`
   - **Database**: `agilepm`
   - **User**: `postgres`
   - **Password**: (defina uma senha segura)
3. Anote a URL de conexão e use no `DATABASE_URL` do serviço `api`

### Passo 4: Configurar Domínio

1. No Coolify, configure o domínio para o serviço `web`
2. Configure SSL/TLS (Let's Encrypt)
3. O Coolify automaticamente configurará o proxy reverso

### Passo 5: Deploy

1. Clique em "Deploy" no Coolify
2. Aguarde o build e deploy
3. Após o deploy, execute as migrações:

```bash
# No terminal do Coolify ou via SSH no servidor
docker exec agilepm-api pnpm prisma migrate deploy
docker exec agilepm-api pnpm prisma db seed
```

## 🎯 Opção 2: Deploy Separado (API + Frontend)

### Deploy da API

1. **Criar Nova Aplicação**:
   - Type: `Dockerfile`
   - Repository: URL do seu repositório
   - Dockerfile: `apps/api/Dockerfile`
   - Build Context: `/`

2. **Variáveis de Ambiente**:
   ```
   DATABASE_URL=postgresql://postgres:senha@postgres:5432/agilepm
   JWT_SECRET=seu-jwt-secret
   JWT_REFRESH_SECRET=seu-refresh-secret
   PORT=4000
   NODE_ENV=production
   ```

3. **Porta**: `4000`

4. **Health Check**: `/health`

### Deploy do Frontend

1. **Criar Nova Aplicação**:
   - Type: `Dockerfile`
   - Repository: URL do seu repositório
   - Dockerfile: `apps/web/Dockerfile`
   - Build Context: `/`

2. **Variáveis de Ambiente**:
   ```
   VITE_API_URL=https://api.seu-dominio.com
   ```

3. **Porta**: `80`

4. **Domínio**: Configure o domínio principal (ex: `app.seu-dominio.com`)

## 🔧 Configuração do Nginx no Coolify

O Coolify gerencia o nginx automaticamente, mas você pode precisar ajustar o proxy reverso.

### Para o Frontend

No Coolify, configure o proxy reverso para:
- **Path**: `/api/*`
- **Target**: `http://agilepm-api:4000`
- **Rewrite**: Remover `/api` do path

Ou use a configuração customizada do nginx (se disponível no Coolify):

```nginx
location /api/ {
    rewrite ^/api/(.*) /$1 break;
    proxy_pass http://agilepm-api:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 📝 Scripts Úteis

### Executar Migrações

```bash
# Via Coolify terminal ou SSH
docker exec agilepm-api pnpm prisma migrate deploy
```

### Executar Seed

```bash
docker exec agilepm-api pnpm prisma db seed
```

### Ver Logs

```bash
# Logs da API
docker logs agilepm-api -f

# Logs do Frontend
docker logs agilepm-web -f
```

## 🔑 Credenciais Padrão

Após executar o seed, use estas credenciais:

**SUPERADMIN:**
- Email: `superadmin@agilepm.com`
- Senha: `superadmin123`

**Alpha Tech Solutions:**
- Email: `ceo@alpha.com`
- Senha: `alpha123`

**Beta Logistics:**
- Email: `diretoria@beta.com`
- Senha: `beta123`

## 🐛 Troubleshooting

### API não está respondendo

1. Verifique os logs: `docker logs agilepm-api -f`
2. Verifique se o banco está acessível
3. Verifique as variáveis de ambiente

### Frontend não consegue conectar à API

1. Verifique se `VITE_API_URL` está correto
2. Verifique a configuração do proxy reverso no Coolify
3. Verifique os logs do nginx: `docker logs agilepm-web -f`

### Erro de migração

1. Execute manualmente: `docker exec agilepm-api pnpm prisma migrate deploy`
2. Verifique se o banco está acessível
3. Verifique a `DATABASE_URL`

## 📚 Recursos

- [Documentação do Coolify](https://coolify.io/docs)
- [Docker Compose no Coolify](https://coolify.io/docs/docker-compose)

