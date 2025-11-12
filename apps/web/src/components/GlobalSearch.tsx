import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import api from "../lib/axios.js";

interface SearchResult {
  id: string;
  type: "task" | "project" | "user" | "comment";
  title: string;
  description?: string;
  status?: string;
  project?: { id: string; name: string };
  assignee?: { id: string; name: string; email: string };
  sprint?: { id: string; name: string };
  owner?: { id: string; name: string; email: string };
  user?: { id: string; name: string; email: string };
  task?: { id: string; title: string; project: { id: string; name: string } };
  position?: string;
  role?: string;
  createdAt: string;
  updatedAt?: string;
}

interface SearchResponse {
  tasks: SearchResult[];
  projects: SearchResult[];
  users: SearchResult[];
  comments: SearchResult[];
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = "search-history";

function getSearchHistory(): string[] {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(query: string): void {
  try {
    const history = getSearchHistory();
    const filtered = history.filter((q) => q.toLowerCase() !== query.toLowerCase());
    const newHistory = [query, ...filtered].slice(0, 10);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  } catch {
    // Ignore errors
  }
}

function highlightText(text: string, query: string): JSX.Element {
  if (!query) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-500 text-gray-900 px-1 rounded">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<"all" | "task" | "project" | "user" | "comment">("all");
  const [status, setStatus] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [showHistory, setShowHistory] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchHistory = getSearchHistory();

  // Buscar usuários para filtro de assignee
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data || res.data || []),
  });

  // Buscar projetos para filtro
  const { data: projectsResponse } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects?archived=false").then((res) => res.data),
  });
  const projects = projectsResponse?.data || [];

  // Buscar resultados
  const { data: searchResults, isLoading } = useQuery<SearchResponse>({
    queryKey: ["global-search", query, searchType, status, assigneeId, projectId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (query) params.append("q", query);
      if (searchType !== "all") params.append("type", searchType);
      if (status) params.append("status", status);
      if (assigneeId) params.append("assigneeId", assigneeId);
      if (projectId) params.append("projectId", projectId);
      return api.get(`/search?${params.toString()}`).then((res) => res.data);
    },
    enabled: query.trim().length > 0,
    staleTime: 30000,
  });

  // Fechar com ESC
  useHotkeys("escape", () => {
    if (isOpen) {
      onClose();
    }
  }, { enabled: isOpen });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      saveSearchHistory(searchQuery);
      setQuery(searchQuery);
      setShowHistory(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim()) {
      handleSearch(query);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, getTotalResults() - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    }
  };

  const getTotalResults = (): number => {
    if (!searchResults) return 0;
    return (
      searchResults.tasks.length +
      searchResults.projects.length +
      searchResults.users.length +
      searchResults.comments.length
    );
  };

  const handleResultClick = (result: SearchResult) => {
    saveSearchHistory(query);
    onClose();
    
    switch (result.type) {
      case "task":
        navigate(`/projects/${result.project?.id}/tasks`);
        break;
      case "project":
        navigate(`/projects/${result.id}`);
        break;
      case "user":
        navigate(`/users-management`);
        break;
      case "comment":
        if (result.task?.project?.id) {
          navigate(`/projects/${result.task.project.id}/tasks`);
        }
        break;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      TODO: "bg-gray-500",
      IN_PROGRESS: "bg-blue-500",
      REVIEW: "bg-yellow-500",
      DONE: "bg-green-500",
      BLOCKED: "bg-red-500",
      BACKLOG: "bg-gray-400",
    };
    return colors[status] || "bg-gray-500";
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <svg
              className="w-5 h-5 text-gray-400"
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
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowHistory(e.target.value.length === 0);
                setSelectedIndex(-1);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (query.length === 0) setShowHistory(true);
              }}
              placeholder="Buscar tarefas, projetos, usuários, comentários... (Ctrl+K)"
              className="flex-1 bg-gray-700 text-gray-100 px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={onClose}
              className="px-3 py-2 text-gray-400 hover:text-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Filtros */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-3 py-1.5 bg-gray-700 text-gray-100 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Todos</option>
              <option value="task">Tarefas</option>
              <option value="project">Projetos</option>
              <option value="user">Usuários</option>
              <option value="comment">Comentários</option>
            </select>

            {searchType === "task" || searchType === "all" ? (
              <>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="px-3 py-1.5 bg-gray-700 text-gray-100 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Todos Status</option>
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                  <option value="BLOCKED">Blocked</option>
                </select>

                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="px-3 py-1.5 bg-gray-700 text-gray-100 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Todos Usuários</option>
                  {Array.isArray(users) &&
                    users.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
              </>
            ) : null}

            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 text-gray-100 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Todos Projetos</option>
              {projects.map((project: any) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {showHistory && searchHistory.length > 0 && query.length === 0 ? (
            <div>
              <div className="text-sm text-gray-400 mb-2">Buscas Recentes</div>
              {searchHistory.map((historyItem, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(historyItem);
                    handleSearch(historyItem);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 rounded-md text-gray-300"
                >
                  {historyItem}
                </button>
              ))}
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-gray-400">Buscando...</div>
          ) : query.trim().length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Digite para buscar tarefas, projetos, usuários ou comentários
            </div>
          ) : getTotalResults() === 0 ? (
            <div className="text-center py-8 text-gray-400">Nenhum resultado encontrado</div>
          ) : (
            <div className="space-y-4">
              {/* Tarefas */}
              {searchResults?.tasks && searchResults.tasks.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-300 mb-2">
                    Tarefas ({searchResults.tasks.length})
                  </div>
                  {searchResults.tasks.map((task, idx) => (
                    <button
                      key={task.id}
                      onClick={() => handleResultClick(task)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-700 rounded-md mb-2 transition-colors ${
                        selectedIndex === idx ? "bg-gray-700" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-xs text-white ${getStatusColor(
                                task.status || ""
                              )}`}
                            >
                              {task.status}
                            </span>
                            <span className="text-sm text-gray-400">
                              {task.project?.name}
                            </span>
                          </div>
                          <div className="text-gray-100 font-medium">
                            {highlightText(task.title, query)}
                          </div>
                          {task.description && (
                            <div className="text-sm text-gray-400 mt-1 line-clamp-1">
                              {highlightText(task.description, query)}
                            </div>
                          )}
                          {task.assignee && (
                            <div className="text-xs text-gray-500 mt-1">
                              Responsável: {task.assignee.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Projetos */}
              {searchResults?.projects && searchResults.projects.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-300 mb-2">
                    Projetos ({searchResults.projects.length})
                  </div>
                  {searchResults.projects.map((project, idx) => (
                    <button
                      key={project.id}
                      onClick={() => handleResultClick(project)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-700 rounded-md mb-2 transition-colors ${
                        selectedIndex === searchResults.tasks.length + idx ? "bg-gray-700" : ""
                      }`}
                    >
                      <div className="text-gray-100 font-medium">
                        {highlightText(project.title, query)}
                      </div>
                      {project.description && (
                        <div className="text-sm text-gray-400 mt-1 line-clamp-1">
                          {highlightText(project.description, query)}
                        </div>
                      )}
                      {project.owner && (
                        <div className="text-xs text-gray-500 mt-1">
                          Proprietário: {project.owner.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Usuários */}
              {searchResults?.users && searchResults.users.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-300 mb-2">
                    Usuários ({searchResults.users.length})
                  </div>
                  {searchResults.users.map((user, idx) => (
                    <button
                      key={user.id}
                      onClick={() => handleResultClick(user)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-700 rounded-md mb-2 transition-colors ${
                        selectedIndex ===
                        searchResults.tasks.length +
                          searchResults.projects.length +
                          idx
                          ? "bg-gray-700"
                          : ""
                      }`}
                    >
                      <div className="text-gray-100 font-medium">
                        {highlightText(user.title, query)}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">{user.description}</div>
                      {user.position && (
                        <div className="text-xs text-gray-500 mt-1">
                          {user.position} • {user.role}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Comentários */}
              {searchResults?.comments && searchResults.comments.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-gray-300 mb-2">
                    Comentários ({searchResults.comments.length})
                  </div>
                  {searchResults.comments.map((comment, idx) => (
                    <button
                      key={comment.id}
                      onClick={() => handleResultClick(comment)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-700 rounded-md mb-2 transition-colors ${
                        selectedIndex ===
                        searchResults.tasks.length +
                          searchResults.projects.length +
                          searchResults.users.length +
                          idx
                          ? "bg-gray-700"
                          : ""
                      }`}
                    >
                      <div className="text-gray-100 font-medium line-clamp-2">
                        {highlightText(comment.title, query)}
                      </div>
                      {comment.task && (
                        <div className="text-xs text-gray-500 mt-1">
                          Tarefa: {comment.task.title} • Projeto: {comment.task.project?.name}
                        </div>
                      )}
                      {comment.user && (
                        <div className="text-xs text-gray-500 mt-1">
                          Por: {comment.user.name}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700 text-xs text-gray-500 flex justify-between">
          <div>
            <kbd className="px-2 py-1 bg-gray-700 rounded">↑↓</kbd> Navegar •{" "}
            <kbd className="px-2 py-1 bg-gray-700 rounded">Enter</kbd> Selecionar •{" "}
            <kbd className="px-2 py-1 bg-gray-700 rounded">Esc</kbd> Fechar
          </div>
          <div>{getTotalResults()} resultados</div>
        </div>
      </div>
    </div>
  );
}

