import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "../lib/axios.js";
import Navbar from "../components/Navbar.js";
import { formatCep, formatPhone, cleanCep, cleanPhone } from "../utils/formatters.js";

interface User {
  id: string;
  name: string;
  lastName?: string;
  email: string;
  position?: string;
  cep?: string;
  address?: string;
  addressNumber?: string;
  addressComplement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  phone?: string;
  cellphone?: string;
  role: "ADMIN" | "MANAGER" | "MEMBER";
  hourlyRate?: number;
  createdAt: string;
}

export default function UsersManagement() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["users", searchQuery],
    queryFn: () => {
      const params = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
      return api.get(`/users${params}`).then((res) => res.data);
    },
  });

  const users = usersResponse?.data || [];

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao deletar usuário");
    },
  });

  const handleDeleteUser = (user: User) => {
    if (!window.confirm(`Tem certeza que deseja deletar o usuário "${user.name}"?`)) return;
    deleteUserMutation.mutate(user.id);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      ADMIN: "Administrador",
      MANAGER: "Gerente",
      MEMBER: "Membro",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-red-900/30 text-red-300",
      MANAGER: "bg-yellow-900/30 text-yellow-300",
      MEMBER: "bg-blue-900/30 text-blue-300",
    };
    return colors[role] || "bg-gray-700 text-gray-300";
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-100">Gerenciar Usuários</h1>
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
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar usuários por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-1/2 px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando usuários...</div>
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
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Taxa Horária
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
                {users && users.length > 0 ? (
                  users.map((user: User) => (
                    <tr key={user.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                        {user.name} {user.lastName || ""}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded text-xs ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {user.hourlyRate
                          ? `R$ ${Number(user.hourlyRate).toFixed(2)}/h`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                            title="Editar usuário"
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
                          <ResetPasswordButton userId={user.id} userName={user.name} />
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                            title="Deletar usuário"
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
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal de Criar Usuário */}
        {showAddModal && (
          <CreateUserModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              queryClient.invalidateQueries({ queryKey: ["users"] });
            }}
          />
        )}

        {/* Modal de Editar Usuário */}
        {showEditModal && selectedUser && (
          <EditUserModal
            user={selectedUser}
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedUser(null);
              queryClient.invalidateQueries({ queryKey: ["users"] });
            }}
          />
        )}
      </div>
    </div>
  );
}

