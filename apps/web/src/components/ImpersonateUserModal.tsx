import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ImpersonateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImpersonate: (user: User) => void;
}

export default function ImpersonateUserModal({
  isOpen,
  onClose,
  onImpersonate,
}: ImpersonateUserModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: ["users", searchQuery],
    queryFn: () => {
      const params = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : "";
      return api.get(`/users${params}`).then((res) => res.data);
    },
  });

  const users = usersResponse?.data || [];

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4 max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-gray-100">Personificar Usuário</h3>
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

        <div className="p-6 border-b border-gray-700">
          <input
            type="text"
            placeholder="Buscar usuários por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-400">Carregando usuários...</div>
          ) : users.length > 0 ? (
            <div className="space-y-2">
              {users.map((user: User) => (
                <button
                  key={user.id}
                  onClick={() => {
                    onImpersonate(user);
                    onClose();
                  }}
                  className="w-full text-left p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-100">{user.name}</div>
                        <div className="text-xs text-gray-400">{user.email}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              {searchQuery ? "Nenhum usuário encontrado" : "Nenhum usuário cadastrado"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

