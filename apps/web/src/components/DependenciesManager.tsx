import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface Task {
  id: string;
  title: string;
  status: string;
}

interface DependenciesManagerProps {
  taskId: string;
  projectId: string;
  allTasks: Task[];
}

export default function DependenciesManager({
  taskId,
  projectId,
  allTasks,
}: DependenciesManagerProps) {
  const queryClient = useQueryClient();
  const [selectedPredecessor, setSelectedPredecessor] = useState<string>("");
  const [selectedSuccessor, setSelectedSuccessor] = useState<string>("");

  const { data: dependencies, isLoading } = useQuery({
    queryKey: ["task-dependencies", taskId],
    queryFn: () =>
      api.get(`/projects/tasks/${taskId}/dependencies`).then((res) => res.data),
    enabled: !!taskId,
  });

  const createDependencyMutation = useMutation({
    mutationFn: (data: { predecessorId: string; successorId: string }) =>
      api.post(`/projects/tasks/dependencies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-dependencies", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setSelectedPredecessor("");
      setSelectedSuccessor("");
    },
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: (dependencyId: string) =>
      api.delete(`/projects/dependencies/${dependencyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["task-dependencies", taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const handleAddPredecessor = () => {
    if (!selectedPredecessor) return;
    createDependencyMutation.mutate({
      predecessorId: selectedPredecessor,
      successorId: taskId,
    });
  };

  const handleAddSuccessor = () => {
    if (!selectedSuccessor) return;
    createDependencyMutation.mutate({
      predecessorId: taskId,
      successorId: selectedSuccessor,
    });
  };

  const handleRemovePredecessor = (dependencyId: string) => {
    if (window.confirm("Deseja remover esta dependência?")) {
      deleteDependencyMutation.mutate(dependencyId);
    }
  };

  const handleRemoveSuccessor = (dependencyId: string) => {
    if (window.confirm("Deseja remover esta dependência?")) {
      deleteDependencyMutation.mutate(dependencyId);
    }
  };

  // Filtrar tarefas disponíveis (excluir a própria tarefa)
  const availableTasks = allTasks.filter((t) => t.id !== taskId);

  // Obter predecessoras e sucessoras
  const predecessors = dependencies?.predecessors || [];
  const successors = dependencies?.successors || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-100">Dependências</h3>

      {/* Predecessoras */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tarefas Predecessoras (devem ser concluídas antes desta)
        </label>
        <div className="flex gap-2 mb-2">
          <select
            value={selectedPredecessor}
            onChange={(e) => setSelectedPredecessor(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Selecione uma tarefa...</option>
            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} ({task.status})
              </option>
            ))}
          </select>
          <button
            onClick={handleAddPredecessor}
            disabled={!selectedPredecessor || createDependencyMutation.isPending}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {predecessors.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma predecessora</p>
          ) : (
            predecessors.map((pred: Task) => {
              // Buscar o ID da dependência
              const dep = dependencies?.predecessorDependencies?.find(
                (d: any) => d.predecessor.id === pred.id
              );
              return (
                <div
                  key={pred.id}
                  className="flex items-center justify-between bg-gray-700 rounded p-2"
                >
                  <span className="text-sm text-gray-200">{pred.title}</span>
                  <button
                    onClick={() => handleRemovePredecessor(dep?.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remover
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sucessoras */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Tarefas Sucessoras (dependem desta tarefa)
        </label>
        <div className="flex gap-2 mb-2">
          <select
            value={selectedSuccessor}
            onChange={(e) => setSelectedSuccessor(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Selecione uma tarefa...</option>
            {availableTasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} ({task.status})
              </option>
            ))}
          </select>
          <button
            onClick={handleAddSuccessor}
            disabled={!selectedSuccessor || createDependencyMutation.isPending}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </div>
        <div className="space-y-2">
          {successors.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma sucessora</p>
          ) : (
            successors.map((succ: Task) => {
              // Buscar o ID da dependência
              const dep = dependencies?.successorDependencies?.find(
                (d: any) => d.successor.id === succ.id
              );
              return (
                <div
                  key={succ.id}
                  className="flex items-center justify-between bg-gray-700 rounded p-2"
                >
                  <span className="text-sm text-gray-200">{succ.title}</span>
                  <button
                    onClick={() => handleRemoveSuccessor(dep?.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remover
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

