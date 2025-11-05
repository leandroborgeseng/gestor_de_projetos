import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "../lib/axios.js";

export default function Resources() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    unitCost: "",
    unit: "month",
    notes: "",
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: () => api.get("/resources").then((res) => res.data),
  });

  const createResourceMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/resources", data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setShowForm(false);
      setFormData({
        name: "",
        type: "",
        unitCost: "",
        unit: "month",
        notes: "",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createResourceMutation.mutate({
      ...formData,
      unitCost: parseFloat(formData.unitCost),
    });
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Recursos</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
        >
          {showForm ? "Cancelar" : "Novo Recurso"}
        </button>
      </div>

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
                Tipo
              </label>
              <input
                type="text"
                required
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Custo Unitário
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.unitCost}
                onChange={(e) =>
                  setFormData({ ...formData, unitCost: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Unidade
              </label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="hour">Hora</option>
                <option value="month">Mês</option>
                <option value="unit">Unidade</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Notas
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
          >
            Criar Recurso
          </button>
        </form>
      )}

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Custo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Tarefas
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {resources?.map((resource: any) => (
              <tr key={resource.id} className="hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                  {resource.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {resource.type}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  R$ {Number(resource.unitCost).toFixed(2)} / {resource.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {resource.tasks?.length || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {resources?.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhum recurso cadastrado
        </div>
      )}
    </div>
  );
}

