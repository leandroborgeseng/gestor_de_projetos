import { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import api from "../lib/axios.js";
import EditTaskModal from "../components/EditTaskModal.js";
import CreateTaskModal from "../components/CreateTaskModal.js";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  assigneeId?: string;
  assignee?: { id: string; name: string; email: string };
  sprintId?: string;
  sprint?: { id: string; name: string };
  startDate?: string;
  dueDate?: string;
  estimateHours?: number;
  actualHours?: number;
  parentId?: string;
  parent?: { id: string; title: string };
  predecessorDependencies?: Array<{ predecessor: { id: string; title: string } }>;
  successorDependencies?: Array<{ successor: { id: string; title: string } }>;
}

export default function Tasks() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado para edição inline
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["all-tasks", id],
    queryFn: async () => {
      // Buscar todas as tarefas principais
      const response = await api.get(`/projects/${id}/tasks`);
      const mainTasks = response.data || [];
      
      // Incluir subtarefas junto com as tarefas principais
      const allTasks: Task[] = [];
      mainTasks.forEach((task: any) => {
        // Adicionar tarefa principal
        allTasks.push(task);
        // Adicionar subtarefas se existirem
        if (task.subtasks && task.subtasks.length > 0) {
          task.subtasks.forEach((subtask: any) => {
            allTasks.push({
              ...subtask,
              parent: { id: task.id, title: task.title },
              // Garantir que as dependências estejam presentes
              predecessorDependencies: subtask.predecessorDependencies || [],
              successorDependencies: subtask.successorDependencies || [],
              sprint: subtask.sprint || null,
            });
          });
        }
      });
      
      return allTasks;
    },
    enabled: !!id,
  });

  // Buscar usuários e sprints para dropdowns
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data),
  });

  const { data: sprints } = useQuery({
    queryKey: ["sprints", id],
    queryFn: () => api.get(`/projects/${id}/sprints`).then((res) => res.data),
    enabled: !!id,
  });

  // Mutation para atualizar tarefa inline
  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      api.patch(`/projects/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-tasks", id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      setEditingCell(null);
    },
  });

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleTaskUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["all-tasks", id] });
    queryClient.invalidateQueries({ queryKey: ["tasks", id] });
  };

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["all-tasks", id] });
    queryClient.invalidateQueries({ queryKey: ["tasks", id] });
  };

  // Função para iniciar edição inline
  const startEditing = (taskId: string, field: string, currentValue: any) => {
    setEditingCell({ taskId, field });
    if (field === "title") {
      setEditValue(currentValue || "");
    } else if (field === "status") {
      setEditValue(currentValue || "BACKLOG");
    } else if (field === "assigneeId") {
      setEditValue(currentValue || "");
    } else if (field === "sprintId") {
      setEditValue(currentValue || "");
    } else if (field === "startDate" || field === "dueDate") {
      setEditValue(
        currentValue ? new Date(currentValue).toISOString().split("T")[0] : ""
      );
    } else if (field === "estimateHours" || field === "actualHours") {
      setEditValue(currentValue?.toString() || "");
    }
  };

  // Função para salvar edição inline
  const saveEdit = (taskId: string, field: string, value?: string) => {
    if (!editingCell || editingCell.taskId !== taskId || editingCell.field !== field) return;

    // Usar o valor fornecido ou o valor do estado
    const valueToUse = value !== undefined ? value : editValue;

    const updateData: any = {};
    
    if (field === "title") {
      const trimmedValue = valueToUse.trim();
      if (trimmedValue) {
        updateData.title = trimmedValue;
      } else {
        setEditingCell(null);
        return;
      }
    } else if (field === "status") {
      updateData.status = valueToUse;
    } else if (field === "assigneeId") {
      updateData.assigneeId = valueToUse || null;
    } else if (field === "sprintId") {
      updateData.sprintId = valueToUse || null;
    } else if (field === "startDate") {
      updateData.startDate = valueToUse ? new Date(valueToUse).toISOString() : null;
    } else if (field === "dueDate") {
      updateData.dueDate = valueToUse ? new Date(valueToUse).toISOString() : null;
    } else if (field === "estimateHours") {
      const numValue = parseFloat(valueToUse);
      if (!isNaN(numValue) && numValue >= 0) {
        updateData.estimateHours = numValue;
      } else {
        setEditingCell(null);
        return;
      }
    } else if (field === "actualHours") {
      const numValue = parseFloat(valueToUse);
      if (!isNaN(numValue) && numValue >= 0) {
        updateData.actualHours = numValue;
      } else {
        setEditingCell(null);
        return;
      }
    }

    // Atualizar o estado também para manter consistência
    setEditValue(valueToUse);
    updateTaskMutation.mutate({ taskId, data: updateData });
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  // Focar no input quando iniciar edição
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement && inputRef.current.type === "text") {
        inputRef.current.select();
      }
    }
  }, [editingCell]);

  // Função para verificar se a tarefa está atrasada
  const isTaskOverdue = (task: Task): boolean => {
    if (!task.dueDate || task.status === "DONE") return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Função para verificar se está próxima do prazo (3 dias)
  const isTaskNearDue = (task: Task): boolean => {
    if (!task.dueDate || task.status === "DONE" || isTaskOverdue(task)) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 3 && daysUntilDue > 0;
  };

  // Função para verificar se está no prazo
  const isTaskOnTime = (task: Task): boolean => {
    if (!task.dueDate) return true;
    if (task.status === "DONE") return true;
    return !isTaskOverdue(task) && !isTaskNearDue(task);
  };

  // Filtrar tarefas
  const filteredTasks = (tasks || []).filter((task: Task) => {
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesSearch = 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.assignee?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      BACKLOG: "bg-gray-500",
      TODO: "bg-blue-500",
      IN_PROGRESS: "bg-yellow-500",
      REVIEW: "bg-purple-500",
      DONE: "bg-green-500",
      BLOCKED: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      BACKLOG: "Backlog",
      TODO: "A Fazer",
      IN_PROGRESS: "Em Progresso",
      REVIEW: "Revisão",
      DONE: "Concluído",
      BLOCKED: "Bloqueado",
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Carregando tarefas...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Tarefas</h2>
        <div className="flex gap-4 items-center">
          {/* Busca */}
          <input
            type="text"
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          
          {/* Filtro de Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Todos os Status</option>
            <option value="BACKLOG">Backlog</option>
            <option value="TODO">A Fazer</option>
            <option value="IN_PROGRESS">Em Progresso</option>
            <option value="REVIEW">Revisão</option>
            <option value="DONE">Concluído</option>
            <option value="BLOCKED">Bloqueado</option>
          </select>

          {/* Botão Nova Tarefa */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nova Tarefa
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tarefa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Responsável
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Sprint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Data Início
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Data Fim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Predecessoras
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Sucessoras
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Horas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-gray-400">
                    Nenhuma tarefa encontrada
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task: Task) => {
                  const isOverdue = isTaskOverdue(task);
                  const isNearDue = isTaskNearDue(task);
                  const isOnTime = isTaskOnTime(task);
                  
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-gray-700 transition-colors ${
                        isOverdue ? "bg-red-900/20 border-l-4 border-red-500" : ""
                      } ${
                        isNearDue ? "bg-yellow-900/20 border-l-4 border-yellow-500" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          {editingCell?.taskId === task.id && editingCell?.field === "title" ? (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(task.id, "title")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveEdit(task.id, "title");
                                } else if (e.key === "Escape") {
                                  cancelEdit();
                                }
                              }}
                              className="text-sm font-medium bg-gray-700 text-gray-100 px-2 py-1 rounded border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          ) : (
                            <div
                              className="text-sm font-medium text-gray-100 cursor-pointer hover:text-indigo-400 transition-colors"
                              onClick={() => startEditing(task.id, "title", task.title)}
                              title="Clique para editar"
                            >
                              {task.title}
                              {task.parent && (
                                <span className="ml-2 text-xs text-gray-400">
                                  (Subtarefa de: {task.parent.title})
                                </span>
                              )}
                            </div>
                          )}
                          {task.description && (
                            <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                              {task.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCell?.taskId === task.id && editingCell?.field === "status" ? (
                          <select
                            ref={inputRef as React.RefObject<HTMLSelectElement>}
                            value={editValue}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setEditValue(newValue);
                              saveEdit(task.id, "status", newValue);
                            }}
                            onBlur={() => saveEdit(task.id, "status")}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                cancelEdit();
                              }
                            }}
                            className="px-2 py-1 rounded text-xs font-medium bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          >
                            <option value="BACKLOG">Backlog</option>
                            <option value="TODO">A Fazer</option>
                            <option value="IN_PROGRESS">Em Progresso</option>
                            <option value="REVIEW">Revisão</option>
                            <option value="DONE">Concluído</option>
                            <option value="BLOCKED">Bloqueado</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                              task.status
                            )} text-white cursor-pointer hover:opacity-80 transition-opacity`}
                            onClick={() => startEditing(task.id, "status", task.status)}
                            title="Clique para editar"
                          >
                            {getStatusLabel(task.status)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {editingCell?.taskId === task.id && editingCell?.field === "assigneeId" ? (
                          <select
                            ref={inputRef as React.RefObject<HTMLSelectElement>}
                            value={editValue}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setEditValue(newValue);
                              saveEdit(task.id, "assigneeId", newValue);
                            }}
                            onBlur={() => saveEdit(task.id, "assigneeId")}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                cancelEdit();
                              }
                            }}
                            className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          >
                            <option value="">Sem responsável</option>
                            {users?.map((user: any) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`${
                              task.assignee
                                ? "bg-blue-900/30 text-blue-300 px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80"
                                : "text-gray-500 cursor-pointer hover:text-gray-400"
                            } transition-opacity`}
                            onClick={() => startEditing(task.id, "assigneeId", task.assigneeId)}
                            title="Clique para editar"
                          >
                            {task.assignee ? task.assignee.name : "Sem responsável"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {editingCell?.taskId === task.id && editingCell?.field === "sprintId" ? (
                          <select
                            ref={inputRef as React.RefObject<HTMLSelectElement>}
                            value={editValue}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setEditValue(newValue);
                              saveEdit(task.id, "sprintId", newValue);
                            }}
                            onBlur={() => saveEdit(task.id, "sprintId")}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") {
                                cancelEdit();
                              }
                            }}
                            className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            autoFocus
                          >
                            <option value="">Sem sprint</option>
                            {sprints?.map((sprint: any) => (
                              <option key={sprint.id} value={sprint.id}>
                                {sprint.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`${
                              task.sprint
                                ? "bg-indigo-900/30 text-indigo-300 px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80"
                                : "text-gray-500 cursor-pointer hover:text-gray-400"
                            } transition-opacity`}
                            onClick={() => startEditing(task.id, "sprintId", task.sprintId)}
                            title="Clique para editar"
                          >
                            {task.sprint ? task.sprint.name : "Sem sprint"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {editingCell?.taskId === task.id && editingCell?.field === "startDate" ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(task.id, "startDate")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveEdit(task.id, "startDate");
                              } else if (e.key === "Escape") {
                                cancelEdit();
                              }
                            }}
                            className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <span
                            className="cursor-pointer hover:text-indigo-400 transition-colors"
                            onClick={() => startEditing(task.id, "startDate", task.startDate)}
                            title="Clique para editar"
                          >
                            {task.startDate
                              ? new Date(task.startDate).toLocaleDateString("pt-BR")
                              : "-"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingCell?.taskId === task.id && editingCell?.field === "dueDate" ? (
                          <input
                            ref={inputRef as React.RefObject<HTMLInputElement>}
                            type="date"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => saveEdit(task.id, "dueDate")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                saveEdit(task.id, "dueDate");
                              } else if (e.key === "Escape") {
                                cancelEdit();
                              }
                            }}
                            className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        ) : (
                          <div
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => startEditing(task.id, "dueDate", task.dueDate)}
                            title="Clique para editar"
                          >
                            {task.dueDate ? (
                              <div className="flex flex-col">
                                <span
                                  className={
                                    isOverdue
                                      ? "text-red-400 font-medium"
                                      : isNearDue
                                      ? "text-yellow-400 font-medium"
                                      : "text-green-400"
                                  }
                                >
                                  {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                                </span>
                                {isOverdue && (
                                  <span className="text-xs text-red-400">Atrasada</span>
                                )}
                                {isNearDue && !isOverdue && (
                                  <span className="text-xs text-yellow-400">Próximo do prazo</span>
                                )}
                                {isOnTime && !isNearDue && !isOverdue && (
                                  <span className="text-xs text-green-400">No prazo</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-500">-</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {task.predecessorDependencies && task.predecessorDependencies.length > 0 ? (
                            task.predecessorDependencies.map((dep: any, idx: number) => (
                              <span
                                key={idx}
                                className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-xs"
                                title={dep.predecessor.title}
                              >
                                {dep.predecessor.title.length > 20
                                  ? dep.predecessor.title.substring(0, 20) + "..."
                                  : dep.predecessor.title}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {task.successorDependencies && task.successorDependencies.length > 0 ? (
                            task.successorDependencies.map((dep: any, idx: number) => (
                              <span
                                key={idx}
                                className="bg-orange-900/30 text-orange-300 px-2 py-1 rounded text-xs"
                                title={dep.successor.title}
                              >
                                {dep.successor.title.length > 20
                                  ? dep.successor.title.substring(0, 20) + "..."
                                  : dep.successor.title}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex flex-col gap-1">
                          {editingCell?.taskId === task.id && editingCell?.field === "estimateHours" ? (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="number"
                              step="0.5"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(task.id, "estimateHours")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveEdit(task.id, "estimateHours");
                                } else if (e.key === "Escape") {
                                  cancelEdit();
                                }
                              }}
                              className="w-20 px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="0"
                            />
                          ) : (
                            <span
                              className="cursor-pointer hover:text-indigo-400 transition-colors"
                              onClick={() => startEditing(task.id, "estimateHours", task.estimateHours)}
                              title="Clique para editar"
                            >
                              Est: {task.estimateHours ? task.estimateHours.toFixed(1) + "h" : "0h"}
                            </span>
                          )}
                          {editingCell?.taskId === task.id && editingCell?.field === "actualHours" ? (
                            <input
                              ref={inputRef as React.RefObject<HTMLInputElement>}
                              type="number"
                              step="0.5"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(task.id, "actualHours")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  saveEdit(task.id, "actualHours");
                                } else if (e.key === "Escape") {
                                  cancelEdit();
                                }
                              }}
                              className="w-20 px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              placeholder="0"
                            />
                          ) : (
                            <span
                              className="text-xs text-gray-400 cursor-pointer hover:text-indigo-400 transition-colors"
                              onClick={() => startEditing(task.id, "actualHours", task.actualHours)}
                              title="Clique para editar"
                            >
                              Real: {task.actualHours ? task.actualHours.toFixed(1) + "h" : "0h"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors"
                          title="Editar tarefa"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação */}
      {id && (
        <CreateTaskModal
          projectId={id}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleTaskCreated}
        />
      )}

      {/* Modal de Edição */}
      {selectedTask && (
        <EditTaskModal
          projectId={id || ""}
          task={selectedTask}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTask(null);
          }}
          onSuccess={handleTaskUpdated}
        />
      )}
    </div>
  );
}

