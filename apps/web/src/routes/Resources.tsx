import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import api from "../lib/axios.js";
import SkillsModal from "../components/SkillsModal.js";

export default function Resources() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    unitCost: "",
    unit: "month",
    notes: "",
    availableHours: "",
    resourceSkills: [] as Array<{ skillId: string; score: number }>,
  });

  const { data: skills } = useQuery({
    queryKey: ["skills"],
    queryFn: () => api.get("/skills").then((res) => res.data),
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
        availableHours: "",
        resourceSkills: [],
      });
    },
  });

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.patch(`/resources/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setShowEditModal(false);
      setSelectedResource(null);
    },
  });

  const deleteResourceMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/resources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      name: formData.name,
      type: formData.type,
      unitCost: parseFloat(formData.unitCost),
      unit: formData.unit,
      notes: formData.notes || undefined,
    };
    
    // Se for pessoa, incluir horas disponíveis e habilidades
    if (formData.type.toLowerCase() === "pessoa" || formData.type.toLowerCase() === "person") {
      if (formData.availableHours) {
        data.availableHours = parseFloat(formData.availableHours);
      }
      if (formData.resourceSkills.length > 0) {
        data.resourceSkills = formData.resourceSkills;
      }
    } else {
      // Remover campos específicos de pessoa se não for pessoa
      delete data.availableHours;
      delete data.resourceSkills;
    }

    if (selectedResource) {
      updateResourceMutation.mutate({ id: selectedResource.id, data });
    } else {
      createResourceMutation.mutate(data);
    }
  };

  const handleAddSkill = (skillId: string) => {
    if (!formData.resourceSkills.some((rs) => rs.skillId === skillId)) {
      setFormData({
        ...formData,
        resourceSkills: [...formData.resourceSkills, { skillId, score: 5 }],
      });
    }
  };

  const handleRemoveSkill = (skillId: string) => {
    setFormData({
      ...formData,
      resourceSkills: formData.resourceSkills.filter((rs) => rs.skillId !== skillId),
    });
  };

  const handleUpdateSkillScore = (skillId: string, score: number) => {
    setFormData({
      ...formData,
      resourceSkills: formData.resourceSkills.map((rs) =>
        rs.skillId === skillId ? { ...rs, score: Math.max(0, Math.min(10, score)) } : rs
      ),
    });
  };

  const handleEdit = (resource: any) => {
    setSelectedResource(resource);
    setFormData({
      name: resource.name,
      type: resource.type,
      unitCost: resource.unitCost.toString(),
      unit: resource.unit,
      notes: resource.notes || "",
      availableHours: resource.availableHours?.toString() || "",
      resourceSkills: resource.skills?.map((s: any) => ({
        skillId: s.id,
        score: s.score || 0,
      })) || [],
    });
    setShowEditModal(true);
    setShowForm(false);
  };

  const handleDelete = (resource: any) => {
    if (!window.confirm(`Tem certeza que deseja deletar o recurso "${resource.name}"?`)) return;
    deleteResourceMutation.mutate(resource.id);
  };

  const isPersonResource = formData.type && (formData.type.toLowerCase() === "pessoa" || formData.type.toLowerCase() === "person");

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

      {/* Modal de Edição */}
      {showEditModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 my-8">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-gray-100">Editar Recurso</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedResource(null);
                  setFormData({
                    name: "",
                    type: "",
                    unitCost: "",
                    unit: "month",
                    notes: "",
                    availableHours: "",
                    resourceSkills: [],
                  });
                }}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Tipo</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Selecione...</option>
                    <option value="pessoa">Pessoa</option>
                    <option value="infraestrutura">Infraestrutura</option>
                    <option value="licença">Licença</option>
                    <option value="equipamento">Equipamento</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Custo Unitário</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Unidade</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="hour">Hora</option>
                    <option value="month">Mês</option>
                    <option value="unit">Unidade</option>
                  </select>
                </div>
                {isPersonResource && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Horas Disponíveis (por mês)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.availableHours}
                        onChange={(e) => setFormData({ ...formData, availableHours: e.target.value })}
                        placeholder="Ex: 160"
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-1">Habilidades</label>
                      <div className="flex gap-2 mb-2">
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAddSkill(e.target.value);
                              e.target.value = "";
                            }
                          }}
                          className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">Selecione uma habilidade...</option>
                          {skills
                            ?.filter((skill: any) => !formData.resourceSkills.some((rs) => rs.skillId === skill.id))
                            .map((skill: any) => (
                              <option key={skill.id} value={skill.id}>
                                {skill.name} {skill.category ? `(${skill.category})` : ""}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setShowSkillsModal(true)}
                          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 text-sm whitespace-nowrap"
                        >
                          Gerenciar Habilidades
                        </button>
                      </div>
                      {formData.resourceSkills.length > 0 && (
                        <div className="space-y-2">
                          {formData.resourceSkills.map((rs) => {
                            const skill = skills?.find((s: any) => s.id === rs.skillId);
                            return (
                              <div
                                key={rs.skillId}
                                className="flex items-center gap-3 p-3 bg-gray-700 rounded-md"
                              >
                                <div className="flex-1">
                                  <span className="text-gray-100 font-medium">
                                    {skill?.name || "Habilidade não encontrada"}
                                  </span>
                                  {skill?.category && (
                                    <span className="text-gray-400 text-sm ml-2">({skill.category})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-gray-300">Nível:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    value={rs.score}
                                    onChange={(e) =>
                                      handleUpdateSkillScore(rs.skillId, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-20 px-2 py-1 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                  <span className="text-xs text-gray-400">/10</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSkill(rs.skillId)}
                                  className="text-red-400 hover:text-red-300 transition-colors"
                                  title="Remover habilidade"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Notas</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedResource(null);
                    setFormData({
                      name: "",
                      type: "",
                      unitCost: "",
                      unit: "month",
                      notes: "",
                      availableHours: "",
                      resourceSkills: [],
                    });
                  }}
                  className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
                >
                  Atualizar
                </button>
              </div>
            </form>
          </div>
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
                Tipo
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Selecione...</option>
                <option value="pessoa">Pessoa</option>
                <option value="infraestrutura">Infraestrutura</option>
                <option value="licença">Licença</option>
                <option value="equipamento">Equipamento</option>
                <option value="outro">Outro</option>
              </select>
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
            
            {/* Campos específicos para pessoa */}
            {isPersonResource && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Horas Disponíveis (por mês)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.availableHours}
                    onChange={(e) =>
                      setFormData({ ...formData, availableHours: e.target.value })
                    }
                    placeholder="Ex: 160"
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Habilidades
                  </label>
                  <div className="flex gap-2 mb-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddSkill(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Selecione uma habilidade...</option>
                      {skills
                        ?.filter((skill: any) => !formData.resourceSkills.some((rs) => rs.skillId === skill.id))
                        .map((skill: any) => (
                          <option key={skill.id} value={skill.id}>
                            {skill.name} {skill.category ? `(${skill.category})` : ""}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowSkillsModal(true);
                      }}
                      className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 text-sm whitespace-nowrap"
                    >
                      Gerenciar Habilidades
                    </button>
                  </div>
                  {formData.resourceSkills.length > 0 && (
                    <div className="space-y-2">
                      {formData.resourceSkills.map((rs) => {
                        const skill = skills?.find((s: any) => s.id === rs.skillId);
                        return (
                          <div
                            key={rs.skillId}
                            className="flex items-center gap-3 p-3 bg-gray-700 rounded-md"
                          >
                            <div className="flex-1">
                              <span className="text-gray-100 font-medium">
                                {skill?.name || "Habilidade não encontrada"}
                              </span>
                              {skill?.category && (
                                <span className="text-gray-400 text-sm ml-2">({skill.category})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-sm text-gray-300">Nível:</label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                step="0.5"
                                value={rs.score}
                                onChange={(e) =>
                                  handleUpdateSkillScore(rs.skillId, parseFloat(e.target.value) || 0)
                                }
                                className="w-20 px-2 py-1 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                              <span className="text-xs text-gray-400">/10</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveSkill(rs.skillId)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Remover habilidade"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

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
            {selectedResource ? "Atualizar Recurso" : "Criar Recurso"}
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
              {(resources || []).some((r: any) => (r.type?.toLowerCase() === "pessoa" || r.type?.toLowerCase() === "person")) && (
                <>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Horas Disponíveis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Horas Alocadas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Habilidades
                  </th>
                </>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Tarefas
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {resources?.map((resource: any) => {
              const isPerson = resource.type?.toLowerCase() === "pessoa" || resource.type?.toLowerCase() === "person";
              const availableHours = resource.availableHours || 0;
              const allocatedHours = resource.allocatedHours || 0;
              const utilizationPercentage = availableHours > 0 
                ? ((allocatedHours / availableHours) * 100).toFixed(1)
                : "0";
              const skills = resource.skills || [];

              return (
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
                  {isPerson && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {availableHours > 0 ? `${availableHours}h` : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span className={allocatedHours > availableHours ? "text-red-400" : "text-gray-400"}>
                            {allocatedHours.toFixed(1)}h
                          </span>
                          {availableHours > 0 && (
                            <span className={`text-xs ${
                              parseFloat(utilizationPercentage) > 100 ? "text-red-400" :
                              parseFloat(utilizationPercentage) > 80 ? "text-yellow-400" :
                              "text-green-400"
                            }`}>
                              ({utilizationPercentage}%)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {skills.length > 0 ? (
                          <div className="space-y-1">
                            {skills.slice(0, 3).map((skill: any, idx: number) => (
                              <div key={idx} className="flex items-center gap-2">
                                <span className="px-2 py-1 bg-indigo-900/30 text-indigo-300 rounded text-xs">
                                  {skill.name}
                                </span>
                                <span className="text-yellow-400 text-xs font-medium">
                                  {skill.score?.toFixed(1) || "0.0"}/10
                                </span>
                              </div>
                            ))}
                            {skills.length > 3 && (
                              <span className="px-2 py-1 text-gray-400 text-xs">
                                +{skills.length - 3} habilidade(s)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 text-xs">Nenhuma</span>
                        )}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {resource.tasks?.length || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(resource)}
                        className="text-indigo-400 hover:text-indigo-300 transition-colors"
                        title="Editar recurso"
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
                      <button
                        onClick={() => handleDelete(resource)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Deletar recurso"
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
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {resources?.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhum recurso cadastrado
        </div>
      )}

      <SkillsModal
        isOpen={showSkillsModal}
        onClose={() => {
          setShowSkillsModal(false);
          queryClient.invalidateQueries({ queryKey: ["skills"] });
        }}
      />
    </div>
  );
}

