import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import * as v from "valibot";
import api from "../lib/axios.js";
import Navbar from "../components/Navbar.js";

interface Tag {
  id: string;
  name: string;
  color: string;
  projectId?: string;
  project?: { id: string; name: string };
  _count?: {
    tasks: number;
  };
}

const tagSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nome é obrigatório")),
  color: v.optional(v.pipe(v.string(), v.regex(/^#[0-9A-F]{6}$/i, "Cor deve estar no formato hexadecimal (#RRGGBB)"))),
  projectId: v.optional(v.string()),
});

type TagFormData = v.InferInput<typeof tagSchema>;

export default function TagsManagement() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [filterType, setFilterType] = useState<"all" | "global" | "project">("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const { data: globalTags, isLoading: isLoadingGlobal } = useQuery<Tag[]>({
    queryKey: ["tags", "global"],
    queryFn: () => api.get("/tags").then((res) => res.data),
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects").then((res) => res.data),
  });

  const { data: projectTags, isLoading: isLoadingProject } = useQuery<Tag[]>({
    queryKey: ["tags", "project", selectedProjectId],
    queryFn: () => api.get(`/tags?projectId=${selectedProjectId}`).then((res) => res.data),
    enabled: !!selectedProjectId && filterType === "project",
  });

  const createMutation = useMutation({
    mutationFn: (data: TagFormData) => api.post("/tags", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setIsCreateModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TagFormData> }) =>
      api.patch(`/tags/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      setIsEditModalOpen(false);
      setSelectedTag(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: errorsCreate, isSubmitting: isSubmittingCreate },
    reset: resetCreate,
  } = useForm<TagFormData>({
    resolver: valibotResolver(tagSchema),
    defaultValues: {
      name: "",
      color: "#6366f1",
      projectId: "",
    },
  });

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: errorsEdit, isSubmitting: isSubmittingEdit },
    reset: resetEdit,
    setValue: setValueEdit,
  } = useForm<TagFormData>({
    resolver: valibotResolver(tagSchema),
    defaultValues: {
      name: "",
      color: "#6366f1",
      projectId: "",
    },
  });

  const onCreateSubmit = async (data: TagFormData) => {
    try {
      await createMutation.mutateAsync(data);
      resetCreate();
    } catch (error) {
      console.error("Erro ao criar tag:", error);
    }
  };

  const onEditSubmit = async (data: TagFormData) => {
    if (!selectedTag) return;
    try {
      await updateMutation.mutateAsync({ id: selectedTag.id, data });
      resetEdit();
    } catch (error) {
      console.error("Erro ao atualizar tag:", error);
    }
  };

  const handleEdit = (tag: Tag) => {
    setSelectedTag(tag);
    setValueEdit("name", tag.name);
    setValueEdit("color", tag.color);
    setValueEdit("projectId", tag.projectId || "");
    setIsEditModalOpen(true);
  };

  const handleDelete = (tag: Tag) => {
    if (!window.confirm(`Tem certeza que deseja excluir a tag "${tag.name}"?`)) return;
    deleteMutation.mutate(tag.id);
  };

  const filteredTags = () => {
    if (filterType === "global") {
      return globalTags || [];
    } else if (filterType === "project" && selectedProjectId) {
      return projectTags || [];
    } else {
      // Combinar todas as tags
      const allTags = [...(globalTags || [])];
      if (projectTags) {
        projectTags.forEach((pt) => {
          if (!allTags.some((gt) => gt.id === pt.id)) {
            allTags.push(pt);
          }
        });
      }
      return allTags;
    }
  };

  if (isLoadingGlobal || (filterType === "project" && isLoadingProject)) {
    return (
      <div className="min-h-screen bg-surface text-primary transition-colors duration-200">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-primary transition-colors duration-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-100">Gerenciar Tags</h1>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Tag
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-6 flex gap-4 items-center">
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as "all" | "global" | "project");
              setSelectedProjectId("");
            }}
            className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Todas as Tags</option>
            <option value="global">Tags Globais</option>
            <option value="project">Tags por Projeto</option>
          </select>

          {filterType === "project" && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Selecione um projeto</option>
              {projects?.map((project: any) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Lista de Tags */}
        <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Cor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Projeto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tarefas
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {filteredTags().length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      Nenhuma tag encontrada
                    </td>
                  </tr>
                ) : (
                  filteredTags().map((tag) => (
                    <tr key={tag.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-100">{tag.name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded border border-gray-600"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm text-gray-400">{tag.color}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300">
                          {tag.projectId ? "Projeto" : "Global"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-400">
                          {tag.project?.name || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-400">
                          {tag._count?.tasks || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(tag)}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(tag)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            disabled={deleteMutation.isPending}
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Criar Tag */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-100">Criar Tag</h2>
                <button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    resetCreate();
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmitCreate(onCreateSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...registerCreate("name")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {errorsCreate.name && (
                    <p className="mt-1 text-sm text-red-400">{errorsCreate.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cor</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      {...registerCreate("color")}
                      className="w-16 h-10 rounded border border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      {...registerCreate("color")}
                      placeholder="#6366f1"
                      className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  {errorsCreate.color && (
                    <p className="mt-1 text-sm text-red-400">{errorsCreate.color.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Projeto (opcional - deixe vazio para tag global)
                  </label>
                  <select
                    {...registerCreate("projectId")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Tag Global</option>
                    {projects?.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateModalOpen(false);
                      resetCreate();
                    }}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCreate || createMutation.isPending}
                    className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {isSubmittingCreate || createMutation.isPending ? "Criando..." : "Criar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Tag */}
        {isEditModalOpen && selectedTag && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
              <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-100">Editar Tag</h2>
                <button
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedTag(null);
                    resetEdit();
                  }}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleSubmitEdit(onEditSubmit)} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome <span className="text-red-400">*</span>
                  </label>
                  <input
                    {...registerEdit("name")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {errorsEdit.name && (
                    <p className="mt-1 text-sm text-red-400">{errorsEdit.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Cor</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      {...registerEdit("color")}
                      className="w-16 h-10 rounded border border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      {...registerEdit("color")}
                      placeholder="#6366f1"
                      className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  {errorsEdit.color && (
                    <p className="mt-1 text-sm text-red-400">{errorsEdit.color.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Projeto (opcional - deixe vazio para tag global)
                  </label>
                  <select
                    {...registerEdit("projectId")}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Tag Global</option>
                    {projects?.map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedTag(null);
                      resetEdit();
                    }}
                    className="px-4 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit || updateMutation.isPending}
                    className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {isSubmittingEdit || updateMutation.isPending ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

