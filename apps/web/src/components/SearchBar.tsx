import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface SearchBarProps {
  searchQuery: string;
  assigneeFilter: string;
  onSearchChange: (query: string) => void;
  onAssigneeChange: (assigneeId: string) => void;
}

export default function SearchBar({
  searchQuery,
  assigneeFilter,
  onSearchChange,
  onAssigneeChange,
}: SearchBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data),
  });

  return (
    <div className="mb-6">
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar projetos e tarefas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md leading-5 bg-gray-700 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-300 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        </button>
        {(searchQuery || assigneeFilter) && (
          <button
            onClick={() => {
              onSearchChange("");
              onAssigneeChange("");
            }}
            className="px-4 py-2 text-gray-400 hover:text-gray-200"
            title="Limpar filtros"
          >
            Limpar
          </button>
        )}
      </div>

      {showFilters && (
        <div className="mt-4 p-4 bg-gray-800 rounded-lg shadow border border-gray-700">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Filtrar por Usuário
          </label>
          <select
            value={assigneeFilter}
            onChange={(e) => onAssigneeChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Todos os usuários</option>
            {users && users.length > 0 ? (
              users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))
            ) : (
              <option value="" disabled>Carregando usuários...</option>
            )}
          </select>
        </div>
      )}
    </div>
  );
}

