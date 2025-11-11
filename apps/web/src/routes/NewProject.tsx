import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios.js";
import Navbar from "../components/Navbar.js";
import TemplateSelector from "../components/TemplateSelector.js";

export default function NewProject() {
  const navigate = useNavigate();
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    defaultHourlyRate: "",
    startDate: "",
    endDate: "",
    assignedUsers: [] as string[],
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data),
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: any) => api.post("/projects", data),
    onSuccess: (response) => {
      navigate(`/projects/${response.data.id}/board`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: any = {
      name: formData.name,
      description: formData.description || undefined,
      defaultHourlyRate: formData.defaultHourlyRate 
        ? parseFloat(formData.defaultHourlyRate) 
        : undefined,
    };

    createProjectMutation.mutate(submitData);
  };

  const handleUserToggle = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter((id) => id !== userId)
        : [...prev.assignedUsers, userId],
    }));
  };

  return (
    <div className="min-h-screen bg-surface text-primary transition-colors duration-200">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-gray-300 mb-4 flex items-center gap-2"
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
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Voltar para projetos
          </button>
          <h1 className="text-3xl font-bold text-gray-100">Criar Novo Projeto</h1>
          <p className="text-gray-400 mt-2">Preencha os dados para criar um novo projeto</p>
        </div>

        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setIsTemplateSelectorOpen(true)}
            className="px-6 py-3 bg-purple-700 text-white rounded-md hover:bg-purple-600 flex items-center gap-2"
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
                d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
              />
            </svg>
            Criar a partir de Template
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg shadow p-6 space-y-6">
          {createProjectMutation.isError && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
              {createProjectMutation.error instanceof Error
                ? createProjectMutation.error.message
                : "Erro ao criar projeto. Tente novamente."}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Projeto <span className="text-red-400">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Sistema de Gestão"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Descreva o objetivo e escopo do projeto..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-2">
                Data de Início
              </label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-2">
                Data de Término
              </label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="defaultHourlyRate" className="block text-sm font-medium text-gray-300 mb-2">
              Taxa Horária Padrão (R$)
            </label>
            <input
              id="defaultHourlyRate"
              type="number"
              step="0.01"
              min="0"
              value={formData.defaultHourlyRate}
              onChange={(e) => setFormData({ ...formData, defaultHourlyRate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: 120.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Esta taxa será usada como padrão para calcular custos de tarefas
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Atribuir Usuários ao Projeto
            </label>
            <div className="bg-gray-700 rounded-md p-4 border border-gray-600 max-h-64 overflow-y-auto">
              {users && users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user: any) => (
                    <label
                      key={user.id}
                      className="flex items-center space-x-3 p-2 hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.assignedUsers.includes(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500 focus:ring-2"
                      />
                      <div className="flex-1">
                        <span className="text-gray-100 font-medium">{user.name}</span>
                        <span className="text-gray-400 text-sm ml-2">({user.email})</span>
                        <span className="ml-2 px-2 py-0.5 bg-gray-600 text-gray-300 text-xs rounded">
                          {user.role}
                        </span>
                      </div>
                      {user.hourlyRate && (
                        <span className="text-gray-400 text-sm">
                          R$ {Number(user.hourlyRate).toFixed(2)}/h
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Carregando usuários...</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selecione os usuários que participarão deste projeto
            </p>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createProjectMutation.isPending}
              className="px-6 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createProjectMutation.isPending ? "Criando..." : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>

      <TemplateSelector
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
      />
    </div>
  );
}

