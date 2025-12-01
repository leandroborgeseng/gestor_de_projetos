import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/axios.js";
import CreateTaskModal from "../components/CreateTaskModal.js";
import EditTaskModal from "../components/EditTaskModal.js";

interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string;
  order?: number;
  assigneeId?: string;
  assignee?: { id?: string; name: string; email?: string };
  sprintId?: string;
  sprint?: { id?: string; name: string };
  estimateHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  subtasks?: Task[];
  tags?: Array<{ id: string; tag: { id: string; name: string; color: string } }>;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

const STATUS_OPTIONS = [
  { value: "BACKLOG", label: "Backlog", color: "bg-gray-500" },
  { value: "TODO", label: "A fazer", color: "bg-blue-500" },
  { value: "IN_PROGRESS", label: "Em progresso", color: "bg-yellow-500" },
  { value: "REVIEW", label: "Revisão", color: "bg-purple-500" },
  { value: "DONE", label: "Feito", color: "bg-green-500" },
  { value: "BLOCKED", label: "Parado", color: "bg-red-500" },
];

export default function MondayBoard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const { data: project } = useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => api.get(`/projects/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["tasks", id],
    queryFn: () => api.get(`/projects/${id}/tasks`).then((res) => res.data),
    enabled: !!id,
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      api.patch(`/projects/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    let filtered = tasks.filter((task) => !task.subtasks || task.subtasks.length === 0);
    
    if (searchQuery) {
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedStatus) {
      filtered = filtered.filter((task) => task.status === selectedStatus);
    }
    
    return filtered;
  }, [tasks, searchQuery, selectedStatus]);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTaskMutation.mutate({
      taskId,
      data: { status: newStatus },
    });
  };

  const handleAssigneeChange = (taskId: string, assigneeId: string | null) => {
    updateTaskMutation.mutate({
      taskId,
      data: { assigneeId },
    });
  };

  const handleDateChange = (taskId: string, field: "startDate" | "dueDate", value: string) => {
    updateTaskMutation.mutate({
      taskId,
      data: { [field]: value || null },
    });
  };

  const toggleRowExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusInfo = (status?: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  };

  const formatDate = (date?: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  };

  const getUserInitials = (user?: { name: string }) => {
    if (!user?.name) return "?";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Agile PM</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a
            href="/"
            className="block px-3 py-2 rounded hover:bg-gray-700 text-gray-300"
          >
            Página inicial
          </a>
          <a
            href="/projects"
            className="block px-3 py-2 rounded hover:bg-gray-700 text-gray-300"
          >
            Meu trabalho
          </a>
          <div className="pt-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Projetos
            </div>
            <a
              href={`/projects/${id}/board`}
              className="block px-3 py-2 rounded bg-gray-700 text-white"
            >
              {project?.name || "Projeto"}
            </a>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">{project?.name || "Projeto"}</h1>
            <div className="flex space-x-1">
              <button className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded">
                Quadro principal
              </button>
              <button
                onClick={() => navigate(`/projects/${id}/board`)}
                className="px-3 py-1 text-sm hover:bg-gray-700 rounded"
              >
                Kanban
              </button>
              <button
                onClick={() => navigate(`/projects/${id}/gantt`)}
                className="px-3 py-1 text-sm hover:bg-gray-700 rounded"
              >
                Gantt
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-700 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-700 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
            >
              + Criar elemento
            </button>
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-sm w-64 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={selectedStatus || ""}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-3 py-1 text-sm hover:bg-gray-700 rounded">Filtro</button>
            <button className="px-3 py-1 text-sm hover:bg-gray-700 rounded">Ordenar</button>
            <button className="px-3 py-1 text-sm hover:bg-gray-700 rounded">Agrupar por</button>
          </div>
        </div>

        {/* Board Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-800 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase min-w-[300px]">
                  Elemento
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase min-w-[150px]">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase min-w-[120px]">
                  Pessoa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase min-w-[120px]">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase min-w-[100px]">
                  Estimativa
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase min-w-[200px]">
                  Observação
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredTasks.map((task) => (
                <tr
                  key={task.id}
                  className="hover:bg-gray-800 cursor-pointer"
                  onClick={() => {
                    setSelectedTask(task);
                    setIsEditModalOpen(true);
                  }}
                >
                  <td className="px-4 py-3">
                    {task.subtasks && task.subtasks.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpansion(task.id);
                        }}
                        className="text-gray-400 hover:text-white"
                      >
                        {expandedRows.has(task.id) ? "▼" : "▶"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={task.status || "BACKLOG"}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(task.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`px-2 py-1 rounded text-xs font-medium text-white ${getStatusInfo(task.status).color} border-0 cursor-pointer`}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={task.assigneeId || ""}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleAssigneeChange(task.id, e.target.value || null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">Sem atribuição</option>
                      {users?.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="date"
                      value={task.dueDate ? task.dueDate.split("T")[0] : ""}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleDateChange(task.id, "dueDate", e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {task.estimateHours ? `${task.estimateHours}h` : "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 rounded text-xs"
                            style={{ backgroundColor: tag.tag.color + "20", color: tag.tag.color }}
                          >
                            {tag.tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nenhuma tarefa encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateTaskModal
          projectId={id!}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["tasks", id] });
          }}
        />
      )}

      {isEditModalOpen && selectedTask && (
        <EditTaskModal
          task={selectedTask}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTask(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setSelectedTask(null);
            queryClient.invalidateQueries({ queryKey: ["tasks", id] });
          }}
        />
      )}
    </div>
  );
}

