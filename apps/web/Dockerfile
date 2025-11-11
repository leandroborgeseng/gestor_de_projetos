# Dockerfile para Web (Frontend)
FROM node:20-alpine AS base

# Instalar pnpm
RUN npm install -g pnpm

# Stage 1: Dependencies
FROM base AS deps
WORKDIR /app

# Copiar arquivos de dependências
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/

# Instalar dependências
RUN pnpm install --frozen-lockfile

# Stage 2: Build
FROM base AS builder
WORKDIR /app

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Copiar código fonte
COPY . .

# Build da aplicação
WORKDIR /app/apps/web
RUN pnpm build

# Stage 3: Production com Nginx
FROM nginx:alpine AS runner

# Copiar arquivos buildados
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copiar configuração do Nginx
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

