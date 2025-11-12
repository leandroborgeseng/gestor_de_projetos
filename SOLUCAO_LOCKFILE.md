# 🔧 Solução para Erro de Lockfile

## Problema

O erro `ERR_PNPM_OUTDATED_LOCKFILE` ocorre quando o `pnpm-lock.yaml` não está sincronizado com os `package.json`.

## Solução Rápida no Ubuntu

### Opção 1: Atualizar lockfile no servidor (Recomendado)

```bash
cd /opt/apps/agilepm

# Fazer pull das últimas alterações
git pull

# Instalar dependências localmente para atualizar lockfile
pnpm install

# Commit e push do lockfile atualizado
git add pnpm-lock.yaml
git commit -m "chore: atualizar pnpm-lock.yaml"
git push
```

### Opção 2: Usar Dockerfile que atualiza automaticamente

O Dockerfile já foi atualizado para lidar com lockfile desatualizado. Basta fazer:

```bash
cd /opt/apps/agilepm
git pull
./scripts/deploy.sh
```

O Dockerfile vai:
1. Tentar instalar com `--frozen-lockfile` (mais rápido)
2. Se falhar, instalar sem frozen (atualiza o lockfile automaticamente)

## Verificar se está atualizado

```bash
# Ver status do git
git status

# Ver se há diferenças no lockfile
git diff pnpm-lock.yaml
```

## Se o problema persistir

```bash
# Remover node_modules e reinstalar
rm -rf node_modules
pnpm install

# Rebuild
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache api
```

