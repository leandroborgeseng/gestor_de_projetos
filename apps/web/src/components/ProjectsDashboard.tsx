import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface ProjectSummary {
  id: string;
  name: string;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  completionPercentage: number;
  totalPlanned: number;
  totalActual: number;
  totalPlannedHours: number;
  totalActualHours: number;
  startDate: string | null;
  endDate: string | null;
}

interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  totalPlannedCost: number;
  totalActualCost: number;
  costVariance: number;
  totalPlannedHours: number;
  totalActualHours: number;
  hoursVariance: number;
  averageCompletion: number;
  tasksByStatus: Record<string, number>;
  projectsByStatus: {
    completed: number;
    inProgress: number;
    notStarted: number;
  };
}

interface ProjectsDashboardProps {
  onStatusClick?: (status: string) => void;
  showMyTasks?: boolean;
  currentUserId?: string;
}

export default function ProjectsDashboard({ onStatusClick, showMyTasks = false, currentUserId }: ProjectsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: projects, isLoading } = useQuery<ProjectSummary[]>({
    queryKey: ["projects-summary", showMyTasks, currentUserId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (showMyTasks && currentUserId) {
        params.append("assigneeId", currentUserId);
      }
      return api.get(`/projects/summary?${params.toString()}`).then((res) => res.data);
    },
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="text-center text-gray-400">Carregando estatísticas...</div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return null;
  }

  // Calcular estatísticas agregadas
  const stats: DashboardStats = {
    totalProjects: projects.length,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalPlannedCost: 0,
    totalActualCost: 0,
    costVariance: 0,
    totalPlannedHours: 0,
    totalActualHours: 0,
    hoursVariance: 0,
    averageCompletion: 0,
    tasksByStatus: {},
    projectsByStatus: {
      completed: 0,
      inProgress: 0,
      notStarted: 0,
    },
  };

  let totalCompletion = 0;

  projects.forEach((project) => {
    stats.totalTasks += project.totalTasks;
    stats.totalPlannedCost += project.totalPlanned || 0;
    stats.totalActualCost += project.totalActual || 0;
    stats.totalPlannedHours += project.totalPlannedHours || 0;
    stats.totalActualHours += project.totalActualHours || 0;
    totalCompletion += project.completionPercentage;

    // Contar tarefas por status
    Object.entries(project.tasksByStatus).forEach(([status, count]) => {
      stats.tasksByStatus[status] = (stats.tasksByStatus[status] || 0) + count;
    });

    // Contar tarefas concluídas e em progresso
    stats.completedTasks += project.tasksByStatus.DONE || 0;
    stats.inProgressTasks +=
      (project.tasksByStatus.IN_PROGRESS || 0) +
      (project.tasksByStatus.REVIEW || 0);

    // Classificar projetos
    if (project.completionPercentage === 100) {
      stats.projectsByStatus.completed++;
    } else if (project.completionPercentage > 0) {
      stats.projectsByStatus.inProgress++;
    } else {
      stats.projectsByStatus.notStarted++;
    }
  });

  stats.costVariance = stats.totalActualCost - stats.totalPlannedCost;
  stats.hoursVariance = stats.totalActualHours - stats.totalPlannedHours;
  stats.averageCompletion = Math.round(totalCompletion / projects.length);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const statusLabels: Record<string, string> = {
    BACKLOG: "Backlog",
    TODO: "A Fazer",
    IN_PROGRESS: "Em Progresso",
    REVIEW: "Revisão",
    DONE: "Concluído",
    BLOCKED: "Bloqueado",
  };

  const statusColors: Record<string, string> = {
    BACKLOG: "bg-gray-500",
    TODO: "bg-blue-500",
    IN_PROGRESS: "bg-yellow-500",
    REVIEW: "bg-purple-500",
    DONE: "bg-green-500",
    BLOCKED: "bg-red-500",
  };

  const statusBorderColors: Record<string, string> = {
    BACKLOG: "border-gray-500/50",
    TODO: "border-blue-500/50",
    IN_PROGRESS: "border-yellow-500/50",
    REVIEW: "border-purple-500/50",
    DONE: "border-green-500/50",
    BLOCKED: "border-red-500/50",
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg mb-6">
      <div className="flex justify-between items-center p-6 border-b border-gray-700">
        <h2 className="text-2xl font-bold text-gray-100">Dashboard de Estatísticas</h2>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
          aria-label={isExpanded ? "Recolher dashboard" : "Expandir dashboard"}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? "" : "rotate-180"}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {isExpanded && (
        <div className="p-6">

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-indigo-500">
          <div className="text-xs text-gray-400 mb-1">Total de Projetos</div>
          <div className="text-2xl font-bold text-gray-100">{stats.totalProjects}</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="text-xs text-gray-400 mb-1">Total de Tarefas</div>
          <div className="text-2xl font-bold text-gray-100">{stats.totalTasks}</div>
          <div className="text-xs text-gray-400 mt-1">
            {stats.completedTasks} concluídas • {stats.inProgressTasks} em progresso
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500">
          <div className="text-xs text-gray-400 mb-1">Custo Planejado</div>
          <div className="text-lg font-bold text-gray-100 break-words">{formatCurrency(stats.totalPlannedCost)}</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-yellow-500">
          <div className="text-xs text-gray-400 mb-1">Custo Real</div>
          <div className="text-lg font-bold text-gray-100 break-words">{formatCurrency(stats.totalActualCost)}</div>
          <div className={`text-xs mt-1 ${stats.costVariance >= 0 ? "text-red-400" : "text-green-400"}`}>
            {stats.costVariance >= 0 ? "+" : ""}
            {formatCurrency(stats.costVariance)} de variação
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-cyan-500">
          <div className="text-xs text-gray-400 mb-1">Horas Planejadas</div>
          <div className="text-xl font-bold text-gray-100">{stats.totalPlannedHours.toFixed(1)}h</div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-orange-500">
          <div className="text-xs text-gray-400 mb-1">Horas Realizadas</div>
          <div className="text-xl font-bold text-gray-100">{stats.totalActualHours.toFixed(1)}h</div>
          <div className={`text-xs mt-1 ${stats.hoursVariance >= 0 ? "text-red-400" : "text-green-400"}`}>
            {stats.hoursVariance >= 0 ? "+" : ""}
            {stats.hoursVariance.toFixed(1)}h de variação
          </div>
        </div>
      </div>

      {/* Estatísticas de Progresso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Progresso Médio</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="w-full bg-gray-600 rounded-full h-4 mb-2">
                <div
                  className="bg-indigo-500 h-4 rounded-full transition-all"
                  style={{ width: `${stats.averageCompletion}%` }}
                />
              </div>
              <div className="text-2xl font-bold text-gray-100">{stats.averageCompletion}%</div>
              <div className="text-xs text-gray-400">Conclusão média dos projetos</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">Status dos Projetos</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-300">Concluídos</span>
              </div>
              <span className="text-gray-100 font-semibold">{stats.projectsByStatus.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-300">Em Progresso</span>
              </div>
              <span className="text-gray-100 font-semibold">{stats.projectsByStatus.inProgress}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-gray-300">Não Iniciados</span>
              </div>
              <span className="text-gray-100 font-semibold">{stats.projectsByStatus.notStarted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Distribuição de Tarefas por Status */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Distribuição de Tarefas por Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(stats.tasksByStatus)
            .sort(([a], [b]) => {
              const order = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([status, count]) => {
              const percentage =
                stats.totalTasks > 0 ? Math.round((count / stats.totalTasks) * 100) : 0;
              return (
                <div
                  key={status}
                  className={`rounded-lg border-2 ${statusBorderColors[status]} bg-gray-800 p-4 hover:bg-gray-700 transition-colors ${
                    onStatusClick ? "cursor-pointer" : ""
                  }`}
                  onClick={() => onStatusClick && count > 0 && onStatusClick(status)}
                  title={onStatusClick && count > 0 ? `Clique para ver ${count} tarefa${count !== 1 ? 's' : ''} com status ${statusLabels[status]}` : undefined}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
                    <span className="text-2xl font-bold text-gray-100">{count}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-300 mb-1">{statusLabels[status]}</div>
                  <div className="text-xs text-gray-400">{percentage}% do total</div>
                </div>
              );
            })}
        </div>
      </div>
        </div>
      )}
    </div>
  );
}

