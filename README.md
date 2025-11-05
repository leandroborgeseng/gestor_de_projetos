# Agile Project Manager

Sistema completo de gerenciamento de projetos ágeis com Kanban, Gantt, Sprints e relatórios financeiros.

## 📚 Documentação

- **[Manual do Usuário](./MANUAL_DO_USUARIO.md)** - Guia completo para usuários finais
- **[Documentação do Banco de Dados](./DATABASE.md)** - Estrutura e relacionamentos do banco de dados

## Stack

- **Backend:** Node 20, TypeScript, Express, Prisma, PostgreSQL, Zod, JWT
- **Frontend:** React 18, React Router v6, TanStack Query, Zustand, dnd-kit, gantt-task-react, Tailwind

## 🚀 Como Rodar

### Pré-requisitos
- Node.js 20+ instalado
- Docker e Docker Compose instalados
- pnpm instalado (ou npm/yarn)

### Passo a Passo

1. **Criar arquivo .env na raiz do projeto:**
```bash
cat > .env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agilepm
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
PORT=4000
EOF
```

2. **Instalar dependências:**
```bash
# Na raiz do projeto
pnpm install

# Backend
cd apps/api
pnpm install

# Frontend
cd ../web
pnpm install
```

3. **Iniciar PostgreSQL:**
```bash
# Voltar para a raiz
cd ../..
docker-compose up -d
```

4. **Configurar banco de dados:**
```bash
cd apps/api
pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm prisma db seed
```

5. **Iniciar os servidores:**

**Terminal 1 - Backend:**
```bash
cd apps/api
pnpm dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/web
pnpm dev
```

6. **Acessar a aplicação:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

### 🔑 Credenciais de Teste

- Email: `admin@example.com`
- Senha: `admin123`

Outros usuários disponíveis:
- `manager@example.com` / `manager123`
- `member@example.com` / `member123`

## 📁 Estrutura

- `/apps/api` - Backend Express + Prisma
- `/apps/web` - Frontend React + Vite

## 🛠️ Comandos Úteis

```bash
# Resetar banco de dados
cd apps/api
pnpm prisma migrate reset
pnpm prisma db seed

# Ver logs do Docker
docker-compose logs -f db

# Parar o banco
docker-compose down
```

