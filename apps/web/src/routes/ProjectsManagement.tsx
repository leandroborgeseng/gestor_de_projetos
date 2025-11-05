import { useState } from "react";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import * as v from "valibot";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/axios.js";
import Navbar from "../components/Navbar.js";

interface Project {
  id: string;
  name: string;
  description?: string;
  defaultHourlyRate?: number;
  archived?: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export default function ProjectsManagement() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const { data: projectsResponse, isLoading } = useQuery({
    queryKey: ["projects", searchQuery, showArchived],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("q", searchQuery);
      params.append("archived", showArchived ? "true" : "false");
      return api.get(`/projects?${params.toString()}`).then((res) => res.data);
    },
  });

  const projects = projectsResponse?.data || [];

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => api.delete(`/projects/${projectId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-summary"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao deletar projeto");
    },
  });

  const archiveProjectMutation = useMutation({
    mutationFn: (projectId: string) => api.post(`/projects/${projectId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-summary"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao arquivar projeto");
    },
  });

  const unarchiveProjectMutation = useMutation({
    mutationFn: (projectId: string) => api.post(`/projects/${projectId}/unarchive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-summary"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao desarquivar projeto");
    },
  });

  const handleDeleteProject = (project: Project) => {
    if (!window.confirm(`Tem certeza que deseja deletar o projeto "${project.name}"? Esta ação não pode ser desfeita e todas as tarefas, sprints e dados relacionados serão perdidos.`)) return;
    deleteProjectMutation.mutate(project.id);
  };

  const handleArchiveProject = (project: Project) => {
    if (!window.confirm(`Tem certeza que deseja arquivar o projeto "${project.name}"? O projeto será ocultado das telas principais, mas permanecerá disponível no histórico.`)) return;
    archiveProjectMutation.mutate(project.id);
  };

  const handleUnarchiveProject = (project: Project) => {
    unarchiveProjectMutation.mutate(project.id);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "N/A";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-100">Gerenciar Projetos</h1>
          <div className="flex gap-2">
            <Link
              to="/"
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
            >
              Voltar
            </Link>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 flex items-center gap-2"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Novo Projeto
            </button>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="mb-6 flex gap-4 items-center">
          <input
            type="text"
            placeholder="Buscar projetos por nome ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 md:w-1/2 px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
            />
            <span className="text-sm">Mostrar projetos arquivados</span>
          </label>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando projetos...</div>
        ) : (
          <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Projeto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Proprietário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Taxa Horária Padrão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {projects && projects.length > 0 ? (
                  projects.map((project: Project) => (
                    <tr key={project.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/projects/${project.id}/board`}
                              className="text-sm font-semibold text-indigo-400 hover:text-indigo-300"
                            >
                              {project.name}
                            </Link>
                            {project.archived && (
                              <span className="px-2 py-1 rounded text-xs bg-gray-600 text-gray-300 flex items-center gap-1">
                                <svg
                                  className="w-3 h-3"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                                  />
                                </svg>
                                Arquivado
                              </span>
                            )}
                          </div>
                          {project.description && (
                            <p className="text-xs text-gray-400 mt-1 max-w-md line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-300">{project.owner.name}</span>
                          <span className="text-xs">{project.owner.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatCurrency(project.defaultHourlyRate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(project.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <Link
                            to={`/projects/${project.id}/board`}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="Abrir projeto"
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
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </Link>
                          <button
                            onClick={() => handleEditProject(project)}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                            title="Editar projeto"
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
                          {project.archived ? (
                            <button
                              onClick={() => handleUnarchiveProject(project)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Desarquivar projeto"
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
                                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                                />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchiveProject(project)}
                              className="text-yellow-400 hover:text-yellow-300 transition-colors"
                              title="Arquivar projeto"
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
                                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                                />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteProject(project)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Deletar projeto"
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                      {searchQuery ? "Nenhum projeto encontrado" : "Nenhum projeto cadastrado"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal de Criar Projeto */}
        {showAddModal && (
          <CreateProjectModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              queryClient.invalidateQueries({ queryKey: ["projects"] });
              queryClient.invalidateQueries({ queryKey: ["projects-summary"] });
            }}
          />
        )}

        {/* Modal de Editar Projeto */}
        {showEditModal && selectedProject && (
          <EditProjectModal
            project={selectedProject}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedProject(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedProject(null);
              queryClient.invalidateQueries({ queryKey: ["projects"] });
              queryClient.invalidateQueries({ queryKey: ["projects-summary"] });
            }}
          />
        )}
      </div>
    </div>
  );
}

// Modal de Criar Projeto
interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const projectSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nome do projeto é obrigatório")),
  description: v.optional(v.string()),
  defaultHourlyRate: v.optional(v.pipe(v.string(), v.transform((val) => val === "" ? undefined : parseFloat(val)), v.optional(v.number()))),
});

type ProjectFormData = v.InferInput<typeof projectSchema>;

function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<ProjectFormData>({
    resolver: valibotResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      defaultHourlyRate: "",
    },
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: any) => api.post("/projects", data),
    onSuccess: (response) => {
      onSuccess();
      reset();
      // Opcional: navegar para o novo projeto
      // navigate(`/projects/${response.data.id}/board`);
    },
    onError: (err: any) => {
      setError("root", {
        message:
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Erro ao criar projeto. Tente novamente.",
      });
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    const submitData: any = {
      name: data.name,
      description: data.description || undefined,
    };

    if (data.defaultHourlyRate !== undefined && data.defaultHourlyRate !== "") {
      submitData.defaultHourlyRate = parseFloat(data.defaultHourlyRate as string);
    }

    createProjectMutation.mutate(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-gray-100">Criar Novo Projeto</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {errors.root && (
            <div className="bg-red-900/20 text-red-400 p-3 rounded-md text-sm">
              {errors.root.message}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Projeto
            </label>
            <input
              id="name"
              type="text"
              {...register("name")}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Descreva o projeto..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
            )}
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
              {...register("defaultHourlyRate")}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: 120.00"
            />
            {errors.defaultHourlyRate && (
              <p className="mt-1 text-sm text-red-400">{errors.defaultHourlyRate.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Criando..." : "Criar Projeto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de Editar Projeto
interface EditProjectModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function EditProjectModal({ project, isOpen, onClose, onSuccess }: EditProjectModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<ProjectFormData>({
    resolver: valibotResolver(projectSchema),
    defaultValues: {
      name: project.name,
      description: project.description || "",
      defaultHourlyRate: project.defaultHourlyRate?.toString() || "",
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/projects/${project.id}`, data),
    onSuccess: () => {
      onSuccess();
    },
    onError: (err: any) => {
      setError("root", {
        message:
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Erro ao atualizar projeto. Tente novamente.",
      });
    },
  });

  const onSubmit = async (data: ProjectFormData) => {
    const submitData: any = {
      name: data.name,
      description: data.description || undefined,
    };

    if (data.defaultHourlyRate !== undefined && data.defaultHourlyRate !== "") {
      submitData.defaultHourlyRate = parseFloat(data.defaultHourlyRate as string);
    } else {
      submitData.defaultHourlyRate = null;
    }

    updateProjectMutation.mutate(submitData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-gray-100">Editar Projeto: {project.name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {errors.root && (
            <div className="bg-red-900/20 text-red-400 p-3 rounded-md text-sm">
              {errors.root.message}
            </div>
          )}

          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Projeto
            </label>
            <input
              id="edit-name"
              type="text"
              {...register("name")}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              id="edit-description"
              {...register("description")}
              rows={3}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Descreva o projeto..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-defaultHourlyRate" className="block text-sm font-medium text-gray-300 mb-2">
              Taxa Horária Padrão (R$)
            </label>
            <input
              id="edit-defaultHourlyRate"
              type="number"
              step="0.01"
              min="0"
              {...register("defaultHourlyRate")}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: 120.00"
            />
            {errors.defaultHourlyRate && (
              <p className="mt-1 text-sm text-red-400">{errors.defaultHourlyRate.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

