import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";

export default function PublicProjectReport() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-project-report", token],
    queryFn: async () => {
      const response = await api.get(`/public/project/${token}`);
      return response.data;
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Relatório não encontrado</h1>
          <p className="text-gray-600">O link pode estar inválido ou expirado.</p>
        </div>
      </div>
    );
  }

  const { project, company, owner, statistics, tasks, tasksByAssignee, overdueTasks, upcomingTasks, sprints } = data;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              {company?.logoUrl && (
                <img src={company.logoUrl} alt={company.name} className="h-12 mb-4" />
              )}
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              {project.description && (
                <p className="text-gray-600 mt-2">{project.description}</p>
              )}
              <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <span>Empresa: {company?.name}</span>
                <span>•</span>
                <span>Responsável: {owner?.name}</span>
                <span>•</span>
                <span>Atualizado em: {new Date(project.updatedAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Total de Tarefas</div>
            <div className="text-3xl font-bold text-gray-900">{statistics.totalTasks}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Conclusão</div>
            <div className="text-3xl font-bold text-blue-600">{statistics.completionPercentage}%</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${statistics.completionPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Horas Estimadas</div>
            <div className="text-3xl font-bold text-gray-900">{statistics.totalEstimateHours}h</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-sm text-gray-500 mb-1">Horas Reais</div>
            <div className="text-3xl font-bold text-gray-900">{statistics.totalActualHours}h</div>
          </div>
        </div>

        {/* Status das Tarefas */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Status das Tarefas</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{statistics.tasksByStatus.BACKLOG}</div>
              <div className="text-sm text-gray-500">Backlog</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{statistics.tasksByStatus.TODO}</div>
              <div className="text-sm text-gray-500">A Fazer</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.tasksByStatus.IN_PROGRESS}</div>
              <div className="text-sm text-gray-500">Em Progresso</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{statistics.tasksByStatus.REVIEW}</div>
              <div className="text-sm text-gray-500">Revisão</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.tasksByStatus.DONE}</div>
              <div className="text-sm text-gray-500">Concluído</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.tasksByStatus.BLOCKED}</div>
              <div className="text-sm text-gray-500">Bloqueado</div>
            </div>
          </div>
        </div>

        {/* Tarefas Atrasadas e Próximas */}
        {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {overdueTasks.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-red-900 mb-4">
                  ⚠️ Tarefas Atrasadas ({overdueTasks.length})
                </h3>
                <div className="space-y-2">
                  {overdueTasks.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="bg-white rounded p-3">
                      <div className="font-medium text-gray-900">{task.title}</div>
                      <div className="text-sm text-gray-500">
                        Vencimento: {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                        {task.assignee && ` • ${task.assignee.name}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {upcomingTasks.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-yellow-900 mb-4">
                  📅 Próximas Tarefas ({upcomingTasks.length})
                </h3>
                <div className="space-y-2">
                  {upcomingTasks.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="bg-white rounded p-3">
                      <div className="font-medium text-gray-900">{task.title}</div>
                      <div className="text-sm text-gray-500">
                        Vencimento: {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                        {task.assignee && ` • ${task.assignee.name}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progresso das Sprints */}
        {sprints && sprints.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Progresso das Sprints</h2>
            <div className="space-y-4">
              {sprints.map((sprint: any) => {
                const statusBadge = sprint.isCompleted
                  ? "bg-green-100 text-green-800"
                  : sprint.isActive
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800";
                
                const statusLabel = sprint.isCompleted
                  ? "Concluída"
                  : sprint.isActive
                  ? "Em Andamento"
                  : "Planejada";

                return (
                  <div key={sprint.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{sprint.name}</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusBadge}`}>
                            {statusLabel}
                          </span>
                        </div>
                        {sprint.goal && (
                          <p className="text-sm text-gray-600 mb-2">{sprint.goal}</p>
                        )}
                        <div className="text-sm text-gray-500">
                          {new Date(sprint.startDate).toLocaleDateString("pt-BR")} -{" "}
                          {new Date(sprint.endDate).toLocaleDateString("pt-BR")}
                          {sprint.isActive && sprint.daysRemaining >= 0 && (
                            <span className="ml-2 font-medium text-blue-600">
                              • {sprint.daysRemaining} {sprint.daysRemaining === 1 ? "dia restante" : "dias restantes"}
                            </span>
                          )}
                          {sprint.isCompleted && (
                            <span className="ml-2 font-medium text-green-600">• Concluída</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">{sprint.completionPercentage}%</div>
                        <div className="text-sm text-gray-500">
                          {sprint.completedTasks}/{sprint.totalTasks} tarefas
                        </div>
                      </div>
                    </div>
                    
                    {/* Barra de progresso */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            sprint.isCompleted
                              ? "bg-green-600"
                              : sprint.isActive
                              ? "bg-blue-600"
                              : "bg-gray-400"
                          }`}
                          style={{ width: `${sprint.completionPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Estatísticas da sprint */}
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Tarefas</div>
                        <div className="font-semibold text-gray-900">
                          {sprint.completedTasks} de {sprint.totalTasks}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500">Horas Estimadas</div>
                        <div className="font-semibold text-gray-900">{sprint.totalEstimateHours}h</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Horas Reais</div>
                        <div className="font-semibold text-gray-900">{sprint.totalActualHours}h</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tarefas por Responsável */}
        {tasksByAssignee.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Tarefas por Responsável</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Concluídas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Em Progresso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasksByAssignee.map((assignee: any) => (
                    <tr key={assignee.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{assignee.name}</div>
                        {assignee.email && (
                          <div className="text-sm text-gray-500">{assignee.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignee.total}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{assignee.completed}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{assignee.inProgress}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignee.hours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Lista de Tarefas */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Todas as Tarefas</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarefa</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Responsável</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progresso</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task: any) => {
                  const statusColors: Record<string, string> = {
                    BACKLOG: "bg-gray-100 text-gray-800",
                    TODO: "bg-yellow-100 text-yellow-800",
                    IN_PROGRESS: "bg-blue-100 text-blue-800",
                    REVIEW: "bg-purple-100 text-purple-800",
                    DONE: "bg-green-100 text-green-800",
                    BLOCKED: "bg-red-100 text-red-800",
                  };

                  const statusLabels: Record<string, string> = {
                    BACKLOG: "Backlog",
                    TODO: "A Fazer",
                    IN_PROGRESS: "Em Progresso",
                    REVIEW: "Revisão",
                    DONE: "Concluído",
                    BLOCKED: "Bloqueado",
                  };

                  return (
                    <tr key={task.id} className={task.isOverdue ? "bg-red-50" : ""}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-500 mt-1">{task.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[task.status] || statusColors.BACKLOG}`}>
                          {statusLabels[task.status] || task.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.assignee?.name || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {task.estimateHours ? `${task.estimateHours}h` : "-"}
                        {task.actualHours && ` / ${task.actualHours}h`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {task.progress !== undefined && (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${task.progress}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-gray-600">{task.progress}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

