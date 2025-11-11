import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface SavedFilter {
  id: string;
  name: string;
  description?: string;
  type: "tasks" | "projects" | "sprints";
  filters: any;
  isQuick: boolean;
  createdAt: string;
}

interface FilterManagerProps {
  type: "tasks" | "projects" | "sprints";
  currentFilters?: any;
  onApplyFilter?: (filters: any) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterManager({
  type,
  currentFilters,
  onApplyFilter,
  isOpen,
  onClose,
}: FilterManagerProps) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterDescription, setFilterDescription] = useState("");

  const { data: filters, isLoading } = useQuery<SavedFilter[]>({
    queryKey: ["filters", type],
    queryFn: () => api.get(`/filters?type=${type}`).then((res) => res.data),
    enabled: isOpen,
  });

  const { data: quickFilters } = useQuery<SavedFilter[]>({
    queryKey: ["filters", "quick", type],
    queryFn: () => api.get(`/filters/quick?type=${type}`).then((res) => res.data),
    enabled: isOpen,
  });

  const createFilterMutation = useMutation({
    mutationFn: (data: any) => api.post("/filters", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filters"] });
      setShowCreateForm(false);
      setFilterName("");
      setFilterDescription("");
      alert("Filtro salvo com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao salvar filtro");
    },
  });

  const deleteFilterMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/filters/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filters"] });
      alert("Filtro deletado com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao deletar filtro");
    },
  });

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      alert("Por favor, informe um nome para o filtro");
      return;
    }

    if (!currentFilters || Object.keys(currentFilters).length === 0) {
      alert("Não há filtros ativos para salvar");
      return;
    }

    createFilterMutation.mutate({
      name: filterName,
      description: filterDescription || undefined,
      type,
      filters: currentFilters,
      isQuick: false,
    });
  };

  const handleApplyFilter = (filter: SavedFilter) => {
    if (onApplyFilter) {
      onApplyFilter(filter.filters);
    }
    onClose();
  };

  const handleDeleteFilter = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este filtro?")) {
      deleteFilterMutation.mutate(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-100">Gerenciar Filtros</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Salvar filtro atual */}
          {currentFilters && Object.keys(currentFilters).length > 0 && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Salvar Filtro Atual</h3>
              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
                >
                  Salvar Filtro Atual
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nome do Filtro *
                    </label>
                    <input
                      type="text"
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Ex: Minhas Tarefas Pendentes"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descrição (opcional)
                    </label>
                    <textarea
                      value={filterDescription}
                      onChange={(e) => setFilterDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Descreva o filtro..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveFilter}
                      disabled={createFilterMutation.isPending || !filterName.trim()}
                      className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                    >
                      {createFilterMutation.isPending ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setFilterName("");
                        setFilterDescription("");
                      }}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filtros rápidos */}
          {quickFilters && quickFilters.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-4">Filtros Rápidos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickFilters.map((filter) => (
                  <div
                    key={filter.id}
                    className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-indigo-500 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-100 mb-1">{filter.name}</h4>
                        {filter.description && (
                          <p className="text-sm text-gray-400">{filter.description}</p>
                        )}
                        <span className="inline-block mt-2 px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                          Rápido
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleApplyFilter(filter)}
                      className="mt-3 w-full px-3 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 text-sm"
                    >
                      Aplicar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filtros salvos */}
          <div>
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Meus Filtros Salvos</h3>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Carregando...</div>
            ) : filters && filters.length > 0 ? (
              <div className="space-y-3">
                {filters
                  .filter((f) => !f.isQuick)
                  .map((filter) => (
                    <div
                      key={filter.id}
                      className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-indigo-500 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-100 mb-1">{filter.name}</h4>
                          {filter.description && (
                            <p className="text-sm text-gray-400">{filter.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Criado em {new Date(filter.createdAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteFilter(filter.id)}
                          className="ml-2 text-red-400 hover:text-red-300"
                          title="Deletar filtro"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                      <button
                        onClick={() => handleApplyFilter(filter)}
                        className="mt-3 w-full px-3 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 text-sm"
                      >
                        Aplicar
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Nenhum filtro salvo ainda. Salve um filtro atual para começar.
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

