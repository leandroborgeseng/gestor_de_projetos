#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

API_DIR="$ROOT_DIR/apps/api"
WEB_DIR="$ROOT_DIR/apps/web"

choose_pm() {
  local dir="$1"

  if command -v pnpm >/dev/null 2>&1 && [[ -f "$dir/pnpm-lock.yaml" || -f "$ROOT_DIR/pnpm-lock.yaml" ]]; then
    echo "pnpm"
    return 0
  fi

  if command -v npm >/dev/null 2>&1; then
    echo "npm"
    return 0
  fi

  echo "Nenhum gerenciador de pacotes encontrado (npm ou pnpm)." >&2
  exit 1
}

install_deps() {
  local dir="$1"
  local pm="$2"

  case "$pm" in
    pnpm)
      (cd "$dir" && pnpm install)
      ;;
    npm)
      (cd "$dir" && npm install)
      ;;
    *)
      echo "Gerenciador de pacotes desconhecido: $pm" >&2
      exit 1
      ;;
  esac
}

run_dev() {
  local dir="$1"
  local pm="$2"
  local log_file="$3"
  local pid_file="$4"

  case "$pm" in
    pnpm)
      (cd "$dir" && nohup pnpm run dev >"$log_file" 2>&1 & echo $! > "$pid_file")
      ;;
    npm)
      (cd "$dir" && nohup npm run dev >"$log_file" 2>&1 & echo $! > "$pid_file")
      ;;
    *)
      echo "Gerenciador de pacotes desconhecido: $pm" >&2
      exit 1
      ;;
  esac
}

API_PM="$(choose_pm "$API_DIR")"
WEB_PM="$(choose_pm "$WEB_DIR")"

# Encerrar processos anteriores (ignorar erros)
pkill -f "apps/api" >/dev/null 2>&1 || true
pkill -f "apps/web" >/dev/null 2>&1 || true

# Instalar dependências (caso necessário)
install_deps "$API_DIR" "$API_PM"
install_deps "$WEB_DIR" "$WEB_PM"

# Iniciar ambos os serviços em background
run_dev "$API_DIR" "$API_PM" /tmp/api-dev.log /tmp/api-dev.pid
run_dev "$WEB_DIR" "$WEB_PM" /tmp/web-dev.log /tmp/web-dev.pid

echo "API dev rodando (PID $(cat /tmp/api-dev.pid)), logs em /tmp/api-dev.log"
echo "Web dev rodando (PID $(cat /tmp/web-dev.pid)), logs em /tmp/web-dev.log"
