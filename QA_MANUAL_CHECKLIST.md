## Checklist de QA Manual

### Objetivo
Garantir que as funcionalidades entregues recentemente estejam funcionando de ponta a ponta antes do deploy final.

---

### 0. Contexto Multiempresa
- [ ] Efetuar login com credenciais da Alpha (`ceo@alpha.com` / `alpha123`) e validar empresa ativa.
- [ ] Usar o seletor de empresa para alternar para Beta (`diretoria@beta.com` / `beta123`) e conferir atualização de dados.
- [ ] Garantir que o header `X-Company-Id` está sendo enviado (inspecionar requisições principais).
- [ ] Confirmar que notificações, projetos e dashboards exibem apenas dados da empresa selecionada.

### 1. Dashboard Analítico
- [ ] Acessar `Analytics` com usuário manager/admin.
- [ ] Validar carregamento sem erros (console/Network).
- [ ] Verificar filtros de projeto e intervalo de datas.
- [ ] Confirmar renderização dos novos gráficos:
  - Pizza de distribuição de tarefas.
  - Área de evolução de produtividade por sprint.
  - Barras empilhadas de horas por projeto.
  - Radar de performance por membro (dados de exemplo/seed).
  - Tendência de custos com linhas planejado/real/variação.
- [ ] Testar exportação de dados (CSV/Excel) pré-existente.

### 2. Webhooks
- [ ] Criar webhook global e por projeto no `WebhookManager`.
- [ ] Validar criação/edição/remoção (mensagens de sucesso, listagem atualizada).
- [ ] Acionar eventos (criar/atualizar tarefa, sprint e comentário) e conferir logs.
- [ ] Verificar envio com secret (header `X-Webhook-Signature`).
- [ ] Confirmar docs Swagger `/api-docs` listando endpoints de webhooks.

### 3. Exportação e Importação iCal
- [ ] Na tela `Calendário`, exportar tarefas e sprints (.ics) e abrir em calendário externo.
- [ ] Importar arquivo `.ics` válido (contendo eventos) e confirmar criação de tarefas.
- [ ] Importar arquivo `.ics` inválido e conferir mensagem de erro.
- [ ] Assegurar que o calendário recarrega após importação (sem refresh manual).

### 4. Templates / Clonagem / Filtros
- [ ] Criar template a partir de projeto existente e gerar novo projeto a partir dele.
- [ ] Clonar projeto com opções (tarefas, sprints, membros) e validar resultado.
- [ ] Clonar sprint e verificar vinculação de tarefas.
- [ ] Salvar filtro em `Tasks`, aplicar e recuperar filtros rápidos.

### 5. Alertas Inteligentes e Badges
- [ ] Garantir exibição de badges de alerta em Kanban, Tasks e navbar.
- [ ] Ajustar configurações de alerta e validar persistência (Settings > Alertas).

### 6. Documentação Swagger
- [ ] Abrir `/api-docs` e validar se endpoints recentes estão descritos.
- [ ] Testar pelo Swagger ao menos um endpoint de cada grupo (Tasks, Sprints, Analytics, Webhooks, Calendar Import).

### 7. Regressão Rápida
- [ ] Login/logout.
- [ ] Fluxos principais: criação de projeto, criação/edição de tarefa, movimentação no Kanban.
- [ ] Verificar notificações, upload/download de anexos, comentários.

### Evidências
- Registrar prints ou gravações para pontos críticos (Analytics, Webhooks, iCal).
- Anotar bugs/enhancements encontrados nesta rodada.


