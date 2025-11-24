# 🔧 Resolver Conflito de Porta 80

## Problema
A porta 80 já está em uso no servidor, impedindo o container `agilepm-web` de iniciar.

## Soluções Rápidas

### Opção 1: Usar Porta Alternativa (Recomendado)

No servidor, antes de executar o deploy:

```bash
cd /opt/apps/agilepm

# Usar porta 8080 para o frontend
export WEB_PORT=8080

# Executar deploy
./scripts/deploy.sh
```

Depois, acesse a aplicação em: `http://seu-servidor:8080`

### Opção 2: Parar Serviço que Usa Porta 80

**Verificar o que está usando a porta 80:**
```bash
# Ver processos usando porta 80
sudo lsof -i :80
# ou
sudo netstat -tulpn | grep :80

# Ver containers Docker usando porta 80
docker ps | grep :80
```

**Parar Nginx (se estiver rodando):**
```bash
sudo systemctl stop nginx
sudo systemctl disable nginx  # Para não iniciar automaticamente
```

**Parar Apache (se estiver rodando):**
```bash
sudo systemctl stop apache2
# ou
sudo systemctl stop httpd
sudo systemctl disable apache2
```

**Parar outros containers Docker:**
```bash
docker ps
docker stop <container-id>
```

### Opção 3: Configurar no .env.production

Edite o arquivo `.env.production` e adicione:

```bash
WEB_PORT=8080
```

Depois execute o deploy normalmente.

## Verificar Portas Disponíveis

```bash
# Ver todas as portas em uso
sudo netstat -tulpn | grep LISTEN

# Verificar porta específica
sudo lsof -i :80
sudo lsof -i :8080
```

## Após Resolver

Execute o deploy novamente:
```bash
cd /opt/apps/agilepm
git pull origin main
./scripts/deploy.sh
```

## Acesso à Aplicação

- **Frontend:** `http://seu-servidor:80` (ou porta configurada)
- **API:** `http://seu-servidor:4000`
- **Swagger:** `http://seu-servidor:4000/api-docs`

