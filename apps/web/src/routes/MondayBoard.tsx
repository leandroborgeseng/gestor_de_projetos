import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

type ColumnType = "text" | "status" | "person" | "date" | "number" | "tags" | "subtasks";

interface ColumnConfig {
  id: string;
  type: ColumnType;
  label: string;
  visible: boolean;
  order: number;
}

const STATUS_OPTIONS = [
  { value: "BACKLOG", label: "Backlog", color: "bg-gray-500" },
  { value: "TODO", label: "A fazer", color: "bg-blue-500" },
  { value: "IN_PROGRESS", label: "Em progresso", color: "bg-yellow-500" },
  { value: "REVIEW", label: "Revisão", color: "bg-purple-500" },
  { value: "DONE", label: "Feito", color: "bg-green-500" },
  { value: "BLOCKED", label: "Parado", color: "bg-red-500" },
];

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: "expand", type: "subtasks", label: "", visible: true, order: 0 },
  { id: "title", type: "text", label: "Elemento", visible: true, order: 1 },
  { id: "status", type: "status", label: "Status", visible: true, order: 2 },
  { id: "assignee", type: "person", label: "Pessoa", visible: true, order: 3 },
  { id: "dueDate", type: "date", label: "Data", visible: true, order: 4 },
  { id: "estimateHours", type: "number", label: "Estimativa", visible: true, order: 5 },
  { id: "actualHours", type: "number", label: "Realizado", visible: true, order: 6 },
  { id: "tags", type: "tags", label: "Tags", visible: true, order: 7 },
];

