import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/axios.js";
import Navbar from "../components/Navbar.js";
import TaskStatusChart from "../components/TaskStatusChart.js";
import SearchBar from "../components/SearchBar.js";
import ProjectsDashboard from "../components/ProjectsDashboard.js";
import { getCurrentUser } from "../utils/user.js";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  assignee?: { id: string; name: string; email: string };
  project: { id: string; name: string };
  sprint?: { id: string; name: string };
  estimateHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
}

interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  owner: { id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
  totalTasks: number;
  tasksByStatus: Record<string, number>;
  completionPercentage: number;
  totalPlanned: number;
  totalActual: number;
  startDate: string | null;
  endDate: string | null;
}

export default function Projects() {
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [isTasksListExpanded, setIsTasksListExpanded] = useState(true);
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [sortColumn, setSortColumn] = useState<"name" | "progress" | "plannedCost" | "actualCost" | "period" | "createdAt" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Obter usuário atual (considerando personificação)
  const currentUser = getCurrentUser();
  const currentUserId = currentUser?.id || "";

  const { data: projects, isLoading } = useQuery<ProjectSummary[]>({
    queryKey: ["projects-summary", searchQuery, assigneeFilter, showMyTasks, currentUserId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      // Se "O que é meu" estiver ativo, usar o ID do usuário logado
      const assigneeIdToUse = showMyTasks ? currentUserId : assigneeFilter;
      if (assigneeIdToUse) params.append("assigneeId", assigneeIdToUse);
      return api.get(`/projects/summary?${params.toString()}`).then((res) => res.data);
    },
  });

  const { data: tasksByStatus, isLoading: isLoadingTasks } = useQuery<Task[]>({
    queryKey: ["tasks-by-status", selectedStatus, showMyTasks, currentUserId],
    queryFn: () => {
      if (!selectedStatus) return Promise.resolve([]);
      const params = new URLSearchParams({ status: selectedStatus });
      if (showMyTasks && currentUserId) {
        params.append("assigneeId", currentUserId);
      }
      return api.get(`/projects/tasks-by-status?${params.toString()}`).then((res) => res.data);
    },
    enabled: !!selectedStatus,
  });

  const filteredTasksByStatus = tasksByStatus;

  const handleStatusClick = (status: string) => {
    setSelectedStatus(status);
    setIsTasksListExpanded(true);
  };

  const statusLabels: Record<string, string> = {
    BACKLOG: "Backlog",
    TODO: "A Fazer",
    IN_PROGRESS: "Em Progresso",
    REVIEW: "Revisão",
    DONE: "Concluído",
    BLOCKED: "Bloqueado",
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSort = (column: "name" | "progress" | "plannedCost" | "actualCost" | "period" | "createdAt") => {
    if (sortColumn === column) {
      // Se já está ordenando por esta coluna, inverte a direção
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Se é uma nova coluna, começa com ascendente
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Ordenar projetos
  const sortedProjects = projects ? [...projects].sort((a, b) => {
    if (sortColumn === "name") {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      if (sortDirection === "asc") {
        return nameA.localeCompare(nameB, "pt-BR");
      } else {
        return nameB.localeCompare(nameA, "pt-BR");
      }
    }
    if (sortColumn === "progress") {
      const progressA = a.completionPercentage || 0;
      const progressB = b.completionPercentage || 0;
      if (sortDirection === "asc") {
        return progressA - progressB;
      } else {
        return progressB - progressA;
      }
    }
    if (sortColumn === "plannedCost") {
      const costA = a.totalPlanned || 0;
      const costB = b.totalPlanned || 0;
      if (sortDirection === "asc") {
        return costA - costB;
      } else {
        return costB - costA;
      }
    }
    if (sortColumn === "actualCost") {
      const costA = a.totalActual || 0;
      const costB = b.totalActual || 0;
      if (sortDirection === "asc") {
        return costA - costB;
      } else {
        return costB - costA;
      }
    }
    if (sortColumn === "period") {
      const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
      if (sortDirection === "asc") {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    }
    if (sortColumn === "createdAt") {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      if (sortDirection === "asc") {
        return dateA - dateB;
      } else {
        return dateB - dateA;
      }
    }
    return 0;
  }) : [];

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-end items-center mb-6">
          <div className="flex gap-2">
            <Link
              to="/access-management"
              className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-600 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Gerenciar Acessos
            </Link>
            <Link
              to="/users-management"
              className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Gerenciar Usuários
            </Link>
            <Link
              to="/projects-management"
              className="px-4 py-2 bg-orange-700 text-white rounded-md hover:bg-orange-600 flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Gerenciar Projetos
            </Link>
            <button
              onClick={() => {
                setShowMyTasks(!showMyTasks);
                setSelectedStatus(null); // Limpar filtro de status ao alternar
              }}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                showMyTasks
                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                  : "bg-yellow-700 text-white hover:bg-yellow-600"
              }`}
              title={showMyTasks ? "Mostrar todas as tarefas" : "Mostrar apenas minhas tarefas"}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Minhas Tarefas
            </button>
            <Link
              to="/projects/new"
              className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
            >
              + Novo Projeto
            </Link>
          </div>
        </div>

        {showMyTasks && (
          <div className="bg-indigo-900/20 border border-indigo-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm text-indigo-300">
                Mostrando apenas projetos e tarefas atribuídas a você
              </span>
              <button
                onClick={() => setShowMyTasks(false)}
                className="ml-auto text-xs text-indigo-400 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-800"
              >
                Mostrar todas
              </button>
            </div>
          </div>
        )}

        <ProjectsDashboard 
          onStatusClick={handleStatusClick}
          showMyTasks={showMyTasks}
          currentUserId={currentUserId}
        />

        <h2 className="text-2xl font-bold text-gray-100 mb-4">Projetos ativos:</h2>

        {/* Lista de Tarefas Filtradas */}
        {selectedStatus && (
          <div className="bg-gray-800 rounded-lg shadow-lg mb-6">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-100">
                  Tarefas: {statusLabels[selectedStatus]}
                  {showMyTasks && " (Minhas tarefas)"}
                </h2>
                {filteredTasksByStatus && (
                  <span className="text-sm text-gray-400">
                    ({filteredTasksByStatus.length} {filteredTasksByStatus.length === 1 ? "tarefa" : "tarefas"})
                  </span>
                )}
                {selectedStatus && (
                  <button
                    onClick={() => setSelectedStatus(null)}
                    className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-700"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsTasksListExpanded(!isTasksListExpanded)}
                className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
                aria-label={isTasksListExpanded ? "Recolher lista" : "Expandir lista"}
              >
                <svg
                  className={`w-5 h-5 transition-transform ${isTasksListExpanded ? "" : "rotate-180"}`}
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

            {isTasksListExpanded && (
              <div className="p-6">
                {isLoadingTasks ? (
                  <div className="text-center py-8 text-gray-400">Carregando tarefas...</div>
                ) : filteredTasksByStatus && filteredTasksByStatus.length > 0 ? (
                  <div className="space-y-3">
                    {filteredTasksByStatus.map((task) => (
                      <div
                        key={task.id}
                        className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-sm font-semibold text-gray-100">{task.title}</h3>
                              <Link
                                to={`/projects/${task.project.id}/tasks`}
                                className="text-xs text-indigo-400 hover:text-indigo-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {task.project.name}
                              </Link>
                            </div>
                            {task.description && (
                              <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                              {task.assignee && (
                                <span className="flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                  </svg>
                                  {task.assignee.name}
                                </span>
                              )}
                              {task.sprint && (
                                <span className="flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                  </svg>
                                  {task.sprint.name}
                                </span>
                              )}
                              {task.estimateHours && (
                                <span>Est: {task.estimateHours.toFixed(1)}h</span>
                              )}
                            </div>
                          </div>
                          <Link
                            to={`/projects/${task.project.id}/tasks`}
                            className="ml-4 text-indigo-400 hover:text-indigo-300 text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver →
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                    <div className="text-center py-8 text-gray-400">
                      {showMyTasks
                        ? `Você não possui tarefas com status ${statusLabels[selectedStatus]}`
                        : `Nenhuma tarefa encontrada com status ${statusLabels[selectedStatus]}`}
                    </div>
                )}
              </div>
            )}
          </div>
        )}

        <SearchBar
          searchQuery={searchQuery}
          assigneeFilter={assigneeFilter}
          onSearchChange={setSearchQuery}
          onAssigneeChange={setAssigneeFilter}
        />

        {(searchQuery || assigneeFilter) && projects && projects.length > 0 && (
          <div className="mb-4 text-sm text-gray-400">
            {projects.length} {projects.length === 1 ? "projeto encontrado" : "projetos encontrados"}
            {searchQuery && ` para "${searchQuery}"`}
            {assigneeFilter && " (filtrado por usuário)"}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Projeto</span>
                      {sortColumn === "name" && (
                        <svg
                          className={`w-4 h-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort("progress")}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span>Progresso</span>
                      {sortColumn === "progress" && (
                        <svg
                          className={`w-4 h-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort("plannedCost")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Custo Planejado</span>
                      {sortColumn === "plannedCost" && (
                        <svg
                          className={`w-4 h-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort("actualCost")}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Custo Real</span>
                      {sortColumn === "actualCost" && (
                        <svg
                          className={`w-4 h-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort("period")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Período</span>
                      {sortColumn === "period" && (
                        <svg
                          className={`w-4 h-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort("createdAt")}
                  >
                    <div className="flex items-center gap-2">
                      <span>Criado em</span>
                      {sortColumn === "createdAt" && (
                        <svg
                          className={`w-4 h-4 ${sortDirection === "asc" ? "" : "rotate-180"}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {sortedProjects && sortedProjects.length > 0 ? (
                  sortedProjects.map((project) => (
                    <tr
                      key={project.id}
                      className="hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <td
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={() => (window.location.href = `/projects/${project.id}/board`)}
                      >
                        <div className="flex flex-col">
                          <Link
                            to={`/projects/${project.id}/board`}
                            className="text-sm font-semibold text-gray-100 hover:text-indigo-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.name}
                          </Link>
                          {project.description && (
                            <p className="text-xs text-gray-400 mt-1 max-w-md">{project.description}</p>
                          )}
                          <div className="mt-2">
                            <TaskStatusChart
                              tasksByStatus={project.tasksByStatus}
                              totalTasks={project.totalTasks}
                            />
                          </div>
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap"
                        onClick={() => (window.location.href = `/projects/${project.id}/board`)}
                      >
                        <div className="flex flex-col items-center">
                          <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                            <div
                              className={`h-2.5 rounded-full ${
                                project.completionPercentage >= 80
                                  ? "bg-green-500"
                                  : project.completionPercentage >= 50
                                  ? "bg-yellow-500"
                                  : project.completionPercentage >= 25
                                  ? "bg-blue-500"
                                  : "bg-gray-400"
                              }`}
                              style={{ width: `${project.completionPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-100">
                            {project.completionPercentage}%
                          </span>
                          <span className="text-xs text-gray-400">
                            {project.tasksByStatus.DONE || 0} de {project.totalTasks} tarefas
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100"
                        onClick={() => (window.location.href = `/projects/${project.id}/board`)}
                      >
                        <div className="font-medium">{formatCurrency(project.totalPlanned)}</div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100"
                        onClick={() => (window.location.href = `/projects/${project.id}/board`)}
                      >
                        <div className="font-medium">{formatCurrency(project.totalActual)}</div>
                        {project.totalPlanned > 0 && (
                          <div
                            className={`text-xs mt-1 ${
                              project.totalActual > project.totalPlanned
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                          >
                            {project.totalActual > project.totalPlanned ? "+" : ""}
                            {formatCurrency(project.totalActual - project.totalPlanned)}
                          </div>
                        )}
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-400"
                        onClick={() => (window.location.href = `/projects/${project.id}/board`)}
                      >
                        <div className="text-xs">
                          {formatDate(project.startDate)} - {formatDate(project.endDate)}
                        </div>
                      </td>
                      <td
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-400"
                        onClick={() => (window.location.href = `/projects/${project.id}/board`)}
                      >
                        {formatDate(project.createdAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      {searchQuery || assigneeFilter ? (
                        <div>
                          <p className="mb-2">Nenhum projeto encontrado com os filtros aplicados.</p>
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setAssigneeFilter("");
                            }}
                            className="text-indigo-400 hover:underline"
                          >
                            Limpar filtros
                          </button>
                        </div>
                      ) : (
                        "Nenhum projeto encontrado. Crie um novo projeto para começar."
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
