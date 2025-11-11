import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useState } from "react";
import api from "../lib/axios.js";
import EditSprintModal from "../components/EditSprintModal.js";
import SprintBurndownChart from "../components/SprintBurndownChart.js";
import VelocityChart from "../components/VelocityChart.js";
import CloneSprintModal from "../components/CloneSprintModal.js";

export default function Sprints() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedSprint, setSelectedSprint] = useState<any>(null);
  const [showBurndown, setShowBurndown] = useState<string | null>(null);
  const [showVelocity, setShowVelocity] = useState(false);
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [selectedSprintForClone, setSelectedSprintForClone] = useState<{ id: string; name: string } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    startDate: "",
    endDate: "",
  });

  const { data: sprints, isLoading } = useQuery({
    queryKey: ["sprints", id],
    queryFn: () => api.get(`/projects/${id}/sprints`).then((res) => res.data),
    enabled: !!id,
  });

  const createSprintMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/projects/${id}/sprints`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", id] });
      setShowForm(false);
      setFormData({ name: "", goal: "", startDate: "", endDate: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSprintMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Sprints</h2>
        <div className="flex gap-2">
          {id && (
            <button
              onClick={() => setShowVelocity(!showVelocity)}
              className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-600 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {showVelocity ? "Ocultar Velocity" : "Velocity"}
            </button>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
          >
            {showForm ? "Cancelar" : "Nova Sprint"}
          </button>
        </div>
      </div>

      {/* Gráfico de Velocity */}
      {showVelocity && id && (
        <div className="mb-6">
          <VelocityChart projectId={id} />
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800 rounded-lg shadow p-6 mb-6"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Nome
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Objetivo
              </label>
              <input
                type="text"
                value={formData.goal}
                onChange={(e) =>
                  setFormData({ ...formData, goal: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Data Início
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Data Fim
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
          >
            Criar Sprint
          </button>
        </form>
      )}

      <div className="space-y-4">
        {sprints?.map((sprint: any) => (
          <div
            key={sprint.id}
            className="bg-gray-800 rounded-lg shadow p-6"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-100">{sprint.name}</h3>
                {sprint.goal && (
                  <p className="text-gray-400 mt-1">{sprint.goal}</p>
                )}
                <div className="text-sm text-gray-400 mt-2">
                  {new Date(sprint.startDate).toLocaleDateString("pt-BR")} -{" "}
                  {new Date(sprint.endDate).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBurndown(showBurndown === sprint.id ? null : sprint.id)}
                  className="px-3 py-1 bg-blue-700 text-white rounded-md hover:bg-blue-600 text-sm"
                >
                  {showBurndown === sprint.id ? "Ocultar" : "Burndown"}
                </button>
                <button
                  onClick={() => {
                    setSelectedSprintForClone({ id: sprint.id, name: sprint.name });
                    setCloneModalOpen(true);
                  }}
                  className="px-3 py-1 bg-purple-700 text-white rounded-md hover:bg-purple-600 text-sm flex items-center gap-1"
                  title="Clonar sprint"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Clonar
                </button>
                <button
                  onClick={() => setSelectedSprint(sprint)}
                  className="px-3 py-1 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 text-sm"
                >
                  Editar
                </button>
              </div>
            </div>
            <div className="text-sm text-gray-300 mb-4">
              {sprint.tasks?.length || 0} tarefas
            </div>
            
            {/* Gráfico de Burndown */}
            {showBurndown === sprint.id && (
              <div className="mt-4">
                <SprintBurndownChart sprintId={sprint.id} />
              </div>
            )}
          </div>
        ))}
        {sprints?.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            Nenhuma sprint criada ainda
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      {selectedSprint && (
        <EditSprintModal
          projectId={id || ""}
          sprint={selectedSprint}
          isOpen={!!selectedSprint}
          onClose={() => setSelectedSprint(null)}
          onSuccess={() => {
            setSelectedSprint(null);
            queryClient.invalidateQueries({ queryKey: ["sprints", id] });
          }}
        />
      )}

      {/* Modal de Clonagem */}
      {selectedSprintForClone && id && (
        <CloneSprintModal
          sprintId={selectedSprintForClone.id}
          sprintName={selectedSprintForClone.name}
          projectId={id}
          isOpen={cloneModalOpen}
          onClose={() => {
            setCloneModalOpen(false);
            setSelectedSprintForClone(null);
          }}
        />
      )}
    </div>
  );
}

