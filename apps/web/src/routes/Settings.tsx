import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/axios.js";
import Navbar from "../components/Navbar.js";
import { getCurrentUser } from "../utils/user.js";

interface SettingsData {
  emailHost: string;
  emailPort: number;
  emailUser: string;
  emailPassword: string;
  emailFrom: string;
  emailFromName: string;
  maxFileSize: number;
  allowedFileTypes: string[];
}

interface Permission {
  resource: string;
  action: string;
  allowed: boolean;
}

interface PermissionsData {
  [role: string]: Permission[];
}

const RESOURCES = [
  { id: "projects", label: "Projetos" },
  { id: "tasks", label: "Tarefas" },
  { id: "users", label: "Usuários" },
  { id: "sprints", label: "Sprints" },
  { id: "reports", label: "Relatórios" },
  { id: "resources", label: "Recursos" },
];

const ACTIONS = [
  { id: "create", label: "Criar" },
  { id: "read", label: "Visualizar" },
  { id: "update", label: "Editar" },
  { id: "delete", label: "Deletar" },
  { id: "manage", label: "Gerenciar" },
];

const ROLES = [
  { id: "ADMIN", label: "Administrador" },
  { id: "MANAGER", label: "Gerente" },
  { id: "MEMBER", label: "Membro" },
];