type GroupBy = "none" | "status" | "assignee" | "sprint";

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
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  // Organizar tarefas em árvore (pais e filhos)
  const taskTree = useMemo(() => {
    if (!tasks) return [];
    const parents = tasks.filter((task) => !task.subtasks || task.subtasks.length === 0);
    return parents.map((parent) => ({
      ...parent,
      subtasks: tasks.filter((t) => t.id !== parent.id && !t.subtasks?.some((st) => st.id === parent.id)),
    }));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    let filtered = tasks.filter((task) => {
      // Incluir apenas tarefas principais ou subtarefas de tarefas expandidas
      const isParent = !task.subtasks || task.subtasks.length === 0;
      if (isParent) return true;
      
      // Verificar se o pai está expandido
      const parent = tasks.find((t) => t.subtasks?.some((st) => st.id === task.id));
      return parent && expandedRows.has(parent.id);
    });
    
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
  }, [tasks, searchQuery, selectedStatus, expandedRows]);

  // Agrupar tarefas
  const groupedTasks = useMemo(() => {
    if (groupBy === "none") {
      return { "": filteredTasks };
    }

    const groups: Record<string, Task[]> = {};
    
    filteredTasks.forEach((task) => {
      let key = "";
      if (groupBy === "status") {
        key = task.status || "Sem status";
      } else if (groupBy === "assignee") {
        key = task.assignee?.name || "Sem atribuição";
      } else if (groupBy === "sprint") {
        key = task.sprint?.name || "Sem sprint";
      }
      
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(task);
    });

    return groups;
  }, [filteredTasks, groupBy]);

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

  const handleNumberChange = (taskId: string, field: "estimateHours" | "actualHours", value: number) => {
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

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedTaskId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTaskId(null);

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Encontrar índices
    const activeIndex = filteredTasks.findIndex((t) => t.id === activeId);
    const overIndex = filteredTasks.findIndex((t) => t.id === overId);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newOrder = arrayMove(filteredTasks, activeIndex, overIndex);
      
      // Atualizar ordem das tarefas
      newOrder.forEach((task, index) => {
        if (task.order !== index) {
          updateTaskMutation.mutate({
            taskId: task.id,
            data: { order: index },
          });
        }
      });
    }
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

  const visibleColumns = columns.filter((col) => col.visible).sort((a, b) => a.order - b.order);

  const SortableRow = ({ task, isSubtask = false }: { task: Task; isSubtask?: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id,
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const hasSubtasks = task.subtasks && task.subtasks.length > 0;
    const isExpanded = expandedRows.has(task.id);

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`hover:bg-gray-800 cursor-pointer ${isSubtask ? "bg-gray-800/50" : ""}`}
        onClick={() => {
          setSelectedTask(task);
          setIsEditModalOpen(true);
        }}
      >
        {visibleColumns.map((col) => {
          if (col.id === "expand") {
            return (
              <td key={col.id} className="px-4 py-3">
                {hasSubtasks && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRowExpansion(task.id);
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    {isExpanded ? "▼" : "▶"}
                  </button>
                )}
              </td>
            );
          }

          if (col.id === "title") {
            return (
              <td key={col.id} className="px-4 py-3" style={{ paddingLeft: isSubtask ? "3rem" : "1rem" }}>
                <div className="flex items-center gap-2">
                  <div
                    {...attributes}
                    {...listeners}
                    className="cursor-move text-gray-400 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⋮⋮
                  </div>
                  <div>
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-400 mt-1 line-clamp-2">
                        {task.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
            );
          }

          if (col.id === "status") {
            return (
              <td key={col.id} className="px-4 py-3">
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
            );
          }

          if (col.id === "assignee") {
            return (
              <td key={col.id} className="px-4 py-3">
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
            );
          }

          if (col.id === "dueDate") {
            return (
              <td key={col.id} className="px-4 py-3">
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
            );
          }

          if (col.id === "estimateHours") {
            return (
              <td key={col.id} className="px-4 py-3">
                <input
                  type="number"
                  value={task.estimateHours || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleNumberChange(task.id, "estimateHours", parseFloat(e.target.value) || 0);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500 w-20"
                  placeholder="0"
                />
              </td>
            );
          }

          if (col.id === "actualHours") {
            return (
              <td key={col.id} className="px-4 py-3">
                <input
                  type="number"
                  value={task.actualHours || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleNumberChange(task.id, "actualHours", parseFloat(e.target.value) || 0);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500 w-20"
                  placeholder="0"
                />
              </td>
            );
          }

          if (col.id === "tags") {
            return (
              <td key={col.id} className="px-4 py-3 text-sm text-gray-400">
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
            );
          }

          return null;
        })}
      </tr>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Agile PM</h2>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/" className="block px-3 py-2 rounded hover:bg-gray-700 text-gray-300">
            Página inicial
          </a>
          <a href="/projects" className="block px-3 py-2 rounded hover:bg-gray-700 text-gray-300">
            Meu trabalho
          </a>
          <div className="pt-4">
            <div className="text-xs font-semibold text-gray-500 uppercase mb-2">Projetos</div>
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
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="px-3 py-1 text-sm bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="none">Sem agrupamento</option>
              <option value="status">Agrupar por Status</option>
              <option value="assignee">Agrupar por Pessoa</option>
              <option value="sprint">Agrupar por Sprint</option>
            </select>
            <button
              onClick={() => setShowColumnSettings(!showColumnSettings)}
              className="px-3 py-1 text-sm hover:bg-gray-700 rounded"
            >
              Colunas
            </button>
            <button className="px-3 py-1 text-sm hover:bg-gray-700 rounded">Filtro</button>
            <button className="px-3 py-1 text-sm hover:bg-gray-700 rounded">Ordenar</button>
          </div>
        </div>

        {/* Column Settings */}
        {showColumnSettings && (
          <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
            <div className="flex flex-wrap gap-3">
              {columns.map((col) => (
                <label key={col.id} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={(e) => {
                      setColumns(
                        columns.map((c) =>
                          c.id === col.id ? { ...c, visible: e.target.checked } : c
                        )
                      );
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{col.label || col.id}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Board Table */}
        <div className="flex-1 overflow-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <table className="w-full">
              <thead className="bg-gray-800 sticky top-0 z-10">
                <tr>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase"
                      style={{
                        minWidth:
                          col.id === "title"
                            ? "300px"
                            : col.id === "tags"
                            ? "200px"
                            : col.id === "expand"
                            ? "40px"
                            : "120px",
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                <SortableContext items={filteredTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {groupBy === "none" ? (
                    <>
                      {filteredTasks.map((task) => (
                        <React.Fragment key={task.id}>
                          <SortableRow task={task} />
                          {expandedRows.has(task.id) &&
                            task.subtasks &&
                            task.subtasks.map((subtask) => (
                              <SortableRow key={subtask.id} task={subtask} isSubtask={true} />
                            ))}
                        </React.Fragment>
                      ))}
                    </>
                  ) : (
                    Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
                      <React.Fragment key={groupName}>
                        <tr className="bg-gray-800/50">
                          <td colSpan={visibleColumns.length} className="px-4 py-2 font-semibold text-gray-300">
                            {groupName} ({groupTasks.length})
                          </td>
                        </tr>
                        {groupTasks.map((task) => (
                          <React.Fragment key={task.id}>
                            <SortableRow task={task} />
                            {expandedRows.has(task.id) &&
                              task.subtasks &&
                              task.subtasks.map((subtask) => (
                                <SortableRow key={subtask.id} task={subtask} isSubtask={true} />
                              ))}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
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
