# 🚀 Deploy Simples - Guia Rápido

Guia rápido para fazer deploy da aplicação em um servidor comum usando Docker.

## 📋 Pré-requisitos

1. Servidor Linux (Ubuntu/Debian recomendado)
2. Docker e Docker Compose instalados
3. Acesso SSH ao servidor
4. Porta 8080 disponível

## 🔧 Instalação do Docker (se necessário)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

## 📥 Clonar Repositório

```bash
cd /opt
sudo git clone https://github.com/seu-usuario/gestor_de_projetos.git agilepm
cd agilepm
```

## ⚙️ Configurar Variáveis de Ambiente

Crie o arquivo `.env.production`:

```bash
cat > .env.production << EOF
# Banco de Dados
POSTGRES_USER=postgres
POSTGRES_PASSWORD=sua-senha-super-segura-aqui
POSTGRES_DB=agilepm

# API
JWT_SECRET=seu-jwt-secret-super-seguro-mude-isso
JWT_REFRESH_SECRET=seu-refresh-secret-super-seguro-mude-isso
FRONTEND_URL=http://seu-servidor:8080

# Frontend
VITE_API_URL=http://seu-servidor:8080
EOF
```

**⚠️ IMPORTANTE:**
- Substitua `sua-senha-super-segura-aqui` por uma senha forte
- Substitua `seu-jwt-secret-super-seguro-mude-isso` por um secret aleatório
- Substitua `seu-refresh-secret-super-seguro-mude-isso` por outro secret aleatório
- Substitua `seu-servidor` pelo IP ou domínio do seu servidor

## 🚀 Deploy

Execute o script de deploy:

```bash
chmod +x scripts/deploy-simple.sh
./scripts/deploy-simple.sh
```

O script vai:
1. ✅ Verificar pré-requisitos
2. ✅ Limpar containers antigos
3. ✅ Construir imagens Docker
4. ✅ Iniciar serviços
5. ✅ Aguardar banco de dados
6. ✅ Executar migrações
7. ✅ Executar seed (criar usuários de teste)

## 🌐 Acessar Aplicação

Após o deploy, acesse:

- **Frontend**: `http://seu-servidor:8080`
- **API**: `http://seu-servidor:4000`
- **Swagger**: `http://seu-servidor:4000/api-docs`

## 🔑 Credenciais de Teste

Após o seed, use estas credenciais:

**SUPERADMIN:**
- Email: `superadmin@agilepm.com`
- Senha: `superadmin123`

**Alpha Tech Solutions:**
- Email: `ceo@alpha.com`
- Senha: `alpha123`

**Beta Logistics:**
- Email: `diretoria@beta.com`
- Senha: `beta123`

## 📊 Comandos Úteis

### Ver logs
```bash
# Todos os serviços
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f

# Apenas API
docker logs agilepm-api -f

# Apenas Frontend
docker logs agilepm-web -f

# Apenas Banco
docker logs agilepm-db -f
```

### Parar serviços
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production down
```

### Reiniciar serviços
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production restart
```

### Rebuild e redeploy
```bash
./scripts/deploy-simple.sh
```

### Executar migrações manualmente
```bash
docker exec agilepm-api pnpm prisma migrate deploy
```

### Executar seed manualmente
```bash
docker exec agilepm-api pnpm prisma db seed
```

### Ver status dos containers
```bash
docker ps | grep agilepm
```

## 🐛 Troubleshooting

### Porta 8080 já está em uso

```bash
# Ver o que está usando a porta
sudo lsof -i :8080

# Parar o processo ou usar outra porta
# Edite docker-compose.prod.yml e mude "8080:80" para "8081:80"
```

### API não está respondendo

```bash
# Ver logs da API
docker logs agilepm-api -f

# Verificar se o container está rodando
docker ps | grep agilepm-api

# Verificar conectividade
curl http://localhost:4000/health
```

### Frontend não consegue conectar à API

1. Verifique se `VITE_API_URL` no `.env.production` está correto
2. Verifique os logs do nginx: `docker logs agilepm-web -f`
3. Teste o proxy: `curl http://localhost:8080/api/health`

### Erro de migração

```bash
# Executar migrações manualmente
docker exec agilepm-api pnpm prisma migrate deploy

# Ver logs
docker logs agilepm-api | grep -i migration
```

### Container não inicia

```bash
# Ver logs detalhados
docker logs agilepm-api --tail 50
docker logs agilepm-web --tail 50
docker logs agilepm-db --tail 50

# Verificar variáveis de ambiente
docker exec agilepm-api env | grep -E "DATABASE|JWT"
```

## 🔒 Segurança

1. **Altere as senhas padrão** no `.env.production`
2. **Use secrets fortes** para JWT_SECRET e JWT_REFRESH_SECRET
3. **Configure firewall** para permitir apenas portas necessárias
4. **Use HTTPS** em produção (configure nginx reverso proxy com SSL)

## 📚 Próximos Passos

- Configurar domínio personalizado
- Configurar SSL/HTTPS
- Configurar backup do banco de dados
- Configurar monitoramento
- Otimizar performance

