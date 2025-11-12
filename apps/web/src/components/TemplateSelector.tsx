import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios.js";

interface Template {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  structure: any;
  createdAt: string;
}

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (templateId: string) => void;
}

export default function TemplateSelector({
  isOpen,
  onClose,
}: TemplateSelectorProps) {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");

  const { data: templates, isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => api.get("/templates").then((res) => res.data),
    enabled: isOpen,
  });

  const createProjectMutation = useMutation({
    mutationFn: ({ templateId, name, description }: { templateId: string; name: string; description?: string }) =>
      api.post(`/templates/${templateId}/create-project`, { name, description }),
    onSuccess: (data) => {
      navigate(`/projects/${data.data.id}`);
      onClose();
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao criar projeto a partir do template");
    },
  });

  const handleCreateProject = () => {
    if (!selectedTemplate || !projectName.trim()) {
      alert("Por favor, selecione um template e informe o nome do projeto");
      return;
    }

    createProjectMutation.mutate({
      templateId: selectedTemplate,
      name: projectName,
      description: projectDescription || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-100">Criar Projeto a partir de Template</h2>
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

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Carregando templates...</div>
          ) : (
            <div className="space-y-4">
              {/* Formulário de criação */}
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Informações do Projeto</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Nome do Projeto *
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Digite o nome do projeto"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Descrição (opcional)
                    </label>
                    <textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Digite uma descrição para o projeto"
                    />
                  </div>
                </div>
              </div>

              {/* Lista de templates */}
              <div>
                <h3 className="text-lg font-semibold text-gray-100 mb-4">Selecione um Template</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates?.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTemplate === template.id
                          ? "border-indigo-500 bg-indigo-900/20"
                          : "border-gray-600 bg-gray-700 hover:border-gray-500"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-100 mb-1">{template.name}</h4>
                          {template.isSystem && (
                            <span className="inline-block px-2 py-0.5 bg-blue-600 text-white text-xs rounded">
                              Sistema
                            </span>
                          )}
                        </div>
                        {selectedTemplate === template.id && (
                          <svg
                            className="w-5 h-5 text-indigo-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-400 mt-2">{template.description}</p>
                      )}
                      {template.structure && (
                        <div className="mt-3 text-xs text-gray-500">
                          <div className="flex gap-4">
                            {template.structure.columns && (
                              <span>
                                {template.structure.columns.length} coluna(s)
                              </span>
                            )}
                            {template.structure.tasks && (
                              <span>
                                {template.structure.tasks.length} tarefa(s)
                              </span>
                            )}
                            {template.structure.sprints && (
                              <span>
                                {template.structure.sprints.length} sprint(s)
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                {templates?.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    Nenhum template disponível
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateProject}
            disabled={!selectedTemplate || !projectName.trim() || createProjectMutation.isPending}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createProjectMutation.isPending ? "Criando..." : "Criar Projeto"}
          </button>
        </div>
      </div>
    </div>
  );
}

