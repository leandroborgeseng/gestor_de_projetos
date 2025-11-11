## Plano de Deploy & Monitoramento

### 1. Pré-deploy
- [ ] Executar checklist de QA manual (`QA_MANUAL_CHECKLIST.md`).
- [ ] Rodar testes automatizados disponíveis (`npm run test` em `apps/web` e `apps/api`).
- [ ] Garantir que `prisma migrate deploy` foi aplicado no ambiente alvo.
- [ ] Verificar variáveis de ambiente necessárias:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `FRONTEND_URL`
  - Configurações de SMTP (notificações)
- [ ] Ajustar `VITE_API_URL` (frontend) para apontar para a API de produção.

### 2. Pipeline sugerido
1. **Build:**
   - `npm install` (monorepo raiz)
   - `npm run build --workspace=@agilepm/api`
   - `npm run build --workspace=@agilepm/web`
2. **Banco:** `npx prisma migrate deploy`
3. **Seed (opcional):** `npm run prisma:seed --workspace=@agilepm/api` (apenas ambientes de teste)
4. **Deploy:**
   - API: copiar `apps/api/dist`, `node_modules` relevantes e executar `node dist/index.js`
   - Web: servir `apps/web/dist` via CDN ou static host

### 3. Monitoramento
- **Health-check:** endpoint `/health` na API (retorna `{ ok: true }`).
- **Logs:** habilitar `morgan` (já configurado). Integrar com stack (Datadog, ELK, etc.).
- **Webhooks:** acompanhar falhas via `webhook_logs` e exportar alertas se necessário.
- **Alertas internos:** revisar configurações de alertas na interface (Settings > Alertas).

### 4. Rollback rápido
- Manter backup do banco antes de aplicar migrações.
- Guardar build anterior da web (artefato).
- Se necessário, restaurar banco + reinstalar build anterior.

### 5. Pós-deploy
- [ ] Validar acesso (login) e fluxos principais.
- [ ] Confirmar funcionamento de webhooks e importação iCal em produção.
- [ ] Comunicar stakeholders (resumo das novas features).
- [ ] Atualizar documentação pública/changelog.

> ✅ **Sugestão:** automatizar build/test/deploy com GitHub Actions ou GitLab CI usando os comandos acima.
