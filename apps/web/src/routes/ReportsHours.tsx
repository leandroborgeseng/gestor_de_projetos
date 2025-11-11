import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/axios.js";

interface TimeEntry {
  id: string;
  hours: number;
  date: string;
  notes?: string;
  task: {
    id: string;
    title: string;
  };
}

interface HoursByProject {
  projectId: string;
  projectName: string;
  totalHours: number;
  entriesCount: number;
  byUser: Array<{
    userId: string;
    userName: string;
    totalHours: number;
    entriesCount: number;
    entries: TimeEntry[];
  }>;
}

interface HoursByPerson {
  userId: string;
  userName: string;
  userEmail: string;
  totalHours: number;
  entriesCount: number;
  byProject: Array<{
    projectId: string;
    projectName: string;
    totalHours: number;
    entriesCount: number;
    entries: TimeEntry[];
  }>;
}

interface Task {
  id: string;
  title: string;
}

export default function ReportsHours() {
  const { id: projectId } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"project" | "person">("project");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingEntry, setEditingEntry] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntryData, setNewEntryData] = useState({
    taskId: "",
    hours: "",
    date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const { data: hoursByProject, isLoading: isLoadingProjects } = useQuery<HoursByProject[]>({
    queryKey: ["hours-by-project", projectId, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      return api.get(`/time/by-project?${params.toString()}`).then((res) => res.data);
    },
    enabled: viewMode === "project",
  });

  const { data: hoursByPerson, isLoading: isLoadingPersons } = useQuery<HoursByPerson[]>({
    queryKey: ["hours-by-person", startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      return api.get(`/time/by-person?${params.toString()}`).then((res) => res.data);
    },
    enabled: viewMode === "person",
  });

  // Buscar tarefas para o modal de criação
  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`).then((res) => res.data),
    enabled: !!projectId && showAddModal,
  });

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/time/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hours-by-project"] });
      queryClient.invalidateQueries({ queryKey: ["hours-by-person"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setEditingEntry(null);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/time/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hours-by-project"] });
      queryClient.invalidateQueries({ queryKey: ["hours-by-person"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: (data: any) => api.post("/time", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hours-by-project"] });
      queryClient.invalidateQueries({ queryKey: ["hours-by-person"] });
      queryClient.invalidateQueries({ queryKey: ["all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowAddModal(false);
      setNewEntryData({
        taskId: "",
        hours: "",
        date: new Date().toISOString().split("T")[0],
        notes: "",
      });
    },
  });

  const toggleRow = (key: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedRows(newExpanded);
  };

  const handleEdit = (entryId: string, field: string, currentValue: string | number) => {
    setEditingEntry({ id: entryId, field });
    setEditValue(String(currentValue));
  };

  const handleSaveEdit = (entryId: string) => {
    if (!editingEntry) return;
    
    const data: any = {};
    if (editingEntry.field === "hours") {
      data.hours = parseFloat(editValue) || 0;
    } else if (editingEntry.field === "date") {
      data.date = new Date(editValue).toISOString();
    } else if (editingEntry.field === "notes") {
      data.notes = editValue.trim() || null; // Permite remover comentário enviando null
    }

    if (Object.keys(data).length > 0) {
      updateEntryMutation.mutate({ id: entryId, data });
    } else {
      setEditingEntry(null);
    }
  };

  const handleIncrement = (entryId: string, currentHours: number, amount: number = 0.5) => {
    updateEntryMutation.mutate({
      id: entryId,
      data: { hours: currentHours + amount },
    });
  };

  const handleDecrement = (entryId: string, currentHours: number, amount: number = 0.5) => {
    const newHours = Math.max(0, currentHours - amount);
    updateEntryMutation.mutate({
      id: entryId,
      data: { hours: newHours },
    });
  };

  const handleDelete = (entryId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este registro de horas?")) return;
    deleteEntryMutation.mutate(entryId);
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    createEntryMutation.mutate({
      taskId: newEntryData.taskId,
      hours: parseFloat(newEntryData.hours),
      date: new Date(newEntryData.date).toISOString(),
      notes: newEntryData.notes || undefined,
    });
  };

  const isLoading = viewMode === "project" ? isLoadingProjects : isLoadingPersons;

  const totalHours = viewMode === "project"
    ? hoursByProject?.reduce((sum, p) => sum + p.totalHours, 0) || 0
    : hoursByPerson?.reduce((sum, p) => sum + p.totalHours, 0) || 0;

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Relatório de Horas Trabalhadas</h2>
        <div className="flex gap-4">
          <div className="flex gap-2">
            <label className="text-sm text-gray-300 flex items-center">Data Início:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2">
            <label className="text-sm text-gray-300 flex items-center">Data Fim:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as "project" | "person")}
            className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="project">Por Projeto</option>
            <option value="person">Por Pessoa</option>
          </select>
          {projectId && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
            >
              + Adicionar Horas
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="text-sm text-gray-400 mb-1">Total de Horas</div>
        <div className="text-3xl font-bold text-indigo-400">
          {totalHours.toFixed(2)}h
        </div>
      </div>

      {/* Modal para adicionar horas */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-gray-100">Adicionar Horas</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tarefa *</label>
                  <select
                    required
                    value={newEntryData.taskId}
                    onChange={(e) => setNewEntryData({ ...newEntryData, taskId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Selecione uma tarefa...</option>
                    {tasks?.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">As horas serão registradas para o seu usuário</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Horas *</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={newEntryData.hours}
                    onChange={(e) => setNewEntryData({ ...newEntryData, hours: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Data *</label>
                  <input
                    type="date"
                    required
                    value={newEntryData.date}
                    onChange={(e) => setNewEntryData({ ...newEntryData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
                  <textarea
                    value={newEntryData.notes}
                    onChange={(e) => setNewEntryData({ ...newEntryData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createEntryMutation.isPending}
                  className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                >
                  {createEntryMutation.isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === "project" ? (
        <div className="space-y-4">
          {hoursByProject?.map((project) => (
            <div key={project.projectId} className="bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-100">{project.projectName}</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                      {project.entriesCount} registro(s)
                    </span>
                    <span className="text-xl font-bold text-indigo-400">
                      {project.totalHours.toFixed(2)}h
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-8">
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Pessoa
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Registros
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Horas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Percentual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {project.byUser.map((user) => {
                      const percentage = project.totalHours > 0
                        ? ((user.totalHours / project.totalHours) * 100).toFixed(1)
                        : "0";
                      const rowKey = `${project.projectId}-${user.userId}`;
                      const isExpanded = expandedRows.has(rowKey);
                      
                      return (
                        <>
                          <tr key={user.userId} className="hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleRow(rowKey)}
                                className="text-gray-400 hover:text-gray-300"
                              >
                                {isExpanded ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                              {user.userName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {user.entriesCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {user.totalHours.toFixed(2)}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-indigo-500 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-400 w-12 text-right">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && user.entries.map((entry) => (
                            <tr key={entry.id} className="bg-gray-750">
                              <td></td>
                              <td colSpan={4} className="px-6 py-3">
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-gray-400 w-32">{entry.task.title}</span>
                                  <span className="text-gray-400 w-24">
                                    {new Date(entry.date).toLocaleDateString("pt-BR")}
                                  </span>
                                  {editingEntry?.id === entry.id && editingEntry?.field === "hours" ? (
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleSaveEdit(entry.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit(entry.id);
                                        if (e.key === "Escape") setEditingEntry(null);
                                      }}
                                      className="w-20 px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-gray-300 cursor-pointer hover:text-indigo-400"
                                      onClick={() => handleEdit(entry.id, "hours", entry.hours)}
                                    >
                                      {entry.hours.toFixed(2)}h
                                    </span>
                                  )}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleDecrement(entry.id, entry.hours, 0.5)}
                                      disabled={updateEntryMutation.isPending}
                                      className="px-2 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
                                      title="Decrementar 0.5h"
                                    >
                                      -0.5
                                    </button>
                                    <button
                                      onClick={() => handleIncrement(entry.id, entry.hours, 0.5)}
                                      disabled={updateEntryMutation.isPending}
                                      className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                      title="Incrementar 0.5h"
                                    >
                                      +0.5
                                    </button>
                                    <button
                                      onClick={() => handleDelete(entry.id)}
                                      disabled={deleteEntryMutation.isPending}
                                      className="px-2 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
                                      title="Excluir"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                  {editingEntry?.id === entry.id && editingEntry?.field === "notes" ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleSaveEdit(entry.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit(entry.id);
                                        if (e.key === "Escape") setEditingEntry(null);
                                      }}
                                      className="flex-1 px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none"
                                      placeholder="Adicionar comentário..."
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className={`text-xs flex-1 truncate ${entry.notes ? "text-gray-500" : "text-gray-600 italic"} cursor-pointer hover:text-indigo-400`}
                                      onClick={() => handleEdit(entry.id, "notes", entry.notes || "")}
                                      title={entry.notes || "Clique para adicionar comentário"}
                                    >
                                      {entry.notes || "Clique para adicionar comentário"}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {hoursByProject?.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Nenhum registro de horas encontrado
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {hoursByPerson?.map((person) => (
            <div key={person.userId} className="bg-gray-800 rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-100">{person.userName}</h3>
                    <p className="text-sm text-gray-400">{person.userEmail}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400">
                      {person.entriesCount} registro(s)
                    </span>
                    <span className="text-xl font-bold text-indigo-400">
                      {person.totalHours.toFixed(2)}h
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-8">
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Projeto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Registros
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Horas
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Percentual
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {person.byProject.map((project) => {
                      const percentage = person.totalHours > 0
                        ? ((project.totalHours / person.totalHours) * 100).toFixed(1)
                        : "0";
                      const rowKey = `${person.userId}-${project.projectId}`;
                      const isExpanded = expandedRows.has(rowKey);
                      
                      return (
                        <>
                          <tr key={project.projectId} className="hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => toggleRow(rowKey)}
                                className="text-gray-400 hover:text-gray-300"
                              >
                                {isExpanded ? (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                              {project.projectName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {project.entriesCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {project.totalHours.toFixed(2)}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-700 rounded-full h-2">
                                  <div
                                    className="bg-indigo-500 h-2 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-400 w-12 text-right">{percentage}%</span>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && project.entries.map((entry) => (
                            <tr key={entry.id} className="bg-gray-750">
                              <td></td>
                              <td colSpan={4} className="px-6 py-3">
                                <div className="flex items-center gap-4 text-sm">
                                  <span className="text-gray-400 w-32">{entry.task.title}</span>
                                  <span className="text-gray-400 w-24">
                                    {new Date(entry.date).toLocaleDateString("pt-BR")}
                                  </span>
                                  {editingEntry?.id === entry.id && editingEntry?.field === "hours" ? (
                                    <input
                                      type="number"
                                      step="0.5"
                                      min="0"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleSaveEdit(entry.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit(entry.id);
                                        if (e.key === "Escape") setEditingEntry(null);
                                      }}
                                      className="w-20 px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none"
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className="text-gray-300 cursor-pointer hover:text-indigo-400"
                                      onClick={() => handleEdit(entry.id, "hours", entry.hours)}
                                    >
                                      {entry.hours.toFixed(2)}h
                                    </span>
                                  )}
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleDecrement(entry.id, entry.hours, 0.5)}
                                      disabled={updateEntryMutation.isPending}
                                      className="px-2 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
                                      title="Decrementar 0.5h"
                                    >
                                      -0.5
                                    </button>
                                    <button
                                      onClick={() => handleIncrement(entry.id, entry.hours, 0.5)}
                                      disabled={updateEntryMutation.isPending}
                                      className="px-2 py-1 text-xs bg-green-700 text-white rounded hover:bg-green-600 disabled:opacity-50"
                                      title="Incrementar 0.5h"
                                    >
                                      +0.5
                                    </button>
                                    <button
                                      onClick={() => handleDelete(entry.id)}
                                      disabled={deleteEntryMutation.isPending}
                                      className="px-2 py-1 text-xs bg-red-700 text-white rounded hover:bg-red-600 disabled:opacity-50"
                                      title="Excluir"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                  {editingEntry?.id === entry.id && editingEntry?.field === "notes" ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleSaveEdit(entry.id)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveEdit(entry.id);
                                        if (e.key === "Escape") setEditingEntry(null);
                                      }}
                                      className="flex-1 px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-indigo-500 focus:outline-none"
                                      placeholder="Adicionar comentário..."
                                      autoFocus
                                    />
                                  ) : (
                                    <span 
                                      className={`text-xs flex-1 truncate ${entry.notes ? "text-gray-500" : "text-gray-600 italic"} cursor-pointer hover:text-indigo-400`}
                                      onClick={() => handleEdit(entry.id, "notes", entry.notes || "")}
                                      title={entry.notes || "Clique para adicionar comentário"}
                                    >
                                      {entry.notes || "Clique para adicionar comentário"}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {hoursByPerson?.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              Nenhum registro de horas encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}
