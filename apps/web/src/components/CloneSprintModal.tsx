import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface CloneSprintModalProps {
  sprintId: string;
  sprintName: string;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function CloneSprintModal({
  sprintId,
  sprintName,
  projectId,
  isOpen,
  onClose,
}: CloneSprintModalProps) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [includeTasks, setIncludeTasks] = useState(true);
  const [shiftDays, setShiftDays] = useState(14); // Deslocar 14 dias por padrão

  const cloneMutation = useMutation({
    mutationFn: (data: any) => api.post(`/projects/sprints/${sprintId}/clone`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      onClose();
      alert("Sprint clonada com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao clonar sprint");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    cloneMutation.mutate({
      name: newName || `${sprintName} (Cópia)`,
      projectId,
      includeTasks,
      shiftDays: parseInt(shiftDays.toString()) || 0,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-100">Clonar Sprint</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome da Nova Sprint
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder={`${sprintName} (Cópia)`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Deslocar Datas (dias)
            </label>
            <input
              type="number"
              value={shiftDays}
              onChange={(e) => setShiftDays(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="14"
            />
            <p className="text-xs text-gray-500 mt-1">
              Número de dias para deslocar as datas da sprint clonada
            </p>
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={includeTasks}
                onChange={(e) => setIncludeTasks(e.target.checked)}
                className="w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-300">Incluir tarefas da sprint</span>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-7">
              As tarefas clonadas terão status resetado para "Backlog"
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cloneMutation.isPending}
              className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cloneMutation.isPending ? "Clonando..." : "Clonar Sprint"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