export default function Settings() {
  const queryClient = useQueryClient();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"general" | "permissions">("general");
  const [settings, setSettings] = useState<SettingsData>({
    emailHost: "",
    emailPort: 587,
    emailUser: "",
    emailPassword: "",
    emailFrom: "",
    emailFromName: "",
    maxFileSize: 10,
    allowedFileTypes: [],
  });

  const [permissions, setPermissions] = useState<PermissionsData>({});

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get("/settings").then((res) => res.data),
  });

  useEffect(() => {
    if (data) {
      setSettings(data.settings);
      setPermissions(data.permissions || {});
    }
  }, [data]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<SettingsData>) => api.put("/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      alert("Configurações salvas com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao salvar configurações");
    },
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: (permissions: any[]) => api.put("/settings/permissions", { permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      alert("Permissões salvas com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao salvar permissões");
    },
  });

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  const handlePermissionChange = (role: string, resource: string, action: string, allowed: boolean) => {
    setPermissions((prev) => {
      const newPerms = { ...prev };
      if (!newPerms[role]) {
        newPerms[role] = [];
      }
      const existingIndex = newPerms[role].findIndex(
        (p) => p.resource === resource && p.action === action
      );
      if (existingIndex >= 0) {
        newPerms[role][existingIndex].allowed = allowed;
      } else {
        newPerms[role].push({ resource, action, allowed });
      }
      return newPerms;
    });
  };

  const handleSavePermissions = () => {
    const permissionsArray = Object.entries(permissions).flatMap(([role, perms]) =>
      perms.map((perm) => ({
        role,
        resource: perm.resource,
        action: perm.action,
        allowed: perm.allowed,
      }))
    );
    updatePermissionsMutation.mutate(permissionsArray);
  };

  const getPermission = (role: string, resource: string, action: string): boolean => {
    const rolePerms = permissions[role] || [];
    const perm = rolePerms.find((p) => p.resource === resource && p.action === action);
    return perm?.allowed ?? true; // Por padrão, permitido
  };

  const handleAddFileType = () => {
    const type = prompt("Digite a extensão do arquivo (ex: pdf, docx):");
    if (type && !settings.allowedFileTypes.includes(type.toLowerCase())) {
      setSettings({
        ...settings,
        allowedFileTypes: [...settings.allowedFileTypes, type.toLowerCase()],
      });
    }
  };

  const handleRemoveFileType = (type: string) => {
    setSettings({
      ...settings,
      allowedFileTypes: settings.allowedFileTypes.filter((t) => t !== type),
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 text-center">
            <p className="text-red-400">Acesso negado. Apenas administradores podem acessar as configurações.</p>
            <Link to="/" className="text-indigo-400 hover:text-indigo-300 mt-4 inline-block">
              Voltar ao dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-100">Configurações</h1>
          <Link
            to="/"
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
          >
            Voltar
          </Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("general")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "general"
                  ? "border-indigo-400 text-indigo-400"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              Configurações Gerais
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`pb-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "permissions"
                  ? "border-indigo-400 text-indigo-400"
                  : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
              }`}
            >
              Permissões
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando configurações...</div>
        ) : (
          <>
            {/* Configurações Gerais */}
            {activeTab === "general" && (
              <div className="bg-gray-800 rounded-lg shadow p-6 space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-100 mb-4">Configurações de E-mail</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Servidor SMTP
                      </label>
                      <input
                        type="text"
                        value={settings.emailHost}
                        onChange={(e) => setSettings({ ...settings, emailHost: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Porta
                      </label>
                      <input
                        type="number"
                        value={settings.emailPort}
                        onChange={(e) => setSettings({ ...settings, emailPort: parseInt(e.target.value) || 587 })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="587"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Usuário
                      </label>
                      <input
                        type="text"
                        value={settings.emailUser}
                        onChange={(e) => setSettings({ ...settings, emailUser: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="seu-email@gmail.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Senha
                      </label>
                      <input
                        type="password"
                        value={settings.emailPassword}
                        onChange={(e) => setSettings({ ...settings, emailPassword: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        E-mail Remetente
                      </label>
                      <input
                        type="email"
                        value={settings.emailFrom}
                        onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="noreply@exemplo.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nome do Remetente
                      </label>
                      <input
                        type="text"
                        value={settings.emailFromName}
                        onChange={(e) => setSettings({ ...settings, emailFromName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="Agile Project Manager"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-6">
                  <h2 className="text-xl font-semibold text-gray-100 mb-4">Configurações de Arquivos</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tamanho Máximo (MB)
                      </label>
                      <input
                        type="number"
                        value={settings.maxFileSize}
                        onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) || 10 })}
                        className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Tipos de Arquivo Permitidos
                      </label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {settings.allowedFileTypes.map((type) => (
                          <span
                            key={type}
                            className="px-3 py-1 bg-indigo-700 text-white rounded-md text-sm flex items-center gap-2"
                          >
                            {type}
                            <button
                              onClick={() => handleRemoveFileType(type)}
                              className="text-red-300 hover:text-red-100"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={handleAddFileType}
                        className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 text-sm"
                      >
                        + Adicionar Tipo
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-700">
                  <button
                    onClick={handleSaveSettings}
                    disabled={updateSettingsMutation.isPending}
                    className="px-6 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateSettingsMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                  </button>
                </div>
              </div>
            )}

            {/* Permissões */}
            {activeTab === "permissions" && (
              <div className="bg-gray-800 rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Gerenciamento de Permissões</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Configure quais ações cada tipo de usuário pode realizar no sistema.
                </p>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Recurso / Ação
                        </th>
                        {ROLES.map((role) => (
                          <th
                            key={role.id}
                            className="px-4 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider"
                          >
                            {role.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                      {RESOURCES.map((resource) =>
                        ACTIONS.map((action) => (
                          <tr key={`${resource.id}-${action.id}`}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                              <div className="font-medium">{resource.label}</div>
                              <div className="text-xs text-gray-400">{action.label}</div>
                            </td>
                            {ROLES.map((role) => (
                              <td key={role.id} className="px-4 py-3 whitespace-nowrap text-center">
                                <input
                                  type="checkbox"
                                  checked={getPermission(role.id, resource.id, action.id)}
                                  onChange={(e) =>
                                    handlePermissionChange(role.id, resource.id, action.id, e.target.checked)
                                  }
                                  className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                                />
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-6 border-t border-gray-700 mt-6">
                  <button
                    onClick={handleSavePermissions}
                    disabled={updatePermissionsMutation.isPending}
                    className="px-6 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatePermissionsMutation.isPending ? "Salvando..." : "Salvar Permissões"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