// Modal de Criar Usuário
interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    lastName: "",
    email: "",
    password: "",
    position: "",
    cep: "",
    address: "",
    addressNumber: "",
    addressComplement: "",
    neighborhood: "",
    city: "",
    state: "",
    phone: "",
    cellphone: "",
    role: "MEMBER" as "ADMIN" | "MANAGER" | "MEMBER",
    hourlyRate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const createUserMutation = useMutation({
    mutationFn: (data: any) => api.post("/users", data),
    onSuccess: () => {
      onSuccess();
      setFormData({
        name: "",
        lastName: "",
        email: "",
        password: "",
        position: "",
        cep: "",
        address: "",
        addressNumber: "",
        addressComplement: "",
        neighborhood: "",
        city: "",
        state: "",
        phone: "",
        cellphone: "",
        role: "MEMBER",
        hourlyRate: "",
      });
      setError(null);
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Erro ao criar usuário. Tente novamente."
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const submitData: any = {
        name: formData.name,
        lastName: formData.lastName || undefined,
        email: formData.email,
        password: formData.password,
        position: formData.position || undefined,
        cep: cleanCep(formData.cep) || undefined,
        address: formData.address || undefined,
        addressNumber: formData.addressNumber || undefined,
        addressComplement: formData.addressComplement || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        phone: cleanPhone(formData.phone) ? formatPhone(cleanPhone(formData.phone)) : undefined,
        cellphone: cleanPhone(formData.cellphone) ? formatPhone(cleanPhone(formData.cellphone)) : undefined,
        role: formData.role,
      };

      if (formData.hourlyRate) {
        submitData.hourlyRate = parseFloat(formData.hourlyRate);
      }

      await createUserMutation.mutateAsync(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCepBlur = async () => {
    const cleanCepValue = cleanCep(formData.cep);
    if (cleanCepValue.length === 8) {
      setLoadingCep(true);
      try {
        const response = await api.get(`/users/cep?cep=${cleanCepValue}`);
        const data = response.data;
        setFormData(prev => ({
          ...prev,
          address: data.address || "",
          neighborhood: data.neighborhood || "",
          city: data.city || "",
          state: data.state || "",
          cep: data.cep || prev.cep,
        }));
      } catch (err) {
        // CEP não encontrado ou erro - não fazer nada
      } finally {
        setLoadingCep(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-gray-100">Criar Novo Usuário</h3>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/20 text-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Nome <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                Sobrenome
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="position" className="block text-sm font-medium text-gray-300 mb-2">
              Cargo
            </label>
            <input
              id="position"
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Desenvolvedor, Designer, Gerente..."
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Senha <span className="text-red-400">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {/* Endereço */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Endereço</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label htmlFor="cep" className="block text-sm font-medium text-gray-300 mb-2">
                  CEP
                </label>
                <div className="relative">
                  <input
                    id="cep"
                    type="text"
                    maxLength={9}
                    value={formData.cep}
                    onChange={(e) => {
                      const formatted = formatCep(e.target.value);
                      setFormData({ ...formData, cep: formatted });
                    }}
                    onBlur={handleCepBlur}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="00000-000"
                  />
                  {loadingCep && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
                  Logradouro
                </label>
                <input
                  id="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="addressNumber" className="block text-sm font-medium text-gray-300 mb-2">
                  Número
                </label>
                <input
                  id="addressNumber"
                  type="text"
                  value={formData.addressNumber}
                  onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="addressComplement" className="block text-sm font-medium text-gray-300 mb-2">
                  Complemento
                </label>
                <input
                  id="addressComplement"
                  type="text"
                  value={formData.addressComplement}
                  onChange={(e) => setFormData({ ...formData, addressComplement: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-300 mb-2">
                  Bairro
                </label>
                <input
                  id="neighborhood"
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-300 mb-2">
                  Cidade
                </label>
                <input
                  id="city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-300 mb-2">
                  Estado
                </label>
                <input
                  id="state"
                  type="text"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="UF"
                />
              </div>
            </div>
          </div>

          {/* Telefones */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Contato</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Telefone Fixo
                </label>
                <input
                  id="phone"
                  type="text"
                  maxLength={14}
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setFormData({ ...formData, phone: formatted });
                  }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <label htmlFor="cellphone" className="block text-sm font-medium text-gray-300 mb-2">
                  Celular
                </label>
                <input
                  id="cellphone"
                  type="text"
                  maxLength={15}
                  value={formData.cellphone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setFormData({ ...formData, cellphone: formatted });
                  }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
                Função
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="MEMBER">Membro</option>
                <option value="MANAGER">Gerente</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <div>
              <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-300 mb-2">
                Taxa Horária (R$)
              </label>
              <input
                id="hourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ex: 100.00"
              />
            </div>
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
              {isSubmitting ? "Criando..." : "Criar Usuário"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de Editar Usuário
interface EditUserModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserModal({ user, isOpen, onClose, onSuccess }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: user.name || "",
    lastName: user.lastName || "",
    email: user.email || "",
    position: user.position || "",
    cep: user.cep || "",
    address: user.address || "",
    addressNumber: user.addressNumber || "",
    addressComplement: user.addressComplement || "",
    neighborhood: user.neighborhood || "",
    city: user.city || "",
    state: user.state || "",
    phone: user.phone || "",
    cellphone: user.cellphone || "",
    role: user.role,
    hourlyRate: user.hourlyRate?.toString() || "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const updateUserMutation = useMutation({
    mutationFn: (data: any) => api.patch(`/users/${user.id}`, data),
    onSuccess: () => {
      onSuccess();
      setError(null);
    },
    onError: (err: any) => {
      setError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        "Erro ao atualizar usuário. Tente novamente."
      );
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const submitData: any = {
        name: formData.name,
        lastName: formData.lastName || undefined,
        email: formData.email,
        position: formData.position || undefined,
        cep: cleanCep(formData.cep) || undefined,
        address: formData.address || undefined,
        addressNumber: formData.addressNumber || undefined,
        addressComplement: formData.addressComplement || undefined,
        neighborhood: formData.neighborhood || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        phone: cleanPhone(formData.phone) ? formatPhone(cleanPhone(formData.phone)) : undefined,
        cellphone: cleanPhone(formData.cellphone) ? formatPhone(cleanPhone(formData.cellphone)) : undefined,
        role: formData.role,
      };

      if (formData.hourlyRate) {
        submitData.hourlyRate = parseFloat(formData.hourlyRate);
      } else {
        submitData.hourlyRate = null;
      }

      await updateUserMutation.mutateAsync(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCepBlur = async () => {
    const cleanCepValue = cleanCep(formData.cep);
    if (cleanCepValue.length === 8) {
      setLoadingCep(true);
      try {
        const response = await api.get(`/users/cep?cep=${cleanCepValue}`);
        const data = response.data;
        setFormData(prev => ({
          ...prev,
          address: data.address || prev.address,
          neighborhood: data.neighborhood || prev.neighborhood,
          city: data.city || prev.city,
          state: data.state || prev.state,
          cep: data.cep || prev.cep,
        }));
      } catch (err) {
        // CEP não encontrado ou erro - não fazer nada
      } finally {
        setLoadingCep(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 my-8">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-gray-100">Editar Usuário: {user.name}</h3>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-900/20 text-red-400 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300 mb-2">
                Nome <span className="text-red-400">*</span>
              </label>
              <input
                id="edit-name"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label htmlFor="edit-lastName" className="block text-sm font-medium text-gray-300 mb-2">
                Sobrenome
              </label>
              <input
                id="edit-lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-email" className="block text-sm font-medium text-gray-300 mb-2">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="edit-position" className="block text-sm font-medium text-gray-300 mb-2">
              Cargo
            </label>
            <input
              id="edit-position"
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Desenvolvedor, Designer, Gerente..."
            />
          </div>

          {/* Endereço */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Endereço</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label htmlFor="edit-cep" className="block text-sm font-medium text-gray-300 mb-2">
                  CEP
                </label>
                <div className="relative">
                  <input
                    id="edit-cep"
                    type="text"
                    maxLength={9}
                    value={formData.cep}
                    onChange={(e) => {
                      const formatted = formatCep(e.target.value);
                      setFormData({ ...formData, cep: formatted });
                    }}
                    onBlur={handleCepBlur}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="00000-000"
                  />
                  {loadingCep && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-400"></div>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label htmlFor="edit-address" className="block text-sm font-medium text-gray-300 mb-2">
                  Logradouro
                </label>
                <input
                  id="edit-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="edit-addressNumber" className="block text-sm font-medium text-gray-300 mb-2">
                  Número
                </label>
                <input
                  id="edit-addressNumber"
                  type="text"
                  value={formData.addressNumber}
                  onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="edit-addressComplement" className="block text-sm font-medium text-gray-300 mb-2">
                  Complemento
                </label>
                <input
                  id="edit-addressComplement"
                  type="text"
                  value={formData.addressComplement}
                  onChange={(e) => setFormData({ ...formData, addressComplement: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label htmlFor="edit-neighborhood" className="block text-sm font-medium text-gray-300 mb-2">
                  Bairro
                </label>
                <input
                  id="edit-neighborhood"
                  type="text"
                  value={formData.neighborhood}
                  onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="edit-city" className="block text-sm font-medium text-gray-300 mb-2">
                  Cidade
                </label>
                <input
                  id="edit-city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label htmlFor="edit-state" className="block text-sm font-medium text-gray-300 mb-2">
                  Estado
                </label>
                <input
                  id="edit-state"
                  type="text"
                  maxLength={2}
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="UF"
                />
              </div>
            </div>
          </div>

          {/* Telefones */}
          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-4">Contato</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-300 mb-2">
                  Telefone Fixo
                </label>
                <input
                  id="edit-phone"
                  type="text"
                  maxLength={14}
                  value={formData.phone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setFormData({ ...formData, phone: formatted });
                  }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div>
                <label htmlFor="edit-cellphone" className="block text-sm font-medium text-gray-300 mb-2">
                  Celular
                </label>
                <input
                  id="edit-cellphone"
                  type="text"
                  maxLength={15}
                  value={formData.cellphone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setFormData({ ...formData, cellphone: formatted });
                  }}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-gray-700 pt-4">
            <div>
              <label htmlFor="edit-role" className="block text-sm font-medium text-gray-300 mb-2">
                Função
              </label>
              <select
                id="edit-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="MEMBER">Membro</option>
                <option value="MANAGER">Gerente</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>

            <div>
              <label htmlFor="edit-hourlyRate" className="block text-sm font-medium text-gray-300 mb-2">
                Taxa Horária (R$)
              </label>
              <input
                id="edit-hourlyRate"
                type="number"
                step="0.01"
                min="0"
                value={formData.hourlyRate}
                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ex: 100.00"
              />
            </div>
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

// Componente de Reset de Senha
interface ResetPasswordButtonProps {
  userId: string;
  userName: string;
}

function ResetPasswordButton({ userId, userName }: ResetPasswordButtonProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: (password: string) => api.post(`/users/${userId}/reset-password`, { newPassword: password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      alert("Senha resetada com sucesso!");
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Erro ao resetar senha");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setIsSubmitting(true);
    resetPasswordMutation.mutate(newPassword, {
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="text-yellow-400 hover:text-yellow-300 transition-colors"
        title="Resetar senha"
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
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-gray-100">Resetar Senha: {userName}</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
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

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-900/20 text-red-400 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Nova Senha <span className="text-red-400">*</span>
                </label>
                <input
                  id="newPassword"
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirmar Senha <span className="text-red-400">*</span>
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Digite a senha novamente"
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-yellow-700 text-white rounded-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Resetando..." : "Resetar Senha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

