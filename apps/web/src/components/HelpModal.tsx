import { useState } from "react";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const sections = [
    {
      id: "introducao",
      title: "Introdução",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            O <strong className="text-gray-100">Agile Project Manager</strong> é um sistema completo de gerenciamento de projetos ágeis que permite:
          </p>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li>Visualizar e gerenciar múltiplos projetos</li>
            <li>Organizar tarefas em um board Kanban</li>
            <li>Visualizar cronograma no gráfico de Gantt</li>
            <li>Gerenciar sprints e acompanhar o progresso</li>
            <li>Controlar custos e gerar relatórios financeiros</li>
            <li>Gerenciar equipes e permissões</li>
            <li>Acompanhar métricas e estatísticas</li>
          </ul>
        </div>
      ),
    },
    {
      id: "dashboard",
      title: "Dashboard de Projetos",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            O Dashboard é a primeira tela que você vê após fazer login. Aqui você tem uma visão geral de todos os seus projetos.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Estatísticas Gerais</h3>
          <p className="mb-4 text-gray-300">
            No topo da página, você verá um <strong className="text-gray-100">Dashboard de Estatísticas</strong> com:
          </p>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li><strong className="text-gray-100">Total de Projetos:</strong> Quantidade de projetos ativos</li>
            <li><strong className="text-gray-100">Total de Tarefas:</strong> Número total de tarefas</li>
            <li><strong className="text-gray-100">Custo Planejado:</strong> Soma dos custos planejados</li>
            <li><strong className="text-gray-100">Custo Real:</strong> Soma dos custos reais</li>
            <li><strong className="text-gray-100">Horas Planejadas:</strong> Total de horas estimadas</li>
            <li><strong className="text-gray-100">Horas Realizadas:</strong> Total de horas trabalhadas</li>
          </ul>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Distribuição de Tarefas</h3>
          <p className="mb-4 text-gray-300">
            Abaixo das estatísticas, você verá cards coloridos mostrando a distribuição de tarefas por status. 
            <span className="text-indigo-400"> Clique em qualquer card de status para ver a lista de tarefas com aquele status.</span>
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Filtro Minhas Tarefas</h3>
          <p className="mb-4 text-gray-300">
            O botão <strong className="text-yellow-400">"Minhas Tarefas"</strong> (amarelo) no topo da página filtra para mostrar apenas projetos e tarefas atribuídas a você.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Ordenação na Tabela</h3>
          <p className="mb-4 text-gray-300">
            Todas as colunas da tabela de projetos são <strong className="text-gray-100">clicáveis</strong> para ordenar:
          </p>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li><strong className="text-gray-100">Projeto:</strong> Ordenação alfabética (A-Z / Z-A)</li>
            <li><strong className="text-gray-100">Progresso:</strong> Por porcentagem de conclusão</li>
            <li><strong className="text-gray-100">Custo Planejado/Real:</strong> Por valor monetário</li>
            <li><strong className="text-gray-100">Período/Criado em:</strong> Por data</li>
          </ul>
          <p className="mb-4 text-gray-300">
            Clique no cabeçalho da coluna desejada. Um ícone de seta aparecerá indicando a direção da ordenação. Clique novamente para inverter.
          </p>
        </div>
      ),
    },
    {
      id: "kanban",
      title: "Board Kanban",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            O Board Kanban é onde você visualiza e organiza as tarefas do projeto em colunas por status.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Criar Nova Tarefa</h3>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>Clique no botão <strong className="text-gray-100">"+ Nova Tarefa"</strong> no topo do board</li>
            <li>Preencha os campos: título, descrição, status, responsável, sprint, horas, datas</li>
            <li>Clique em <strong className="text-gray-100">"Criar Tarefa"</strong></li>
          </ol>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Mover Tarefas</h3>
          <p className="mb-4 text-gray-300">
            <strong className="text-gray-100">Clique e segure</strong> uma tarefa, <strong className="text-gray-100">arraste</strong> para a coluna desejada e <strong className="text-gray-100">solte</strong> para mover.
          </p>
          <p className="mb-4 text-gray-300">
            <span className="text-indigo-400">💡 Dica:</span> Ao arrastar uma tarefa sobre outra, ela se torna uma <strong className="text-gray-100">subtarefa</strong>!
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Editar Tarefa</h3>
          <p className="mb-4 text-gray-300">
            Clique no <strong className="text-gray-100">ícone de lápis</strong> (✏️) no card da tarefa para editar.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Dependências</h3>
          <p className="mb-4 text-gray-300">
            Na edição da tarefa, você pode definir <strong className="text-gray-100">predecessoras</strong> (tarefas que devem ser concluídas antes) e <strong className="text-gray-100">sucessoras</strong> (tarefas que dependem desta).
          </p>
        </div>
      ),
    },
    {
      id: "gantt",
      title: "Gráfico de Gantt",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            O gráfico de Gantt mostra o cronograma visual de todas as tarefas do projeto.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Acessando</h3>
          <p className="mb-4 text-gray-300">
            Dentro de um projeto, clique na aba <strong className="text-gray-100">"Gantt"</strong> no menu lateral.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Visualização</h3>
          <p className="mb-4 text-gray-300">
            O gráfico mostra barras coloridas representando cada tarefa, com datas de início e fim. 
            Linhas conectam tarefas relacionadas (dependências).
          </p>
          <p className="mb-4 text-gray-300">
            Use o scroll do mouse para aproximar/afastar e arraste o gráfico para navegar pelas datas.
          </p>
        </div>
      ),
    },
    {
      id: "tarefas",
      title: "Gestão de Tarefas",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            A página de Tarefas oferece uma visão detalhada de todas as tarefas do projeto em formato de tabela.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Edição Inline</h3>
          <p className="mb-4 text-gray-300">
            Você pode editar tarefas diretamente na tabela: clique no campo que deseja editar e modifique. 
            Para dropdowns (Status, Responsável, Sprint), selecione a opção desejada. As alterações são salvas automaticamente.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Cores de Alerta</h3>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li><span className="text-red-400">Vermelho:</span> Tarefa atrasada</li>
            <li><span className="text-yellow-400">Amarelo:</span> Tarefa próxima do vencimento (3 dias ou menos)</li>
            <li><span className="text-gray-300">Normal:</span> Tarefa dentro do prazo</li>
          </ul>
        </div>
      ),
    },
    {
      id: "sprints",
      title: "Sprints",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            Sprints são iterações de trabalho com duração definida (geralmente 1-4 semanas).
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Criar Nova Sprint</h3>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>Clique no botão <strong className="text-gray-100">"+ Nova Sprint"</strong></li>
            <li>Preencha: nome, meta, data de início e fim</li>
            <li>Clique em <strong className="text-gray-100">"Criar Sprint"</strong></li>
          </ol>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Burndown Chart</h3>
          <p className="mb-4 text-gray-300">
            O gráfico de Burndown mostra o progresso da sprint ao longo do tempo. 
            Se a linha real está acima da ideal = sprint está atrasada. 
            Se está abaixo = sprint está adiantada.
          </p>
        </div>
      ),
    },
    {
      id: "relatorios",
      title: "Relatórios Financeiros",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            Os relatórios financeiros fornecem uma visão detalhada dos custos do projeto.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Agrupamento</h3>
          <p className="mb-4 text-gray-300">
            Você pode escolher como agrupar os dados:
          </p>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li><strong className="text-gray-100">Por Sprint:</strong> Custos organizados por sprint</li>
            <li><strong className="text-gray-100">Por Pessoa:</strong> Custos por responsável</li>
            <li><strong className="text-gray-100">Por Recurso:</strong> Custos por recurso utilizado</li>
            <li><strong className="text-gray-100">Por Status:</strong> Custos por status da tarefa</li>
          </ul>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Interpretação</h3>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li><strong className="text-gray-100">Planejado:</strong> Custo baseado em horas estimadas × taxa horária</li>
            <li><strong className="text-gray-100">Real:</strong> Custo baseado em horas reais × taxa horária</li>
            <li><strong className="text-gray-100">Variação Verde:</strong> Gastou menos que o planejado</li>
            <li><strong className="text-gray-100">Variação Vermelha:</strong> Gastou mais que o planejado</li>
          </ul>
        </div>
      ),
    },
    {
      id: "analytics",
      title: "Dashboard Analítico",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            Obtenha uma visão avançada de produtividade, custos e qualidade em um único painel.
          </p>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>No menu principal, acesse <strong className="text-gray-100">Analytics</strong>.</li>
            <li>Escolha o <strong className="text-gray-100">projeto</strong> e o período desejado.</li>
            <li>Analise os blocos de métricas gerais (tarefas concluídas, eficiência, velocity).</li>
          </ol>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Novos Gráficos</h3>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li><strong className="text-gray-100">Distribuição por Status:</strong> pizza com tarefas concluídas x em andamento.</li>
            <li><strong className="text-gray-100">Evolução por Sprint:</strong> gráfico de área com velocity e horas planejadas.</li>
            <li><strong className="text-gray-100">Horas por Projeto:</strong> barras empilhadas mostrando planejado vs variação.</li>
            <li><strong className="text-gray-100">Performance por Membro:</strong> radar comparando velocity, conclusão e eficiência.</li>
            <li><strong className="text-gray-100">Tendência de Custos:</strong> linhas de custo planejado, real e variação.</li>
          </ul>
          <img
            src="/help-screenshots/analytics-dashboard.png"
            alt="Dashboard Analítico"
            className="mt-4 rounded-lg border border-gray-700 shadow-lg"
          />
          <p className="text-gray-300">
            Use a aba <strong className="text-gray-100">Compare Projects</strong> para comparar projetos lado a lado.
          </p>
        </div>
      ),
    },
    {
      id: "calendar",
      title: "Calendário & iCal",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            Visualize todos os compromissos de tarefas e sprints em um calendário integrado com exportação/importação iCal.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Visualização</h3>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li>Acesse um projeto e clique na aba <strong className="text-gray-100">Calendário</strong>.</li>
            <li>Alterne entre <strong className="text-gray-100">Mês, Semana, Dia</strong> ou <strong className="text-gray-100">Agenda</strong>.</li>
            <li>Cores indicam status das tarefas e blocos dedicados representam as sprints.</li>
          </ul>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Exportar iCal</h3>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>Clique em <strong className="text-gray-100">Exportar Tarefas</strong> ou <strong className="text-gray-100">Exportar Sprints</strong>.</li>
            <li>Importe o arquivo `.ics` no Google Calendar, Outlook ou Apple Calendar.</li>
          </ol>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Importar iCal</h3>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>Clique em <strong className="text-gray-100">Importar iCal</strong> e selecione um arquivo `.ics`.</li>
            <li>As tarefas são criadas automaticamente e o calendário é recarregado com os novos eventos.</li>
          </ol>
          <p className="text-gray-300">
            Eventos sem datas ou com dados incompletos são ignorados para garantir consistência.
          </p>
          <img
            src="/help-screenshots/calendar-ical.png"
            alt="Calendário com importação iCal"
            className="mt-4 rounded-lg border border-gray-700 shadow-lg"
          />
        </div>
      ),
    },
    {
      id: "webhooks",
      title: "Webhooks",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            Configure notificações HTTP para integrar o Agile PM a outros sistemas.
          </p>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>No menu superior, abra o <strong className="text-gray-100">Centro de Notificações</strong> e clique em <strong className="text-gray-100">Webhooks</strong>.</li>
            <li>Use <strong className="text-gray-100">+ Novo Webhook</strong> para informar URL, eventos e secret (opcional).</li>
            <li>Defina se o webhook é global ou vinculado a um projeto específico.</li>
          </ol>
          <p className="text-gray-300 mb-4">
            A aba <strong className="text-gray-100">Logs</strong> exibe o histórico de tentativas, status e respostas.
          </p>
          <p className="text-gray-300">
            Consulte <code className="bg-gray-800 px-2 py-1 rounded text-sm text-indigo-300">/api-docs</code> para detalhes técnicos dos eventos disponíveis.
          </p>
          <img
            src="/help-screenshots/webhooks-logs.png"
            alt="Gerenciador de Webhooks"
            className="mt-4 rounded-lg border border-gray-700 shadow-lg"
          />
        </div>
      ),
    },
    {
      id: "alertas",
      title: "Alertas Inteligentes",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            Receba alertas visuais e notificações sobre tarefas atrasadas, bloqueadas ou com horas excedidas.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Badges nos Cards</h3>
          <ul className="list-disc ml-6 mb-4 space-y-2 text-gray-300">
            <li>Badges coloridos aparecem no Kanban, lista de tarefas e na navbar.</li>
            <li>Passe o mouse para ver detalhes do alerta.</li>
          </ul>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Configurações</h3>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>Acesse <strong className="text-gray-100">Configurações &gt; Alertas</strong>.</li>
            <li>Defina quais alertas deseja receber (prazos, bloqueios, horas).</li>
            <li>Ajuste limiares de dias e percentuais conforme a necessidade da equipe.</li>
          </ol>
          <p className="text-gray-300">
            Você pode ativar um resumo diário por e-mail para consolidar alertas críticos.
          </p>
          <img
            src="/help-screenshots/alert-badges.png"
            alt="Alertas inteligentes no Kanban"
            className="mt-4 rounded-lg border border-gray-700 shadow-lg"
          />
        </div>
      ),
    },
    {
      id: "templates",
      title: "Templates & Clone",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            Ganhe tempo reutilizando estruturas de projetos e sprints.
          </p>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Templates de Projeto</h3>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>Ao criar um projeto, selecione um template disponível.</li>
            <li>Crie seus próprios templates a partir de projetos existentes.</li>
          </ol>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Clonar Projeto</h3>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>No dashboard, clique em <strong className="text-gray-100">Opções &gt; Clonar Projeto</strong>.</li>
            <li>Escolha o que deseja copiar: tarefas, sprints, membros, tags.</li>
          </ol>
          <h3 className="text-xl font-bold text-gray-100 mt-6 mb-3">Clonar Sprint</h3>
          <p className="text-gray-300">
            Dentro de uma sprint, use <strong className="text-gray-100">Clonar Sprint</strong> para duplicar tarefas e manter a estrutura.
          </p>
          <img
            src="/help-screenshots/templates-clone.png"
            alt="Clonar projeto a partir de template"
            className="mt-4 rounded-lg border border-gray-700 shadow-lg"
          />
        </div>
      ),
    },
    {
      id: "filtros",
      title: "Filtros Salvos",
      content: (
        <div>
          <p className="mb-4 text-gray-300">
            Salve combinações de filtros para reutilizar rapidamente na página de Tarefas.
          </p>
          <ol className="list-decimal ml-6 mb-4 space-y-2 text-gray-300">
            <li>Abra o painel de filtros na página de Tarefas.</li>
            <li>Configure status, responsáveis, tags e outros critérios.</li>
            <li>Clique em <strong className="text-gray-100">Salvar Filtro</strong> e dê um nome.</li>
            <li>Acesse-os depois em <strong className="text-gray-100">Filtros Salvos</strong> ou use os filtros rápidos.</li>
          </ol>
          <p className="text-gray-300">
            Compartilhe filtros importantes com a equipe marcando-os como "Rápidos".
          </p>
          <img
            src="/help-screenshots/saved-filters.png"
            alt="Filtros salvos na tela de tarefas"
            className="mt-4 rounded-lg border border-gray-700 shadow-lg"
          />
        </div>
      ),
    },
    {
      id: "dicas",
      title: "Dicas e Truques",
      content: (
        <div>
          <ul className="list-disc ml-6 mb-4 space-y-3 text-gray-300">
            <li><strong className="text-gray-100">Busca Rápida:</strong> Use a barra de busca no topo para encontrar projetos e tarefas rapidamente</li>
            <li><strong className="text-gray-100">Ordenação Inteligente:</strong> Ordene a tabela de projetos por qualquer coluna para encontrar rapidamente o que precisa</li>
            <li><strong className="text-gray-100">Filtro "Minhas Tarefas":</strong> Use o botão amarelo para focar apenas no seu trabalho</li>
            <li><strong className="text-gray-100">Drag & Drop:</strong> Arraste tarefas entre colunas no Kanban para atualizar o status rapidamente</li>
            <li><strong className="text-gray-100">Subtarefas:</strong> Arraste uma tarefa sobre outra para criar subtarefas</li>
            <li><strong className="text-gray-100">Edição Inline:</strong> Na página de Tarefas, edite diretamente na tabela para agilizar</li>
            <li><strong className="text-gray-100">Visualização de Progresso:</strong> Use o dashboard de estatísticas para uma visão geral rápida</li>
            <li><strong className="text-gray-100">Gerenciamento de Custos:</strong> Configure taxas horárias para cálculos automáticos</li>
            <li><strong className="text-gray-100">Sprints:</strong> Crie sprints com metas claras e acompanhe o burndown chart</li>
            <li><strong className="text-gray-100">Arquivamento:</strong> Arquivar projetos antigos em vez de deletá-los mantém o histórico</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-[90vh] m-4 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-gray-100">Manual do Usuário</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex">
          {/* Menu Lateral */}
          <div className="w-64 bg-gray-700 border-r border-gray-600 overflow-y-auto p-4">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Índice</h3>
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    activeSection === section.id
                      ? "bg-indigo-600 text-white"
                      : "text-gray-300 hover:bg-gray-600 hover:text-white"
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection ? (
              sections.find((s) => s.id === activeSection)?.content
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-indigo-400 mb-6">Bem-vindo ao Manual do Usuário</h2>
                <p className="text-gray-300 mb-4">
                  Selecione um tópico no menu lateral para começar.
                </p>
                <div className="mt-8 p-4 bg-gray-700 rounded-lg">
                  <h3 className="text-xl font-bold text-gray-100 mb-3">Acesso Rápido</h3>
                  <p className="text-gray-300 mb-4">
                    Este manual contém informações sobre todas as funcionalidades do sistema. 
                    Use o menu lateral para navegar entre os tópicos.
                  </p>
                  <p className="text-gray-300">
                    Para mais informações detalhadas, consulte o arquivo <code className="bg-gray-800 px-2 py-1 rounded text-sm text-indigo-300">MANUAL_DO_USUARIO.md</code> na raiz do projeto.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

