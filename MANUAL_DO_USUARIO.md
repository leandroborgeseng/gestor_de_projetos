# Manual do Usuário - Agile Project Manager

## 📋 Índice

1. [Introdução](#introdução)
2. [Acesso ao Sistema](#acesso-ao-sistema)
3. [Dashboard de Projetos](#dashboard-de-projetos)
4. [Gerenciamento de Projetos](#gerenciamento-de-projetos)
5. [Board Kanban](#board-kanban)
6. [Gráfico de Gantt](#gráfico-de-gantt)
7. [Gestão de Tarefas](#gestão-de-tarefas)
8. [Sprints](#sprints)
9. [Pessoas e Recursos](#pessoas-e-recursos)
10. [Relatórios Financeiros](#relatórios-financeiros)
11. [Gerenciamento de Usuários](#gerenciamento-de-usuários)
12. [Gerenciamento de Acessos](#gerenciamento-de-acessos)
13. [Configurações](#configurações)
14. [Perfil do Usuário](#perfil-do-usuário)
15. [Dicas e Truques](#dicas-e-truques)

---

## Introdução

O **Agile Project Manager** é um sistema completo de gerenciamento de projetos ágeis que permite:

- 📊 Visualizar e gerenciar múltiplos projetos
- 📋 Organizar tarefas em um board Kanban
- 📅 Visualizar cronograma no gráfico de Gantt
- 🏃 Gerenciar sprints e acompanhar o progresso
- 💰 Controlar custos e gerar relatórios financeiros
- 👥 Gerenciar equipes e permissões
- 📈 Acompanhar métricas e estatísticas

---

## Acesso ao Sistema

### Login

1. Acesse a página de login do sistema
2. Digite seu **email** e **senha**
3. Clique em **"Entrar"**

### Credenciais de Teste

Para testar o sistema, você pode usar:

- **Admin:** `admin@example.com` / `admin123`
- **Gerente:** `manager@example.com` / `manager123`
- **Membro:** `member@example.com` / `member123`

---

## Dashboard de Projetos

O Dashboard é a primeira tela que você vê após fazer login. Aqui você tem uma visão geral de todos os seus projetos.

### Estatísticas Gerais

No topo da página, você verá um **Dashboard de Estatísticas** com:

- **Total de Projetos:** Quantidade de projetos ativos
- **Total de Tarefas:** Número total de tarefas
- **Custo Planejado:** Soma dos custos planejados de todos os projetos
- **Custo Real:** Soma dos custos reais de todos os projetos
- **Horas Planejadas:** Total de horas estimadas
- **Horas Realizadas:** Total de horas trabalhadas

### Distribuição de Tarefas por Status

Abaixo das estatísticas, você verá cards coloridos mostrando a distribuição de tarefas por status:

- **Backlog** (cinza)
- **A Fazer** (azul)
- **Em Progresso** (amarelo)
- **Revisão** (roxo)
- **Concluído** (verde)
- **Bloqueado** (vermelho)

**💡 Dica:** Clique em qualquer card de status para ver a lista de tarefas com aquele status.

### Filtro "Minhas Tarefas"

No topo da página, há um botão **"Minhas Tarefas"** (amarelo). Ao clicar nele:

- O dashboard mostrará apenas projetos e tarefas atribuídas a você
- Use este filtro para focar no seu trabalho

### Lista de Projetos

Abaixo do dashboard, você verá a **tabela de projetos** com as seguintes colunas:

#### Ordenação

Todas as colunas são **clicáveis** para ordenar:

- **Projeto:** Ordenação alfabética (A-Z / Z-A)
- **Progresso:** Por porcentagem de conclusão
- **Custo Planejado:** Por valor monetário
- **Custo Real:** Por valor monetário
- **Período:** Por data de início
- **Criado em:** Por data de criação

**Como usar:**
1. Clique no cabeçalho da coluna desejada
2. Um ícone de seta aparecerá indicando a direção da ordenação
3. Clique novamente para inverter a ordem

#### Visualizando um Projeto

- **Clique no nome do projeto** ou em qualquer linha da tabela para abrir o board Kanban do projeto
- Cada projeto mostra:
  - Nome e descrição
  - Gráfico de distribuição de tarefas por status
  - Barra de progresso com porcentagem
  - Custos planejados e reais
  - Período de execução
  - Data de criação

### Busca de Projetos

Use a barra de busca no topo para:

- Buscar projetos por nome ou descrição
- Filtrar por pessoa responsável
- A busca é instantânea e filtra os resultados em tempo real

---

## Gerenciamento de Projetos

### Acessando a Página de Gerenciamento

1. No topo da página inicial, clique no botão **"Gerenciar Projetos"**
2. Ou acesse diretamente pelo menu do usuário (canto superior direito)

### Funcionalidades Disponíveis

#### Criar Novo Projeto

1. Clique no botão **"+ Novo Projeto"** (canto superior direito)
2. Preencha os campos:
   - **Nome do Projeto:** Nome descritivo
   - **Descrição:** Detalhes sobre o projeto
   - **Taxa Horária Padrão:** Valor padrão para cálculos de custo
3. Clique em **"Criar Projeto"**

**💡 Nota:** O sistema criará automaticamente as colunas padrão do Kanban:
- Backlog
- To Do
- In Progress
- Review
- Done

#### Editar Projeto

1. Na lista de projetos, clique no ícone de **lápis** (✏️) ao lado do projeto
2. Modifique os campos desejados
3. Clique em **"Salvar Alterações"**

#### Arquivar Projeto

1. Clique no ícone de **arquivo** (📁) ao lado do projeto
2. Confirme a ação
3. O projeto será oculto das telas principais, mas permanecerá disponível no histórico

**Para desarquivar:**
1. Na página de gerenciamento, marque a opção **"Mostrar projetos arquivados"**
2. Clique no ícone de **desarquivar** (📂) ao lado do projeto arquivado

#### Deletar Projeto

⚠️ **ATENÇÃO:** Esta ação é irreversível e deletará todas as tarefas, sprints e dados relacionados.

1. Clique no ícone de **lixeira** (🗑️) ao lado do projeto
2. Confirme a exclusão

---

## Board Kanban

O Board Kanban é onde você visualiza e organiza as tarefas do projeto em colunas por status.

### Acessando o Board

1. Na página inicial, clique no **nome do projeto** na tabela
2. Ou navegue para `/projects/{id}/board`

### Visual do Board

O board é dividido em **colunas** representando diferentes status:

- **Backlog:** Tarefas ainda não planejadas
- **To Do:** Tarefas planejadas para fazer
- **In Progress:** Tarefas em execução
- **Review:** Tarefas em revisão
- **Done:** Tarefas concluídas

### Trabalhando com Tarefas

#### Criar Nova Tarefa

1. Clique no botão **"+ Nova Tarefa"** no topo do board
2. Preencha os campos:
   - **Título:** Nome da tarefa
   - **Descrição:** Detalhes da tarefa
   - **Status:** Status inicial
   - **Responsável:** Atribuir a um membro do time
   - **Sprint:** Vincular a uma sprint (opcional)
   - **Horas Estimadas:** Tempo previsto
   - **Data de Início:** Quando começar
   - **Data de Vencimento:** Prazo para conclusão
3. Clique em **"Criar Tarefa"**

#### Mover Tarefas (Drag & Drop)

1. **Clique e segure** uma tarefa
2. **Arraste** para a coluna desejada
3. **Solte** para mover a tarefa

**💡 Dica:** Ao arrastar uma tarefa sobre outra, ela se torna uma **subtarefa**!

#### Editar Tarefa

1. Clique no **ícone de lápis** (✏️) no card da tarefa
2. Modifique os campos desejados
3. Clique em **"Salvar Alterações"**

#### Criar Subtarefas

**Método 1 - Drag & Drop:**
1. Arraste uma tarefa sobre outra
2. A tarefa arrastada se torna subtarefa da outra

**Método 2 - Modal de Edição:**
1. Abra a tarefa para edição
2. No campo "Tarefa Pai", selecione a tarefa principal

**Visualização:**
- Tarefas com subtarefas mostram um **ícone de mini-board** no card
- As subtarefas aparecem agrupadas abaixo da tarefa principal

#### Gerenciar Dependências

As dependências definem relações entre tarefas:

- **Predecessora:** Tarefa que deve ser concluída antes desta
- **Sucessora:** Tarefa que depende desta ser concluída

**Como adicionar:**
1. Abra a tarefa para edição
2. Na seção "Dependências", clique em **"Adicionar Predecessora"** ou **"Adicionar Sucessora"**
3. Selecione a tarefa relacionada
4. Salve as alterações

---

## Gráfico de Gantt

O gráfico de Gantt mostra o cronograma visual de todas as tarefas do projeto.

### Acessando o Gantt

1. Dentro de um projeto, clique na aba **"Gantt"** no menu lateral

### Visualização

O gráfico mostra:

- **Linha do tempo:** Eixo horizontal com meses e datas
- **Tarefas:** Barras coloridas representando cada tarefa
- **Duração:** O comprimento da barra indica a duração da tarefa
- **Dependências:** Linhas conectando tarefas relacionadas

### Informações das Tarefas

Cada barra no Gantt mostra:

- Nome da tarefa
- Data de início e fim
- Responsável
- Status (cor da barra)

### Interação

- **Zoom:** Use o scroll do mouse para aproximar/afastar
- **Navegação:** Arraste o gráfico para navegar pelas datas
- **Visualizar detalhes:** Clique em uma tarefa para ver mais informações

---

## Gestão de Tarefas

A página de Tarefas oferece uma visão detalhada de todas as tarefas do projeto em formato de tabela.

### Acessando a Página de Tarefas

1. Dentro de um projeto, clique na aba **"Tarefas"** no menu lateral

### Visualização em Tabela

A tabela mostra todas as tarefas com:

- **Título**
- **Status**
- **Responsável**
- **Sprint**
- **Data de Início**
- **Data de Vencimento**
- **Horas Estimadas**
- **Horas Realizadas**

### Edição Inline

Você pode editar tarefas diretamente na tabela:

1. Clique no campo que deseja editar
2. Para campos de texto, digite diretamente
3. Para dropdowns (Status, Responsável, Sprint), selecione a opção desejada
4. As alterações são salvas automaticamente ao sair do campo

### Cores de Alerta

As tarefas são destacadas por cores:

- **Vermelho:** Tarefa atrasada (data de vencimento passou)
- **Amarelo:** Tarefa próxima do vencimento (3 dias ou menos)
- **Normal:** Tarefa dentro do prazo

### Criar Tarefa

1. Clique no botão **"+ Nova Tarefa"** no topo da página
2. Preencha os campos do formulário
3. Clique em **"Criar Tarefa"**

### Filtros

Use os filtros no topo para:

- Filtrar por status
- Filtrar por responsável
- Filtrar por sprint
- Buscar por texto

---

## Sprints

Sprints são iterações de trabalho com duração definida (geralmente 1-4 semanas).

### Acessando Sprints

1. Dentro de um projeto, clique na aba **"Sprints"** no menu lateral

### Visualização

Você verá uma lista de todas as sprints do projeto com:

- Nome da sprint
- Data de início e fim
- Meta (goal)
- Progresso visual

### Criar Nova Sprint

1. Clique no botão **"+ Nova Sprint"**
2. Preencha os campos:
   - **Nome:** Identificação da sprint
   - **Meta:** Objetivo principal da sprint
   - **Data de Início:** Quando a sprint começa
   - **Data de Fim:** Quando a sprint termina
3. Clique em **"Criar Sprint"**

### Editar Sprint

1. Clique no ícone de **lápis** (✏️) ao lado da sprint
2. Modifique os campos desejados
3. Clique em **"Salvar Alterações"**

### Adicionar Tarefas à Sprint

**Método 1 - Na página de Sprint:**
1. Abra a sprint para edição
2. Na seção "Tarefas", clique em **"Adicionar Tarefa"**
3. Selecione as tarefas desejadas
4. Salve as alterações

**Método 2 - Na tarefa:**
1. Abra a tarefa para edição
2. No campo "Sprint", selecione a sprint desejada
3. Salve as alterações

### Burndown Chart

O gráfico de Burndown mostra o progresso da sprint ao longo do tempo:

- **Linha ideal:** Progresso esperado (linha reta)
- **Linha real:** Progresso atual (linha curva)
- **Área verde:** Progresso acima do esperado
- **Área vermelha:** Progresso abaixo do esperado

**Como interpretar:**
- Se a linha real está acima da ideal = sprint está atrasada
- Se a linha real está abaixo da ideal = sprint está adiantada
- Quanto mais próximo da ideal, melhor o planejamento

---

## Pessoas e Recursos

### Gerenciar Pessoas

A página de Pessoas permite gerenciar membros do projeto.

#### Adicionar Membro ao Projeto

1. Selecione o projeto no dropdown (se não estiver dentro de um projeto)
2. Clique em **"Adicionar Membro"**
3. Selecione o usuário
4. Escolha a função:
   - **Gerente do Projeto:** Pode gerenciar o projeto
   - **Membro:** Acesso padrão ao projeto
5. Clique em **"Adicionar"**

#### Remover Membro

1. Na lista de membros, clique no ícone de **lixeira** (🗑️) ao lado do membro
2. Confirme a remoção

#### Alterar Função

1. Clique no dropdown de função ao lado do membro
2. Selecione a nova função
3. A alteração é salva automaticamente

### Recursos

Recursos são itens que podem ser associados a tarefas (serviços, licenças, infraestrutura, etc.).

#### Criar Recurso

1. Clique em **"+ Novo Recurso"**
2. Preencha os campos:
   - **Nome:** Nome do recurso
   - **Tipo:** Categoria (infrastructure, service, license, etc.)
   - **Custo Unitário:** Valor por unidade
   - **Unidade:** Medida (month, hour, unit, etc.)
   - **Notas:** Informações adicionais
3. Clique em **"Criar Recurso"**

#### Associar Recurso à Tarefa

1. Abra a tarefa para edição
2. No campo "Recurso", selecione o recurso desejado
3. Salve as alterações

---

## Relatórios Financeiros

Os relatórios financeiros fornecem uma visão detalhada dos custos do projeto.

### Acessando Relatórios

1. Dentro de um projeto, clique na aba **"Relatórios"**
2. Selecione **"Relatório Financeiro"**

### Visualização

O relatório mostra:

#### Resumo Financeiro

Três cards com:
- **Total Planejado:** Soma dos custos planejados
- **Total Real:** Soma dos custos reais
- **Variação:** Diferença entre real e planejado
  - Verde = gastou menos que o planejado
  - Vermelho = gastou mais que o planejado

#### Tabela Detalhada

A tabela mostra os custos agrupados por diferentes critérios.

### Agrupamento

No topo da página, você pode escolher como agrupar os dados:

- **Por Sprint:** Custos organizados por sprint
- **Por Pessoa:** Custos por responsável
- **Por Recurso:** Custos por recurso utilizado
- **Por Status:** Custos por status da tarefa

### Interpretação

- **Planejado:** Custo baseado em horas estimadas × taxa horária
- **Real:** Custo baseado em horas reais × taxa horária (ou custo override)
- **Variação:** Diferença entre real e planejado
- **Tarefas:** Quantidade de tarefas no grupo

---

## Gerenciamento de Usuários

⚠️ **Apenas Administradores** podem acessar esta funcionalidade.

### Acessando

1. No menu do usuário (canto superior direito), clique em **"Gerenciar Usuários"**
2. Ou acesse diretamente pelo botão na página inicial

### Funcionalidades

#### Criar Novo Usuário

1. Clique no botão **"+ Novo Usuário"**
2. Preencha todos os campos:
   - **Nome:** Nome completo
   - **Sobrenome:** Último nome
   - **Email:** Email único do usuário
   - **Senha:** Senha inicial
   - **Função:** ADMIN, MANAGER ou MEMBER
   - **Cargo:** Posição do usuário
   - **CEP:** CEP para busca automática de endereço
   - **Endereço:** Preenchido automaticamente ao buscar CEP
   - **Telefone:** Telefone fixo
   - **Celular:** Telefone móvel
   - **Taxa Horária:** Valor por hora para cálculos
3. Clique em **"Criar Usuário"**

**💡 Dica:** Ao digitar o CEP, o sistema busca automaticamente o endereço e preenche os campos.

#### Editar Usuário

1. Na lista de usuários, clique no ícone de **lápis** (✏️)
2. Modifique os campos desejados
3. Clique em **"Salvar Alterações"**

#### Resetar Senha

1. Clique no botão **"Resetar Senha"** ao lado do usuário
2. Confirme a ação
3. Uma nova senha será gerada e exibida

**⚠️ Importante:** Anote a nova senha antes de fechar o modal!

#### Buscar Usuários

Use a barra de busca para encontrar usuários por:
- Nome
- Email
- Cargo

---

## Gerenciamento de Acessos

Esta funcionalidade permite controlar quais usuários têm acesso a quais projetos.

### Acessando

1. No menu do usuário, clique em **"Gerenciar Acessos"**
2. Ou use o botão na página inicial

### Funcionamento

1. **Selecione um Projeto** no dropdown
2. Você verá a lista de membros do projeto
3. Para cada membro, você pode:
   - Alterar a função (Gerente do Projeto / Membro)
   - Remover do projeto

### Adicionar Usuário ao Projeto

1. No dropdown "Adicionar Membro", selecione o usuário
2. Escolha a função
3. Clique em **"Adicionar"**

---

## Configurações

⚠️ **Apenas Administradores** podem acessar as configurações.

### Acessando

1. No menu do usuário, clique em **"Configurações"**

### Configurações Gerais

#### Configurações de Email

- **Servidor SMTP:** Endereço do servidor de email
- **Porta:** Porta do servidor
- **Usuário:** Email de envio
- **Senha:** Senha do email
- **De:** Nome e email do remetente

#### Configurações de Arquivos

- **Tamanho Máximo:** Tamanho máximo permitido para uploads
- **Tipos Permitidos:** Extensões de arquivo permitidas

### Permissões

A tabela de permissões permite definir quais ações cada função pode realizar:

- **ADMIN:** Administrador do sistema
- **MANAGER:** Gerente de projeto
- **MEMBER:** Membro comum

Para cada recurso (projetos, tarefas, usuários, etc.), você pode definir:
- **Criar:** Pode criar novos itens
- **Ler:** Pode visualizar
- **Atualizar:** Pode editar
- **Deletar:** Pode excluir
- **Gerenciar:** Acesso total

**Como usar:**
1. Encontre a função e o recurso na tabela
2. Marque/desmarque as ações permitidas
3. As alterações são salvas automaticamente

---

## Perfil do Usuário

### Acessando o Perfil

1. No menu do usuário (canto superior direito), clique em **"Editar Conta"**

### Editar Informações

Você pode editar:

- Nome e sobrenome
- Email
- Cargo
- Endereço completo (com busca por CEP)
- Telefones
- Taxa horária

**💡 Dica:** Ao digitar o CEP, o sistema busca automaticamente o endereço.

### Alterar Senha

1. No modal de edição, clique em **"Alterar Senha"**
2. Digite a senha atual
3. Digite a nova senha
4. Confirme a nova senha
5. Clique em **"Salvar"**

---

## Funcionalidades Especiais

### Personificação de Usuários

⚠️ **Apenas Administradores** podem usar esta funcionalidade.

Permite que um administrador visualize o sistema como se fosse outro usuário, útil para:

- Testar funcionalidades
- Verificar permissões
- Resolver problemas de acesso

**Como usar:**
1. No menu do usuário, clique em **"Personificar Usuário"**
2. Selecione o usuário desejado
3. Clique em **"Personificar"**
4. O sistema será visualizado como se você fosse aquele usuário

**Para voltar:**
1. No menu do usuário, clique em **"Voltar ao meu perfil"**

**Visual:**
- Quando personificando, seu avatar fica amarelo
- O texto "(Personificando)" aparece ao lado do nome

---

## Dicas e Truques

### Atalhos e Boas Práticas

1. **Busca Rápida:**
   - Use a barra de busca no topo para encontrar projetos e tarefas rapidamente

2. **Ordenação Inteligente:**
   - Ordene a tabela de projetos por qualquer coluna para encontrar rapidamente o que precisa

3. **Filtro "Minhas Tarefas":**
   - Use o botão amarelo para focar apenas no seu trabalho

4. **Drag & Drop:**
   - Arraste tarefas entre colunas no Kanban para atualizar o status rapidamente
   - Arraste uma tarefa sobre outra para criar subtarefas

5. **Edição Inline:**
   - Na página de Tarefas, edite diretamente na tabela para agilizar

6. **Visualização de Progresso:**
   - Use o dashboard de estatísticas para uma visão geral rápida
   - Clique nos cards de status para ver tarefas específicas

7. **Gerenciamento de Custos:**
   - Configure taxas horárias para cálculos automáticos
   - Use custos override quando necessário

8. **Sprints:**
   - Crie sprints com metas claras
   - Acompanhe o burndown chart para identificar problemas cedo

9. **Dependências:**
   - Defina dependências entre tarefas para visualizar o caminho crítico no Gantt

10. **Arquivamento:**
    - Arquivar projetos antigos em vez de deletá-los mantém o histórico

---

## Solução de Problemas

### Não consigo fazer login

- Verifique se o email e senha estão corretos
- Entre em contato com o administrador para resetar a senha

### Não vejo um projeto

- Verifique se você tem acesso ao projeto
- Verifique se o projeto não está arquivado
- Entre em contato com o gerente do projeto

### Não consigo editar uma tarefa

- Verifique suas permissões no projeto
- Verifique se você é o responsável pela tarefa ou tem permissão de gerenciamento

### Custos não aparecem corretamente

- Verifique se as taxas horárias estão configuradas
- Verifique se as horas estimadas/realizadas estão preenchidas
- Verifique se há custos override configurados

### Tarefa não aparece no Gantt

- Verifique se a tarefa tem data de início e fim
- Verifique se você está visualizando o período correto

---

## Suporte

Para dúvidas ou problemas:

1. Consulte este manual primeiro
2. Entre em contato com o administrador do sistema
3. Verifique suas permissões se algo não estiver funcionando

---

**Versão do Manual:** 1.0  
**Última Atualização:** 2024

