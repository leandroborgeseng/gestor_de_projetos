import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "react-router-dom";
import api from "../lib/axios.js";
import Navbar from "../components/Navbar.js";

interface ProjectMember {
  id: string;
  userId: string;
  role: "OWNER" | "PROJECT_MANAGER" | "MEMBER";
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    hourlyRate?: number;
  };
}

export default function People() {
  const { id: projectId } = useParams<{ id: string }>();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Verificar se está dentro de um projeto (via ProjectLayout) ou como página standalone
  const isInsideProject = location.pathname.includes("/projects/") && projectId;
  
  // Se está dentro de um projeto, usar o ID do projeto automaticamente
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projectId || null
  );
  
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"PROJECT_MANAGER" | "MEMBER">("MEMBER");
  const [showAddMember, setShowAddMember] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"list" | "detail">("list");

  // Buscar projetos (apenas não arquivados)
  const { data: projectsResponse } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects?archived=false").then((res) => res.data),
  });

  const projects = projectsResponse?.data || [];

  // Buscar membros de todos os projetos (para a lista)
  const { data: allProjectsMembers } = useQuery({
    queryKey: ["all-projects-members"],
    queryFn: async () => {
      const membersData: Record<string, ProjectMember[]> = {};
      for (const project of projects) {
        try {
          const response = await api.get(`/projects/${project.id}/members`);
          membersData[project.id] = response.data;
        } catch (err) {
          membersData[project.id] = [];
        }
      }
      return membersData;
    },
    enabled: projects.length > 0 && viewMode === "list",
  });

  // Buscar membros do projeto selecionado
  const { data: members, isLoading: isLoadingMembers } = useQuery<ProjectMember[]>({
    queryKey: ["project-members", selectedProjectId],
    queryFn: () => {
      if (!selectedProjectId) return Promise.resolve([]);
      return api.get(`/projects/${selectedProjectId}/members`).then((res) => res.data);
    },
    enabled: !!selectedProjectId,
  });

  // Buscar todos os usuários para o dropdown
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data),
  });

  // Adicionar membro
  const addMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: "PROJECT_MANAGER" | "MEMBER" }) =>
      api.post(`/projects/${selectedProjectId}/members`, { userId, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["all-projects-members"] });
      setShowAddMember(false);
      setSelectedUserId("");
      setSelectedRole("MEMBER");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao adicionar membro");
    },
  });

  // Atualizar role do membro
  const updateMemberMutation = useMutation({
    mutationFn: ({ projectId, memberId, role }: { projectId: string; memberId: string; role: "PROJECT_MANAGER" | "MEMBER" }) =>
      api.patch(`/projects/${projectId}/members/${memberId}`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["all-projects-members"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao atualizar membro");
    },
  });

  // Remover membro
  const removeMemberMutation = useMutation({
    mutationFn: ({ projectId, memberId }: { projectId: string; memberId: string }) =>
      api.delete(`/projects/${projectId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-members", selectedProjectId] });
      queryClient.invalidateQueries({ queryKey: ["all-projects-members"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao remover membro");
    },
  });

  const handleAddMember = () => {
    if (!selectedUserId || !selectedProjectId) return;
    addMemberMutation.mutate({ userId: selectedUserId, role: selectedRole });
  };

  const handleUpdateRole = (projectId: string, memberId: string, newRole: "PROJECT_MANAGER" | "MEMBER") => {
    updateMemberMutation.mutate({ projectId, memberId, role: newRole });
  };

  const handleRemoveMember = (projectId: string, memberId: string, userName: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${userName} deste projeto?`)) return;
    removeMemberMutation.mutate({ projectId, memberId });
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const handleEditProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setViewMode("detail");
    setShowAddMember(false);
  };

  // Filtrar usuários que ainda não são membros do projeto
  const availableUsers = users?.filter((user: any) => {
    if (!members) return true;
    return !members.some((m) => m.userId === user.id);
  });

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      OWNER: "Dono do Projeto",
      PROJECT_MANAGER: "Gerente do Projeto",
      MEMBER: "Membro",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: "bg-purple-900/30 text-purple-300",
      PROJECT_MANAGER: "bg-indigo-900/30 text-indigo-300",
      MEMBER: "bg-blue-900/30 text-blue-300",
    };
    return colors[role] || "bg-gray-700 text-gray-300";
  };

  const content = (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Gerenciar Acessos por Projeto</h2>
        {!isInsideProject && viewMode === "list" && (
          <button
            onClick={() => setViewMode("detail")}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 text-sm"
          >
            Gerenciar Projeto Específico
          </button>
        )}
        {!isInsideProject && viewMode === "detail" && (
          <button
            onClick={() => {
              setViewMode("list");
              setSelectedProjectId(null);
            }}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 text-sm"
          >
            Voltar para Lista
          </button>
        )}
      </div>

      {/* Modo Lista - Mostra todos os projetos com seus acessos */}
      {!isInsideProject && viewMode === "list" && (
        <div className="space-y-4">
          {projects && projects.length > 0 ? (
            projects.map((project: any) => {
              const projectMembers = allProjectsMembers?.[project.id] || [];
              const isExpanded = expandedProjects.has(project.id);
              const memberCount = projectMembers.length;

              return (
                <div key={project.id} className="bg-gray-800 rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-700 transition-colors">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-100">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-400">
                          {memberCount} {memberCount === 1 ? "membro" : "membros"}
                        </span>
                        <span className="text-sm text-gray-400">
                          Proprietário: {project.owner?.name || "N/A"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProject(project.id)}
                        className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 text-sm transition-colors"
                        title="Editar acessos do projeto"
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
                        onClick={() => toggleProjectExpansion(project.id)}
                        className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 text-sm transition-colors"
                        title={isExpanded ? "Ocultar membros" : "Ver membros"}
                      >
                        <svg
                          className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t border-gray-700">
                      {projectMembers.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-700">
                            <thead className="bg-gray-700">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  Nome
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  Email
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  Função Global
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  Função no Projeto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  Taxa Horária
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                  Ações
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-gray-800 divide-y divide-gray-700">
                              {projectMembers.map((member: ProjectMember) => (
                                <tr key={member.id} className="hover:bg-gray-700 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                                    {member.user.name}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                    {member.user.email}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs">
                                      {member.user.role}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {member.role === "OWNER" ? (
                                      <span className={`px-2 py-1 rounded text-xs ${getRoleColor(member.role)}`}>
                                        {getRoleLabel(member.role)}
                                      </span>
                                    ) : (
                                      <select
                                        value={member.role}
                                        onChange={(e) => {
                                          const newRole = e.target.value as "PROJECT_MANAGER" | "MEMBER";
                                          handleUpdateRole(project.id, member.id, newRole);
                                        }}
                                        disabled={updateMemberMutation.isPending}
                                        className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <option value="MEMBER">Membro</option>
                                        <option value="PROJECT_MANAGER">Gerente do Projeto</option>
                                      </select>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                    {member.user.hourlyRate
                                      ? `R$ ${Number(member.user.hourlyRate).toFixed(2)}/h`
                                      : "N/A"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    {member.role !== "OWNER" && (
                                      <button
                                        onClick={() => handleRemoveMember(project.id, member.id, member.user.name)}
                                        disabled={removeMemberMutation.isPending}
                                        className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Remover membro"
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
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="px-6 py-8 text-center text-gray-400">
                          Nenhum membro encontrado neste projeto.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-400">
              <p>Nenhum projeto encontrado.</p>
            </div>
          )}
        </div>
      )}

      {/* Modo Detalhe - Mostra o gerenciamento detalhado de um projeto específico */}
      {(!isInsideProject && viewMode === "detail") && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Selecione um Projeto
          </label>
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="w-full md:w-1/3 px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Selecione um projeto...</option>
            {projects?.map((project: any) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {((selectedProjectId && (viewMode === "detail" || isInsideProject)) || isInsideProject) ? (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-200">
              Membros do Projeto
              {isInsideProject && projects && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({projects.find((p: any) => p.id === selectedProjectId)?.name || ""})
                </span>
              )}
            </h3>
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 text-sm"
            >
              {showAddMember ? "Cancelar" : "+ Adicionar Membro"}
            </button>
          </div>

          {/* Formulário de Adicionar Membro */}
          {showAddMember && (
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h4 className="text-md font-medium text-gray-200 mb-3">Adicionar Novo Membro</h4>
              <div className="flex gap-4">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Selecione um usuário...</option>
                  {availableUsers?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as "PROJECT_MANAGER" | "MEMBER")}
                  className="px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="MEMBER">Membro</option>
                  <option value="PROJECT_MANAGER">Gerente do Projeto</option>
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedUserId || addMemberMutation.isPending}
                  className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addMemberMutation.isPending ? "Adicionando..." : "Adicionar"}
                </button>
              </div>
            </div>
          )}

          {/* Lista de Membros */}
          {isLoadingMembers ? (
            <div className="text-center py-12 text-gray-400">Carregando membros...</div>
          ) : (
            <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Função Global
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Função no Projeto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Taxa Horária
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {members && members.length > 0 ? (
                    members.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                          {member.user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {member.user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs">
                            {member.user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {member.role === "OWNER" ? (
                            <span className={`px-2 py-1 rounded text-xs ${getRoleColor(member.role)}`}>
                              {getRoleLabel(member.role)}
                            </span>
                          ) : (
                            <select
                              value={member.role}
                                        onChange={(e) =>
                                handleUpdateRole(
                                  selectedProjectId!,
                                  member.id,
                                  e.target.value as "PROJECT_MANAGER" | "MEMBER"
                                )
                              }
                              className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-100 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="MEMBER">Membro</option>
                              <option value="PROJECT_MANAGER">Gerente do Projeto</option>
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                          {member.user.hourlyRate
                            ? `R$ ${Number(member.user.hourlyRate).toFixed(2)}/h`
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {member.role !== "OWNER" && (
                            <button
                              onClick={() => handleRemoveMember(selectedProjectId!, member.id, member.user.name)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Remover membro"
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
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        Nenhum membro encontrado. Adicione membros ao projeto.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        !isInsideProject && viewMode === "detail" ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-4">Selecione um projeto para gerenciar seus membros</p>
            <Link
              to="/"
              className="text-indigo-400 hover:text-indigo-300 underline"
            >
              Voltar para Dashboard
            </Link>
          </div>
        ) : null
      )}
    </>
  );

  // Se está dentro de um projeto, não mostra Navbar (já está no ProjectLayout)
  if (isInsideProject) {
    return <div>{content}</div>;
  }

  // Se é página standalone, mostra com Navbar
  return (
    <div className="min-h-screen bg-surface text-primary transition-colors duration-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {content}
      </div>
    </div>
  );
}

