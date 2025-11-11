## Plano de Testes Automatizados

### 1. API (Jest/Supertest)
- [ ] **Webhooks**
  - Criar webhook (200, validação de campos obrigatório 400)
  - Disparo de eventos (mock de axios) e persistência de `webhook_logs`
- [ ] **Calendar iCal**
  - Exportação de tarefas (retorno `text/calendar`, conteúdo mínimo)
  - Importação `.ics` válido (cria tarefas) e inválido (400)
- [ ] **Analytics**
  - `/analytics/productivity` com filtros de projeto e intervalo
  - `/analytics/costs` retornando estrutura esperada
- [ ] **Templates/Clone**
  - Clonar projeto e sprint preservando relacionamentos

*Comandos:* `npm run test --workspace=@agilepm/api`

### 2. Frontend (React Testing Library)
- [ ] `CalendarView` renderiza eventos e dispara export/import
- [ ] `WebhookManager` estados de criação/edição e listagem
- [ ] `Analytics` renderiza gráficos mediante mock de API

*Comandos:* `npm run test --workspace=@agilepm/web`

### 3. E2E (Cypress ou Playwright)
- Fluxo crítico: login → criação de projeto → criação de tarefa → calendário → export/import → webhook log
- Dashboard analítico carregando com seed padrão

### 4. Integração Contínua
- Adicionar jobs de `npm ci`, `npm run lint`, `npm run test` em pipeline.
- Salvar artefatos de cobertura (`coverage/`).

> ✅ **Próximos passos:** priorizar testes de API (webhooks e calendar) e cobertura da importação iCal no frontend.
