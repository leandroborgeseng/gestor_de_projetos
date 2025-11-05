# Documentação do Banco de Dados - Agile Project Manager

## Visão Geral

Este documento descreve a estrutura completa do banco de dados do sistema Agile Project Manager, implementado usando **Prisma ORM** com **PostgreSQL**.

## Arquitetura Geral

O sistema foi projetado para gerenciar projetos ágeis com as seguintes funcionalidades:
- Gestão de usuários e permissões
- Gestão de projetos e tarefas
- Sistema Kanban com colunas customizáveis
- Sprints e planejamento
- Registro de horas trabalhadas
- Gestão de recursos e custos
- Relatórios financeiros

---

## Modelos de Dados

### 1. User (Usuário)

Representa os usuários do sistema com diferentes níveis de permissão.

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  name        String
  passwordHash String
  role        Role     @default(MEMBER)
  hourlyRate  Decimal? @db.Decimal(10,2)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relacionamentos
  projects    Project[]    // Projetos que o usuário é dono
  tasks       Task[]       // Tarefas atribuídas ao usuário
  timeEntries TimeEntry[]  // Registros de horas trabalhadas
}
```

**Campos:**
- `id`: Identificador único (CUID)
- `email`: Email único do usuário (usado para login)
- `name`: Nome completo
- `passwordHash`: Hash da senha (bcrypt)
- `role`: Papel no sistema (ADMIN, MANAGER, MEMBER)
- `hourlyRate`: Taxa horária para cálculo de custos (opcional)

**Relacionamentos:**
- `projects`: Projetos que o usuário é dono (owner)
- `tasks`: Tarefas atribuídas ao usuário (assignee)
- `timeEntries`: Registros de horas trabalhadas

**Enum Role:**
```
ADMIN   - Acesso total ao sistema
MANAGER - Pode gerenciar projetos e equipes
MEMBER  - Membro da equipe, pode criar tarefas
```

---

### 2. Project (Projeto)

Representa um projeto no sistema.

```prisma
model Project {
  id                String         @id @default(cuid())
  name              String
  description       String?
  defaultHourlyRate Decimal?       @db.Decimal(10,2)
  ownerId           String
  owner             User           @relation(fields: [ownerId], references: [id])
  sprints           Sprint[]
  tasks             Task[]
  columns           KanbanColumn[]
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt
}
```

**Campos:**
- `id`: Identificador único
- `name`: Nome do projeto
- `description`: Descrição opcional
- `defaultHourlyRate`: Taxa horária padrão para tarefas do projeto
- `ownerId`: ID do usuário responsável pelo projeto

**Relacionamentos:**
- `owner`: Usuário dono do projeto (relação 1:N)
- `sprints`: Sprints do projeto
- `tasks`: Tarefas do projeto
- `columns`: Colunas do Kanban board

**Lógica de Negócio:**
- Ao criar um projeto, são criadas automaticamente 5 colunas Kanban padrão:
  - Backlog (BACKLOG)
  - To Do (TODO)
  - In Progress (IN_PROGRESS)
  - Review (REVIEW)
  - Done (DONE)

---

### 3. KanbanColumn (Coluna Kanban)

Representa uma coluna no board Kanban de um projeto.

```prisma
model KanbanColumn {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title     String
  status    TaskStatus
  order     Int
  // Nota: createdAt e updatedAt não estão no schema atual
}
```

**Campos:**
- `id`: Identificador único
- `projectId`: Projeto ao qual a coluna pertence
- `title`: Título da coluna (ex: "Em Progresso")
- `status`: Status das tarefas nesta coluna (enum TaskStatus)
- `order`: Ordem de exibição na tela

**Relacionamentos:**
- `project`: Projeto ao qual pertence
- Tarefas são relacionadas pelo campo `status` (não há FK direta)

**Características:**
- Cada projeto tem suas próprias colunas
- Colunas podem ser reordenadas (campo `order`)
- Ao deletar um projeto, suas colunas são deletadas (Cascade)

---

### 4. Sprint (Sprint)

Representa uma sprint/iteração de um projeto.

```prisma
model Sprint {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name      String
  goal      String?
  startDate DateTime
  endDate   DateTime
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Campos:**
- `id`: Identificador único
- `projectId`: Projeto ao qual a sprint pertence
- `name`: Nome da sprint (ex: "Sprint 1 - MVP")
- `goal`: Objetivo da sprint (opcional)
- `startDate`: Data de início
- `endDate`: Data de término

**Relacionamentos:**
- `project`: Projeto ao qual pertence
- `tasks`: Tarefas atribuídas à sprint

**Lógica de Negócio:**
- Uma tarefa pode ter uma sprint associada (opcional)
- Tarefas sem sprint ficam no backlog geral
- Sprint pode ter múltiplas tarefas

---

### 5. Task (Tarefa)

Representa uma tarefa dentro de um projeto.

```prisma
model Task {
  id               String         @id @default(cuid())
  projectId        String
  project          Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sprintId         String?
  sprint           Sprint?        @relation(fields: [sprintId], references: [id], onDelete: SetNull)
  title            String
  description      String?
  status           TaskStatus     @default(BACKLOG)
  assigneeId       String?
  assignee         User?          @relation(fields: [assigneeId], references: [id], onDelete: SetNull)
  estimateHours    Decimal?       @db.Decimal(10,2)
  actualHours      Decimal?       @db.Decimal(10,2)
  hourlyRateOverride Decimal?    @db.Decimal(10,2)
  costOverride     Decimal?      @db.Decimal(10,2)
  startDate        DateTime?
  dueDate          DateTime?
  resourceId       String?
  resource         Resource?      @relation(fields: [resourceId], references: [id], onDelete: SetNull)
  order            Int            @default(0)
  timeEntries      TimeEntry[]
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}
```

**Campos:**
- `id`: Identificador único
- `projectId`: Projeto ao qual a tarefa pertence
- `sprintId`: Sprint associada (opcional)
- `title`: Título da tarefa
- `description`: Descrição detalhada (opcional)
- `status`: Status atual (enum TaskStatus)
- `assigneeId`: Usuário responsável (opcional)
- `estimateHours`: Horas estimadas para conclusão (Float, default: 0)
- `actualHours`: Horas realmente trabalhadas (Float, default: 0)
- `hourlyRateOverride`: Taxa horária customizada para esta tarefa
- `costOverride`: Custo fixo customizado (sobrescreve cálculo)
- `startDate`: Data de início planejada
- `dueDate`: Data de entrega
- `resourceId`: Recurso associado (opcional)
- `order`: Ordem na coluna Kanban

**Relacionamentos:**
- `project`: Projeto ao qual pertence
- `sprint`: Sprint associada (pode ser null)
- `assignee`: Usuário responsável (pode ser null)
- `resource`: Recurso utilizado (opcional)
- `timeEntries`: Registros de horas trabalhadas

**Enum TaskStatus:**
```
BACKLOG      - Tarefa no backlog
TODO         - A fazer
IN_PROGRESS  - Em progresso
REVIEW       - Em revisão
DONE         - Concluída
BLOCKED      - Bloqueada
```

**Cálculo de Custos:**
A ordem de prioridade para calcular o custo de uma tarefa é:
1. `costOverride` (se definido, usa este valor diretamente)
2. `actualHours * hourlyRateOverride` (se definido)
3. `actualHours * assignee.hourlyRate` (se assignee tem taxa)
4. `actualHours * project.defaultHourlyRate` (taxa padrão do projeto)
5. `estimateHours * [taxa acima]` (se actualHours não estiver definido ou for 0)

**Nota**: `actualHours` e `estimateHours` são do tipo `Float` (não `Decimal`), então podem ter valores decimais como 1.5 horas.

---

### 6. Resource (Recurso)

Representa recursos utilizados nos projetos (infraestrutura, licenças, etc.).

```prisma
model Resource {
  id        String   @id @default(cuid())
  name      String
  type      String
  unitCost  Decimal  @db.Decimal(10,2)
  unit      String   // "hour", "month", "unit"
  notes     String?
  tasks     Task[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Campos:**
- `id`: Identificador único
- `name`: Nome do recurso (ex: "Servidor Cloud")
- `type`: Tipo do recurso (ex: "infrastructure", "license")
- `unitCost`: Custo por unidade
- `unit`: Unidade de medida ("hour", "month", "unit")
- `notes`: Observações adicionais

**Relacionamentos:**
- `tasks`: Tarefas que utilizam este recurso

**Exemplos de Recursos:**
- Servidor Cloud: R$ 500/mês
- Licença de Software: R$ 200/mês
- Banco de Dados Cloud: R$ 300/mês
- CDN: R$ 50/mês

---

### 7. TimeEntry (Registro de Tempo)

Registra horas trabalhadas em tarefas específicas.

```prisma
model TimeEntry {
  id          String   @id @default(cuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  hours       Decimal  @db.Decimal(10,2)
  date        DateTime
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Campos:**
- `id`: Identificador único
- `taskId`: Tarefa na qual o tempo foi gasto
- `userId`: Usuário que trabalhou
- `hours`: Quantidade de horas trabalhadas (Float)
- `date`: Data em que o trabalho foi realizado (default: now())
- `notes`: Notas sobre o trabalho realizado (opcional)

**Relacionamentos:**
- `task`: Tarefa relacionada
- `user`: Usuário que registrou o tempo

**Lógica de Negócio:**
- Permite rastrear horas trabalhadas por tarefa e por usuário
- Pode ser usado para calcular `actualHours` de uma tarefa
- Útil para relatórios de produtividade

---

## Relacionamentos entre Modelos

### Diagrama de Relacionamentos

```
User (Dono)
  └──> Project (1:N)
        ├──> KanbanColumn (1:N)
        ├──> Sprint (1:N)
        │      └──> Task (1:N)
        └──> Task (1:N)
              ├──> User (Assignee) (N:1)
              ├──> Resource (N:1)
              └──> TimeEntry (1:N)
                    └──> User (N:1)
```

### Detalhamento dos Relacionamentos

1. **User → Project** (1:N)
   - Um usuário pode ser dono de múltiplos projetos
   - Um projeto tem um único dono

2. **Project → KanbanColumn** (1:N)
   - Um projeto tem múltiplas colunas Kanban
   - Colunas são deletadas quando projeto é deletado (Cascade)

3. **Project → Sprint** (1:N)
   - Um projeto tem múltiplas sprints
   - Sprints são deletadas quando projeto é deletado (Cascade)

4. **Project → Task** (1:N)
   - Um projeto tem múltiplas tarefas
   - Tarefas são deletadas quando projeto é deletado (Cascade)

5. **Sprint → Task** (1:N)
   - Uma sprint pode ter múltiplas tarefas
   - Tarefa pode não ter sprint (null = backlog)
   - Se sprint for deletada, tarefas ficam sem sprint (SetNull)

6. **User → Task** (N:1)
   - Um usuário pode ter múltiplas tarefas atribuídas
   - Tarefa pode não ter assignee (null)
   - Se usuário for deletado, tarefas ficam sem assignee (SetNull)

7. **Task → Resource** (N:1)
   - Uma tarefa pode usar um recurso
   - Um recurso pode ser usado em múltiplas tarefas
   - Tarefa pode não ter recurso (null)

8. **Task → TimeEntry** (1:N)
   - Uma tarefa pode ter múltiplos registros de tempo
   - Registros são deletados quando tarefa é deletada (Cascade)

9. **User → TimeEntry** (1:N)
   - Um usuário pode ter múltiplos registros de tempo
   - Registros são deletados quando usuário é deletado (Cascade)

---

## Cálculo de Custos

### Custo de uma Tarefa

O sistema calcula o custo de uma tarefa seguindo esta ordem de prioridade:

```javascript
function calculateTaskCost(task) {
  // 1. Se tem custo override, usa diretamente
  if (task.costOverride) {
    return task.costOverride;
  }
  
  // 2. Calcula horas efetivas
  const hours = task.actualHours || task.estimateHours || 0;
  
  // 3. Determina taxa horária (ordem de prioridade)
  let rate = 0;
  if (task.hourlyRateOverride) {
    rate = task.hourlyRateOverride;
  } else if (task.assignee?.hourlyRate) {
    rate = task.assignee.hourlyRate;
  } else if (task.project?.defaultHourlyRate) {
    rate = task.project.defaultHourlyRate;
  }
  
  return hours * rate;
}
```

### Custo Planejado vs Real

- **Planejado**: `estimateHours * rate`
- **Real**: `actualHours * rate` ou `costOverride`

### Custo de um Projeto

```javascript
totalPlanned = sum(tasks.map(t => t.estimateHours * effectiveRate(t)))
totalActual = sum(tasks.map(t => calculateTaskCost(t)))
```

---

## Índices e Performance

### Índices Implícitos (Criados por Prisma)

- `User.email` (unique)
- Todas as Foreign Keys (FK) criam índices automaticamente

### Índices Recomendados para Queries Frequentes

```sql
-- Busca de tarefas por projeto e status
CREATE INDEX idx_task_project_status ON "Task"("projectId", "status");

-- Busca de tarefas por assignee
CREATE INDEX idx_task_assignee ON "Task"("assigneeId") WHERE "assigneeId" IS NOT NULL;

-- Busca de sprints por projeto
CREATE INDEX idx_sprint_project ON "Sprint"("projectId");

-- Busca de time entries por tarefa e usuário
CREATE INDEX idx_timeentry_task_user ON "TimeEntry"("taskId", "userId");
```

---

## Migrações e Versionamento

O Prisma gerencia as migrações do banco de dados. Para aplicar mudanças:

```bash
# Criar nova migração após alterar schema.prisma
pnpm prisma migrate dev --name nome_da_migracao

# Aplicar migrações em produção
pnpm prisma migrate deploy
```

---

## Seed Data

O arquivo `prisma/seed.ts` popula o banco com dados de exemplo:
- 3 usuários (Admin, Manager, Member)
- 7 projetos com diferentes características
- Múltiplas sprints e tarefas
- Recursos de exemplo

Para executar o seed:
```bash
pnpm prisma db seed
```

---

## Boas Práticas Implementadas

1. **Cascading Deletes**: Projetos deletam suas colunas, sprints e tarefas
2. **SetNull**: Usuários deletados deixam tarefas sem assignee (preserva histórico)
3. **Soft Deletes**: Não implementado, mas pode ser adicionado com campo `deletedAt`
4. **Auditoria**: Campos `createdAt` e `updatedAt` em todos os modelos
5. **Validação**: Uso de Zod para validar inputs antes de salvar
6. **Tipos Seguros**: TypeScript garante type-safety em todo o código

---

## Queries Comuns

### Buscar Projetos com Resumo
```typescript
const projects = await prisma.project.findMany({
  include: {
    owner: { select: { id: true, name: true, email: true } },
    tasks: {
      include: {
        assignee: { select: { id: true, name: true, hourlyRate: true } }
      }
    }
  }
});
```

### Calcular Estatísticas de Projeto
```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    tasks: {
      include: {
        assignee: true,
        project: { select: { defaultHourlyRate: true } }
      }
    }
  }
});

// Calcular custos
const totalPlanned = project.tasks.reduce((sum, task) => {
  return sum + (task.estimateHours * getEffectiveRate(task));
}, 0);
```

---

## Considerações de Escalabilidade

1. **Paginação**: Implementada nos endpoints de listagem
2. **Índices**: Chaves estrangeiras já criam índices automaticamente
3. **Relacionamentos**: Eager loading apenas quando necessário
4. **Agregações**: Cálculos feitos em memória (pode ser otimizado com SQL puro)

---

## Próximas Melhorias Sugeridas

1. **Soft Deletes**: Adicionar campo `deletedAt` para evitar perda de dados
2. **Auditoria Completa**: Log de todas as mudanças importantes
3. **Tags/Categorias**: Sistema de tags para tarefas
4. **Comentários**: Modelo para comentários em tarefas
5. **Anexos**: Sistema de upload de arquivos
6. **Notificações**: Sistema de notificações para mudanças importantes
7. **Relacionamento Many-to-Many**: Usuários podem participar de múltiplos projetos

---

**Última atualização**: 2025-01-XX
**Versão do Prisma**: Verifique em `package.json`
**Versão do PostgreSQL**: 16 (via Docker)

