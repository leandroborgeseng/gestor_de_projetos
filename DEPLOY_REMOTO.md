# 🚀 Guia de Deploy Remoto

## Passos para fazer deploy no servidor remoto

### 1. Conectar ao servidor
```bash
ssh leandro@srv-leandro
# ou
ssh root@srv-leandro
```

### 2. Navegar para o diretório do projeto
```bash
cd /opt/apps/agilepm
```

### 3. Atualizar código do GitHub
```bash
git pull origin main
```

### 4. Executar deploy
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

O script vai:
- ✅ Fazer pull do GitHub automaticamente
- ✅ Parar containers existentes
- ✅ Construir novas imagens Docker
- ✅ Iniciar serviços
- ✅ Aguardar banco de dados ficar pronto
- ✅ Executar migrações
- ✅ Executar seed (se necessário)
- ✅ Verificar saúde dos serviços

### 5. Verificar status
```bash
# Ver logs
docker logs agilepm-api --tail 50
docker logs agilepm-web --tail 50

# Ver status dos containers
docker ps

# Testar API
curl http://localhost:4000/health
```

### 6. Se houver problemas

**Ver logs completos:**
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production logs -f
```

**Reiniciar um serviço específico:**
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production restart api
```

**Parar tudo:**
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.production down
```

**Rebuild completo:**
```bash
./scripts/deploy.sh
```

## 🔑 Credenciais de Acesso

Após o deploy, use as credenciais padrão:
- **Alpha Tech:** `ceo@alpha.com` / `alpha123`
- **Beta Logistics:** `diretoria@beta.com` / `beta123`

## 📝 Notas Importantes

- O script faz pull automático do GitHub antes do deploy
- Certifique-se de que o arquivo `.env.production` está configurado corretamente
- O banco de dados é preservado entre deploys (não é resetado)
- Migrações são executadas automaticamente

