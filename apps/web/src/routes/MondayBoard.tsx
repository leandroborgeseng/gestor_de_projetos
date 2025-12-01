import React, { useState, useMemo, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
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
  resourceId?: string;
  resource?: { id: string; name: string };
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
  { id: "startDate", type: "date", label: "Data de Início", visible: false, order: 4 },
  { id: "dueDate", type: "date", label: "Data de Vencimento", visible: true, order: 5 },
  { id: "sprint", type: "text", label: "Sprint", visible: false, order: 6 },
  { id: "resource", type: "text", label: "Recurso", visible: false, order: 7 },
  { id: "notes", type: "text", label: "Observação", visible: false, order: 8 },
  { id: "estimateHours", type: "number", label: "Estimativa", visible: true, order: 9 },
  { id: "actualHours", type: "number", label: "Realizado", visible: true, order: 10 },
  { id: "progress", type: "number", label: "Progresso", visible: false, order: 11 },
  { id: "tags", type: "tags", label: "Tags", visible: true, order: 12 },
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
  
  // Carregar configurações do localStorage
  const loadSavedConfig = () => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(`monday-board-config-${id}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  const savedConfig = loadSavedConfig();
  const [groupBy, setGroupBy] = useState<GroupBy>(savedConfig?.groupBy || "none");
  const [columns, setColumns] = useState<ColumnConfig[]>(
    savedConfig?.columns || DEFAULT_COLUMNS
  );
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    savedConfig?.columnWidths || {}
  );
  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  
  // Ordenação
  const [sortConfig, setSortConfig] = useState<{
    field: string;
    direction: "asc" | "desc";
  } | null>(savedConfig?.sortConfig || null);
  
  // Filtros avançados
  const [filters, setFilters] = useState(savedConfig?.filters || {
    assignees: [] as string[],
    tags: [] as string[],
    sprints: [] as string[],
    dateRange: {
      start: "",
      end: "",
    },
    hasDueDate: null as boolean | null,
    estimateHours: {
      min: "",
      max: "",
    },
    actualHours: {
      min: "",
      max: "",
    },
  });

  // Salvar configurações no localStorage
  const saveConfig = () => {
    if (typeof window === "undefined" || !id) return;
    const config = {
      columns,
      groupBy,
      filters,
      sortConfig,
      columnWidths,
      timestamp: Date.now(),
    };
    localStorage.setItem(`monday-board-config-${id}`, JSON.stringify(config));
  };

  // Salvar quando configurações mudarem
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveConfig();
    }, 500); // Debounce de 500ms
    return () => clearTimeout(timeoutId);
  }, [columns, groupBy, filters, sortConfig, columnWidths, id]);

  // Handlers para redimensionar colunas
  const handleMouseDown = (columnId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(columnId);

    const startX = e.pageX;
    const startWidth = columnWidths[columnId] || getDefaultColumnWidth(columnId);

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.pageX - startX;
      const newWidth = Math.max(100, startWidth + diff);
      setColumnWidths((prev) => ({
        ...prev,
        [columnId]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const getDefaultColumnWidth = (columnId: string): number => {
    if (columnId === "title") return 300;
    if (columnId === "tags") return 200;
    if (columnId === "expand") return 60;
    if (columnId === "notes") return 250;
    return 120;
  };

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

  const { data: tags } = useQuery({
    queryKey: ["tags", id],
    queryFn: () => api.get(`/tags?companyId=${id}`).then((res) => res.data.data || []),
    enabled: !!id,
  });

  const { data: sprints } = useQuery({
    queryKey: ["sprints", id],
    queryFn: () => api.get(`/projects/${id}/sprints`).then((res) => res.data || []),
    enabled: !!id,
  });

  const { data: resources } = useQuery({
    queryKey: ["resources", id],
    queryFn: () => api.get(`/resources?companyId=${id}`).then((res) => res.data.data || []),
    enabled: !!id,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      api.patch(`/projects/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: any) => api.post(`/projects/${id}/tasks`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => api.delete(`/projects/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      setSelectedTasks(new Set());
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ taskIds, data }: { taskIds: string[]; data: any }) => {
      await Promise.all(
        taskIds.map((taskId) => api.patch(`/projects/tasks/${taskId}`, data))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
      setSelectedTasks(new Set());
      setShowBulkActions(false);
    },
  });

  const [creatingSubtaskFor, setCreatingSubtaskFor] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: "title" | "description" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState<ColumnType>("text");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Atalhos de teclado
  useHotkeys("ctrl+n, cmd+n", (e) => {
    e.preventDefault();
    setIsCreateModalOpen(true);
  });

  useHotkeys("ctrl+f, cmd+f", (e) => {
    e.preventDefault();
    searchInputRef.current?.focus();
  });

  useHotkeys("ctrl+k, cmd+k", (e) => {
    e.preventDefault();
    setShowFilters(!showFilters);
  });

  useHotkeys("ctrl+s, cmd+s", (e) => {
    e.preventDefault();
    if (editingCell) {
      saveEdit();
    }
  });

  useHotkeys("escape", () => {
    if (editingCell) {
      cancelEdit();
    }
    if (showFilters) {
      setShowFilters(false);
    }
    if (showSort) {
      setShowSort(false);
    }
    if (showColumnSettings) {
      setShowColumnSettings(false);
    }
    if (showExportMenu) {
      setShowExportMenu(false);
    }
    if (isCreateModalOpen) {
      setIsCreateModalOpen(false);
    }
    if (isEditModalOpen) {
      setIsEditModalOpen(false);
      setSelectedTask(null);
    }
  });


  const filteredTasks = useMemo(() => {
    if (!tasks) return [];
    
    // Filtrar apenas tarefas principais (sem parentId ou que não são subtarefas)
    let filtered = tasks.filter((task) => {
      // Verificar se é uma tarefa principal (não tem parentId ou não está em subtasks de outra)
      const isSubtask = tasks.some((t) => t.subtasks?.some((st) => st.id === task.id));
      return !isSubtask;
    });
    
    // Busca por texto
    if (searchQuery) {
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Filtro por status
    if (selectedStatus) {
      filtered = filtered.filter((task) => task.status === selectedStatus);
    }
    
    // Filtros avançados
    // Por atribuídos
    if (filters.assignees.length > 0) {
      filtered = filtered.filter((task) =>
        task.assigneeId && filters.assignees.includes(task.assigneeId)
      );
    }
    
    // Por tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter((task) =>
        task.tags?.some((tag) => filters.tags.includes(tag.tag.id))
      );
    }
    
    // Por sprints
    if (filters.sprints.length > 0) {
      filtered = filtered.filter((task) =>
        task.sprintId && filters.sprints.includes(task.sprintId)
      );
    }
    
    // Por data de vencimento
    if (filters.dateRange.start) {
      filtered = filtered.filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        const startDate = new Date(filters.dateRange.start);
        return taskDate >= startDate;
      });
    }
    
    if (filters.dateRange.end) {
      filtered = filtered.filter((task) => {
        if (!task.dueDate) return false;
        const taskDate = new Date(task.dueDate);
        const endDate = new Date(filters.dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        return taskDate <= endDate;
      });
    }
    
    // Por presença de data de vencimento
    if (filters.hasDueDate !== null) {
      filtered = filtered.filter((task) =>
        filters.hasDueDate ? !!task.dueDate : !task.dueDate
      );
    }
    
    // Por estimativa de horas
    if (filters.estimateHours.min) {
      const min = parseFloat(filters.estimateHours.min);
      filtered = filtered.filter((task) => (task.estimateHours || 0) >= min);
    }
    
    if (filters.estimateHours.max) {
      const max = parseFloat(filters.estimateHours.max);
      filtered = filtered.filter((task) => (task.estimateHours || 0) <= max);
    }
    
    // Por horas realizadas
    if (filters.actualHours.min) {
      const min = parseFloat(filters.actualHours.min);
      filtered = filtered.filter((task) => (task.actualHours || 0) >= min);
    }
    
    if (filters.actualHours.max) {
      const max = parseFloat(filters.actualHours.max);
      filtered = filtered.filter((task) => (task.actualHours || 0) <= max);
    }
    
    // Aplicar ordenação
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.field) {
          case "title":
            aValue = a.title?.toLowerCase() || "";
            bValue = b.title?.toLowerCase() || "";
            break;
          case "status":
            aValue = a.status || "";
            bValue = b.status || "";
            break;
          case "assignee":
            aValue = a.assignee?.name?.toLowerCase() || "";
            bValue = b.assignee?.name?.toLowerCase() || "";
            break;
          case "dueDate":
            aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0;
            bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0;
            break;
          case "startDate":
            aValue = a.startDate ? new Date(a.startDate).getTime() : 0;
            bValue = b.startDate ? new Date(b.startDate).getTime() : 0;
            break;
          case "estimateHours":
            aValue = a.estimateHours || 0;
            bValue = b.estimateHours || 0;
            break;
          case "actualHours":
            aValue = a.actualHours || 0;
            bValue = b.actualHours || 0;
            break;
          case "sprint":
            aValue = a.sprint?.name?.toLowerCase() || "";
            bValue = b.sprint?.name?.toLowerCase() || "";
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [tasks, searchQuery, selectedStatus, filters, sortConfig]);

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

  const handleTextChange = (taskId: string, field: string, value: string) => {
    updateTaskMutation.mutate({
      taskId,
      data: { [field]: value || null },
    });
  };

  const startEditing = (taskId: string, field: "title" | "description", currentValue: string) => {
    setEditingCell({ taskId, field });
    setEditValue(currentValue || "");
  };

  const saveEdit = () => {
    if (editingCell) {
      handleTextChange(editingCell.taskId, editingCell.field, editValue);
      setEditingCell(null);
      setEditValue("");
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleExport = (format: "csv" | "excel") => {
    if (!filteredTasks || filteredTasks.length === 0) {
      alert("Nenhuma tarefa para exportar");
      return;
    }

    const headers = visibleColumns
      .filter((col) => col.id !== "expand")
      .map((col) => col.label);

    const rows = filteredTasks.map((task) => {
      return visibleColumns
        .filter((col) => col.id !== "expand")
        .map((col) => {
          switch (col.id) {
            case "title":
              return task.title || "";
            case "status":
              return STATUS_OPTIONS.find((s) => s.value === task.status)?.label || task.status || "";
            case "assignee":
              return task.assignee?.name || "";
            case "startDate":
              return task.startDate ? formatDate(task.startDate) : "";
            case "dueDate":
              return task.dueDate ? formatDate(task.dueDate) : "";
            case "sprint":
              return task.sprint?.name || "";
            case "resource":
              return task.resource?.name || "";
            case "notes":
              return task.description || "";
            case "estimateHours":
              return task.estimateHours?.toString() || "0";
            case "actualHours":
              return task.actualHours?.toString() || "0";
            case "progress":
              return `${calculateProgress(task)}%`;
            case "tags":
              return task.tags?.map((t) => t.tag.name).join(", ") || "";
            default:
              return "";
          }
        });
    });

    if (format === "csv") {
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${project?.name || "projeto"}-tarefas-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Para Excel, vamos criar um CSV com extensão .xlsx (funciona no Excel)
      // Ou criar um HTML table que Excel pode abrir
      const htmlContent = `
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              table { border-collapse: collapse; width: 100%; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #4CAF50; color: white; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>
                  ${headers.map((h) => `<th>${h}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (row) =>
                      `<tr>${row.map((cell) => `<td>${String(cell).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </body>
        </html>
      `;

      const blob = new Blob(["\uFEFF" + htmlContent], { type: "application/vnd.ms-excel" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${project?.name || "projeto"}-tarefas-${new Date().toISOString().split("T")[0]}.xls`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setShowExportMenu(false);
  };

  const handleResourceChange = (taskId: string, resourceId: string | null) => {
    updateTaskMutation.mutate({
      taskId,
      data: { resourceId },
    });
  };

  const handleSprintChange = (taskId: string, sprintId: string | null) => {
    updateTaskMutation.mutate({
      taskId,
      data: { sprintId },
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

  const handleDragStart = (_event: DragStartEvent) => {
    // Drag start handler
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Encontrar índices
    const activeIndex = filteredTasks.findIndex((t) => t.id === activeId);
    const overIndex = filteredTasks.findIndex((t) => t.id === overId);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newOrder = arrayMove(filteredTasks, activeIndex, overIndex);
      
      // Atualizar ordem das tarefas
      newOrder.forEach((task: Task, index: number) => {
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


  const calculateProgress = (task: Task): number => {
    // Calcular progresso baseado em subtarefas concluídas
    if (task.subtasks && task.subtasks.length > 0) {
      const completed = task.subtasks.filter((st) => st.status === "DONE").length;
      return Math.round((completed / task.subtasks.length) * 100);
    }
    
    // Se não tem subtarefas, calcular baseado em horas
    if (task.estimateHours && task.estimateHours > 0) {
      const progress = Math.min(100, Math.round((task.actualHours || 0) / task.estimateHours * 100));
      return progress;
    }
    
    // Se não tem estimativa, calcular baseado em status
    const statusProgress: Record<string, number> = {
      BACKLOG: 0,
      TODO: 10,
      IN_PROGRESS: 50,
      REVIEW: 80,
      DONE: 100,
      BLOCKED: 0,
    };
    return statusProgress[task.status || "BACKLOG"] || 0;
  };

  const visibleColumns = columns.filter((col) => col.visible).sort((a, b) => a.order - b.order);

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(filteredTasks.map((t) => t.id)));
      setShowBulkActions(true);
    } else {
      setSelectedTasks(new Set());
      setShowBulkActions(false);
    }
  };

  const handleBulkAction = (action: string, value?: any) => {
    const taskIds = Array.from(selectedTasks);
    if (taskIds.length === 0) return;

    switch (action) {
      case "delete":
        if (confirm(`Tem certeza que deseja deletar ${taskIds.length} tarefa(s)?`)) {
          taskIds.forEach((taskId) => deleteTaskMutation.mutate(taskId));
        }
        break;
      case "status":
        if (value) {
          bulkUpdateMutation.mutate({ taskIds, data: { status: value } });
        }
        break;
      case "assignee":
        bulkUpdateMutation.mutate({ taskIds, data: { assigneeId: value || null } });
        break;
      case "sprint":
        bulkUpdateMutation.mutate({ taskIds, data: { sprintId: value || null } });
        break;
    }
  };

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
          const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
          
          if (col.id === "expand") {
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                <div className="flex items-center gap-1">
                  {!isSubtask && (
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(task.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectTask(task.id, e.target.checked);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded cursor-pointer"
                    />
                  )}
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
                  {!isSubtask && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreatingSubtaskFor(task.id);
                        setSubtaskTitle("");
                      }}
                      className="text-gray-400 hover:text-blue-400 text-sm"
                      title="Adicionar subtarefa"
                    >
                      +
                    </button>
                  )}
                </div>
              </td>
            );
          }

          if (col.id === "title") {
            const isEditingTitle = editingCell?.taskId === task.id && editingCell?.field === "title";
            const isEditingDescription = editingCell?.taskId === task.id && editingCell?.field === "description";
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            
            return (
              <td key={col.id} className="px-4 py-3" style={{ paddingLeft: isSubtask ? "3rem" : "1rem", width: `${columnWidth}px` }}>
                <div className="flex items-center gap-2">
                  <div
                    {...attributes}
                    {...listeners}
                    className="cursor-move text-gray-400 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⋮⋮
                  </div>
                  <div className="flex-1">
                    {isEditingTitle ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            saveEdit();
                          } else if (e.key === "Escape") {
                            cancelEdit();
                          }
                        }}
                        className="w-full px-2 py-1 bg-gray-700 border border-blue-500 rounded text-sm font-medium focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div
                        className="font-medium cursor-text hover:bg-gray-700/50 px-1 py-0.5 rounded"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditing(task.id, "title", task.title);
                        }}
                      >
                        {task.title || <span className="text-gray-500 italic">Sem título</span>}
                      </div>
                    )}
                    {isEditingDescription ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            cancelEdit();
                          }
                        }}
                        className="w-full mt-1 px-2 py-1 bg-gray-700 border border-blue-500 rounded text-sm text-gray-400 focus:outline-none resize-none"
                        rows={2}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div
                        className="text-sm text-gray-400 mt-1 line-clamp-2 cursor-text hover:bg-gray-700/50 px-1 py-0.5 rounded"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startEditing(task.id, "description", task.description || "");
                        }}
                      >
                        {task.description || <span className="text-gray-600 italic">Clique duas vezes para adicionar descrição</span>}
                      </div>
                    )}
                  </div>
                </div>
              </td>
            );
          }

          if (col.id === "status") {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
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
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
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

          if (col.id === "startDate") {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                <input
                  type="date"
                  value={task.startDate ? task.startDate.split("T")[0] : ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleDateChange(task.id, "startDate", e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </td>
            );
          }

          if (col.id === "dueDate") {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
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

          if (col.id === "sprint") {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                <select
                  value={task.sprintId || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSprintChange(task.id, e.target.value || null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Sem sprint</option>
                  {sprints?.map((sprint: any) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
              </td>
            );
          }

          if (col.id === "resource") {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                <select
                  value={task.resourceId || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleResourceChange(task.id, e.target.value || null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">Sem recurso</option>
                  {resources?.map((resource: any) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name}
                    </option>
                  ))}
                </select>
              </td>
            );
          }

          if (col.id === "notes") {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                <input
                  type="text"
                  value={task.description || ""}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleTextChange(task.id, "description", e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    handleTextChange(task.id, "description", e.target.value);
                  }}
                  placeholder="Observações..."
                  className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                />
              </td>
            );
          }

          if (col.id === "estimateHours") {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
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
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
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

          if (col.id === "progress") {
            const progress = calculateProgress(task);
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor:
                          progress === 100
                            ? "#10b981"
                            : progress >= 50
                            ? "#3b82f6"
                            : progress > 0
                            ? "#f59e0b"
                            : "#6b7280",
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-10 text-right">{progress}%</span>
                </div>
              </td>
            );
          }

          if (col.id === "tags") {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            return (
              <td key={col.id} className="px-4 py-3 text-sm text-gray-400" style={{ width: `${columnWidth}px` }}>
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

          // Colunas customizadas
          if (col.id.startsWith("custom_")) {
            const columnWidth = columnWidths[col.id] || getDefaultColumnWidth(col.id);
            
            // Para colunas customizadas, vamos armazenar valores em um estado local
            // ou usar um campo genérico (por enquanto, vamos usar um campo de texto genérico)
            const customValue = (task as any)[`custom_${col.id}`] || "";
            
            if (col.type === "text") {
              return (
                <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                  <input
                    type="text"
                    value={customValue}
                    onChange={(e) => {
                      e.stopPropagation();
                      // Por enquanto, apenas logamos - em produção, salvaria em um campo customizado
                      console.log(`Custom column ${col.id} value changed:`, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder={col.label}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                  />
                </td>
              );
            }
            
            if (col.type === "number") {
              return (
                <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                  <input
                    type="number"
                    value={customValue}
                    onChange={(e) => {
                      e.stopPropagation();
                      console.log(`Custom column ${col.id} value changed:`, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="0"
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                  />
                </td>
              );
            }
            
            if (col.type === "date") {
              return (
                <td key={col.id} className="px-4 py-3" style={{ width: `${columnWidth}px` }}>
                  <input
                    type="date"
                    value={customValue}
                    onChange={(e) => {
                      e.stopPropagation();
                      console.log(`Custom column ${col.id} value changed:`, e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                  />
                </td>
              );
            }
            
            // Para outros tipos, renderizar como texto
            return (
              <td key={col.id} className="px-4 py-3 text-sm text-gray-400" style={{ width: `${columnWidth}px` }}>
                {customValue || "-"}
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
                ref={searchInputRef}
                type="text"
                placeholder="Pesquisar... (Ctrl+F)"
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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1 text-sm rounded ${
                showFilters || Object.values(filters).some((v) => {
                  if (Array.isArray(v)) return v.length > 0;
                  if (typeof v === "object" && v !== null) {
                    return Object.values(v).some((sv) => sv !== "" && sv !== null);
                  }
                  return false;
                })
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "hover:bg-gray-700"
              }`}
            >
              Filtro
            </button>
            <button
              onClick={() => setShowSort(!showSort)}
              className={`px-3 py-1 text-sm rounded ${
                showSort || sortConfig
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "hover:bg-gray-700"
              }`}
            >
              Ordenar
            </button>
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-1 text-sm hover:bg-gray-700 rounded"
              >
                Exportar
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
                  <button
                    onClick={() => handleExport("csv")}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-t"
                  >
                    Exportar CSV
                  </button>
                  <button
                    onClick={() => handleExport("excel")}
                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-b"
                  >
                    Exportar Excel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column Settings */}
        {showColumnSettings && (
          <div className="bg-gray-800 border-b border-gray-700 px-6 py-3">
            <div className="flex flex-wrap gap-3 mb-4">
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
            <div className="border-t border-gray-700 pt-3">
              <button
                onClick={() => setShowAddColumn(!showAddColumn)}
                className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                + Adicionar Coluna
              </button>
              {showAddColumn && (
                <div className="mt-3 flex gap-2 items-end">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nome da Coluna</label>
                    <input
                      type="text"
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      placeholder="Ex: Prioridade, Custo, etc."
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Tipo</label>
                    <select
                      value={newColumnType}
                      onChange={(e) => setNewColumnType(e.target.value as ColumnType)}
                      className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="text">Texto</option>
                      <option value="number">Número</option>
                      <option value="date">Data</option>
                      <option value="status">Status</option>
                      <option value="person">Pessoa</option>
                      <option value="tags">Tags</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      if (newColumnName.trim()) {
                        const newCol: ColumnConfig = {
                          id: `custom_${Date.now()}`,
                          type: newColumnType,
                          label: newColumnName.trim(),
                          visible: true,
                          order: columns.length,
                        };
                        setColumns([...columns, newCol]);
                        setNewColumnName("");
                        setNewColumnType("text");
                        setShowAddColumn(false);
                      }
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm text-white"
                  >
                    Criar
                  </button>
                  <button
                    onClick={() => {
                      setShowAddColumn(false);
                      setNewColumnName("");
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Filtro por Pessoas */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Pessoas
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {users?.map((user: any) => (
                    <label key={user.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.assignees.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              assignees: [...filters.assignees, user.id],
                            });
                          } else {
                            setFilters({
                              ...filters,
                              assignees: filters.assignees.filter((id: string) => id !== user.id),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtro por Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {tags?.map((tag: any) => (
                    <label key={tag.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.tags.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              tags: [...filters.tags, tag.id],
                            });
                          } else {
                            setFilters({
                              ...filters,
                              tags: filters.tags.filter((id: string) => id !== tag.id),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span
                        className="text-sm px-2 py-1 rounded"
                        style={{ backgroundColor: tag.color + "20", color: tag.color }}
                      >
                        {tag.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtro por Sprints */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sprints
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {sprints?.map((sprint: any) => (
                    <label key={sprint.id} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.sprints.includes(sprint.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters({
                              ...filters,
                              sprints: [...filters.sprints, sprint.id],
                            });
                          } else {
                            setFilters({
                              ...filters,
                              sprints: filters.sprints.filter((id: string) => id !== sprint.id),
                            });
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-300">{sprint.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Filtro por Data de Vencimento */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Data de Vencimento
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">De</label>
                    <input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          dateRange: { ...filters.dateRange, start: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Até</label>
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          dateRange: { ...filters.dateRange, end: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setFilters({
                          ...filters,
                          hasDueDate: filters.hasDueDate === true ? null : true,
                        })
                      }
                      className={`px-2 py-1 text-xs rounded ${
                        filters.hasDueDate === true
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      Com data
                    </button>
                    <button
                      onClick={() =>
                        setFilters({
                          ...filters,
                          hasDueDate: filters.hasDueDate === false ? null : false,
                        })
                      }
                      className={`px-2 py-1 text-xs rounded ${
                        filters.hasDueDate === false
                          ? "bg-blue-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      Sem data
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtro por Estimativa de Horas */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Estimativa (horas)
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Mínimo</label>
                    <input
                      type="number"
                      value={filters.estimateHours.min}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          estimateHours: { ...filters.estimateHours, min: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Máximo</label>
                    <input
                      type="number"
                      value={filters.estimateHours.max}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          estimateHours: { ...filters.estimateHours, max: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>

              {/* Filtro por Horas Realizadas */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Realizado (horas)
                </label>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Mínimo</label>
                    <input
                      type="number"
                      value={filters.actualHours.min}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          actualHours: { ...filters.actualHours, min: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Máximo</label>
                    <input
                      type="number"
                      value={filters.actualHours.max}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          actualHours: { ...filters.actualHours, max: e.target.value },
                        })
                      }
                      className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                      placeholder="∞"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilters({
                    assignees: [],
                    tags: [],
                    sprints: [],
                    dateRange: { start: "", end: "" },
                    hasDueDate: null,
                    estimateHours: { min: "", max: "" },
                    actualHours: { min: "", max: "" },
                  });
                }}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
              >
                Limpar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Sort Options */}
        {showSort && (
          <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-300">Ordenar por:</label>
              <select
                value={sortConfig?.field || ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setSortConfig({
                      field: e.target.value,
                      direction: sortConfig?.field === e.target.value && sortConfig.direction === "asc" ? "desc" : "asc",
                    });
                  } else {
                    setSortConfig(null);
                  }
                }}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="">Nenhuma ordenação</option>
                <option value="title">Título</option>
                <option value="status">Status</option>
                <option value="assignee">Pessoa</option>
                <option value="dueDate">Data de Vencimento</option>
                <option value="startDate">Data de Início</option>
                <option value="estimateHours">Estimativa (horas)</option>
                <option value="actualHours">Realizado (horas)</option>
                <option value="sprint">Sprint</option>
              </select>
              {sortConfig && (
                <>
                  <button
                    onClick={() =>
                      setSortConfig({
                        ...sortConfig,
                        direction: sortConfig.direction === "asc" ? "desc" : "asc",
                      })
                    }
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                  >
                    {sortConfig.direction === "asc" ? "↑ Crescente" : "↓ Decrescente"}
                  </button>
                  <button
                    onClick={() => setSortConfig(null)}
                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300"
                  >
                    Limpar
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {showBulkActions && selectedTasks.size > 0 && (
          <div className="bg-blue-600 border-b border-blue-700 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-white">
                {selectedTasks.size} tarefa(s) selecionada(s)
              </span>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBulkAction("status", e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="px-3 py-1 bg-blue-700 border border-blue-600 rounded text-sm text-white focus:outline-none"
                  defaultValue=""
                >
                  <option value="">Mudar status...</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <select
                  onChange={(e) => {
                    handleBulkAction("assignee", e.target.value || null);
                    e.target.value = "";
                  }}
                  className="px-3 py-1 bg-blue-700 border border-blue-600 rounded text-sm text-white focus:outline-none"
                  defaultValue=""
                >
                  <option value="">Atribuir pessoa...</option>
                  <option value="">Remover atribuição</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
                <select
                  onChange={(e) => {
                    handleBulkAction("sprint", e.target.value || null);
                    e.target.value = "";
                  }}
                  className="px-3 py-1 bg-blue-700 border border-blue-600 rounded text-sm text-white focus:outline-none"
                  defaultValue=""
                >
                  <option value="">Mover para sprint...</option>
                  <option value="">Remover sprint</option>
                  {sprints?.map((sprint: any) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => handleBulkAction("delete")}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm text-white"
                >
                  Deletar
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedTasks(new Set());
                setShowBulkActions(false);
              }}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
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
                  {visibleColumns.map((col, index) => (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase relative"
                      style={{
                        width: columnWidths[col.id] ? `${columnWidths[col.id]}px` : undefined,
                        minWidth: `${getDefaultColumnWidth(col.id)}px`,
                      }}
                    >
                      {col.id === "expand" ? (
                        <input
                          type="checkbox"
                          checked={selectedTasks.size > 0 && selectedTasks.size === filteredTasks.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="rounded cursor-pointer"
                        />
                      ) : (
                        col.label
                      )}
                      {index < visibleColumns.length - 1 && (
                        <div
                          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 ${
                            resizingColumn === col.id ? "bg-blue-500" : ""
                          }`}
                          onMouseDown={(e) => handleMouseDown(col.id, e)}
                        />
                      )}
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
                          {creatingSubtaskFor === task.id && (
                            <tr className="bg-gray-800/50">
                              <td colSpan={visibleColumns.length} className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={subtaskTitle}
                                    onChange={(e) => setSubtaskTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && subtaskTitle.trim()) {
                                        createTaskMutation.mutate({
                                          title: subtaskTitle.trim(),
                                          parentId: task.id,
                                          projectId: id,
                                          status: "TODO",
                                        });
                                        setCreatingSubtaskFor(null);
                                        setSubtaskTitle("");
                                      } else if (e.key === "Escape") {
                                        setCreatingSubtaskFor(null);
                                        setSubtaskTitle("");
                                      }
                                    }}
                                    placeholder="Digite o título da subtarefa e pressione Enter..."
                                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => {
                                      if (subtaskTitle.trim()) {
                                        createTaskMutation.mutate({
                                          title: subtaskTitle.trim(),
                                          parentId: task.id,
                                          projectId: id,
                                          status: "TODO",
                                        });
                                      }
                                      setCreatingSubtaskFor(null);
                                      setSubtaskTitle("");
                                    }}
                                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                                  >
                                    Criar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCreatingSubtaskFor(null);
                                      setSubtaskTitle("");
                                    }}
                                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
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
                            {creatingSubtaskFor === task.id && (
                              <tr className="bg-gray-800/50">
                                <td colSpan={visibleColumns.length} className="px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={subtaskTitle}
                                      onChange={(e) => setSubtaskTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && subtaskTitle.trim()) {
                                          createTaskMutation.mutate({
                                            title: subtaskTitle.trim(),
                                            parentId: task.id,
                                            projectId: id,
                                            status: "TODO",
                                          });
                                          setCreatingSubtaskFor(null);
                                          setSubtaskTitle("");
                                        } else if (e.key === "Escape") {
                                          setCreatingSubtaskFor(null);
                                          setSubtaskTitle("");
                                        }
                                      }}
                                      placeholder="Digite o título da subtarefa e pressione Enter..."
                                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:outline-none focus:border-blue-500"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => {
                                        if (subtaskTitle.trim()) {
                                          createTaskMutation.mutate({
                                            title: subtaskTitle.trim(),
                                            parentId: task.id,
                                            projectId: id,
                                            status: "TODO",
                                          });
                                        }
                                        setCreatingSubtaskFor(null);
                                        setSubtaskTitle("");
                                      }}
                                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                                    >
                                      Criar
                                    </button>
                                    <button
                                      onClick={() => {
                                        setCreatingSubtaskFor(null);
                                        setSubtaskTitle("");
                                      }}
                                      className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
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

      {isEditModalOpen && selectedTask && id && (
        <EditTaskModal
          projectId={id}
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
