import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface Webhook {
  id: string;
  projectId?: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  description?: string;
  createdAt: string;
  project?: { id: string; name: string };
  _count?: { logs: number };
}

interface WebhookLog {
  id: string;
  event: string;
  status: string;
  statusCode?: number;
  response?: string;
  error?: string;
  retryCount: number;
  createdAt: string;
}

interface WebhookManagerProps {
  projectId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const AVAILABLE_EVENTS = [
  { value: "task.created", label: "Tarefa Criada" },
  { value: "task.updated", label: "Tarefa Atualizada" },
  { value: "task.deleted", label: "Tarefa Deletada" },
  { value: "task.assigned", label: "Tarefa Atribuída" },
  { value: "task.status_changed", label: "Status da Tarefa Alterado" },
  { value: "project.created", label: "Projeto Criado" },
  { value: "project.updated", label: "Projeto Atualizado" },
  { value: "project.deleted", label: "Projeto Deletado" },
  { value: "project.archived", label: "Projeto Arquivado" },
  { value: "sprint.created", label: "Sprint Criada" },
  { value: "sprint.updated", label: "Sprint Atualizada" },
  { value: "sprint.deleted", label: "Sprint Deletada" },
  { value: "comment.created", label: "Comentário Criado" },
  { value: "comment.updated", label: "Comentário Atualizado" },
  { value: "comment.deleted", label: "Comentário Deletado" },
];

export default function WebhookManager({
  projectId,
  isOpen,
  onClose,
}: WebhookManagerProps) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    url: "",
    events: [] as string[],
    secret: "",
    description: "",
    active: true,
  });

  const { data: webhooks, isLoading } = useQuery<Webhook[]>({
    queryKey: ["webhooks", projectId],
    queryFn: () => {
      const params = projectId ? `?projectId=${projectId}` : "";
      return api.get(`/webhooks${params}`).then((res) => res.data);
    },
    enabled: isOpen,
  });

  const { data: logs } = useQuery<{ data: WebhookLog[]; pagination: any }>({
    queryKey: ["webhook-logs", showLogs],
    queryFn: () => api.get(`/webhooks/${showLogs}/logs`).then((res) => res.data),
    enabled: !!showLogs,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post("/webhooks", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setShowCreateForm(false);
      setFormData({
        url: "",
        events: [],
        secret: "",
        description: "",
        active: true,
      });
      alert("Webhook criado com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao criar webhook");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      api.put(`/webhooks/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setSelectedWebhook(null);
      alert("Webhook atualizado com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao atualizar webhook");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      alert("Webhook deletado com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao deletar webhook");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.url.trim()) {
      alert("URL é obrigatória");
      return;
    }
    if (formData.events.length === 0) {
      alert("Selecione pelo menos um evento");
      return;
    }

    const data = {
      ...formData,
      projectId: projectId || undefined,
      secret: formData.secret || undefined,
      description: formData.description || undefined,
    };

    if (selectedWebhook) {
      updateMutation.mutate({ id: selectedWebhook.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setFormData({
      url: webhook.url,
      events: webhook.events,
      secret: "",
      description: webhook.description || "",
      active: webhook.active,
    });
    setShowCreateForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja deletar este webhook?")) {
      deleteMutation.mutate(id);
    }
  };

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
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
            <h2 className="text-2xl font-bold text-gray-100">Gerenciar Webhooks</h2>
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Formulário de criação/edição */}
          {showCreateForm && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-100 mb-4">
                {selectedWebhook ? "Editar Webhook" : "Criar Novo Webhook"}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formData.url}
                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="https://example.com/webhook"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Eventos *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto bg-gray-800 p-3 rounded-md">
                    {AVAILABLE_EVENTS.map((event) => (
                      <label
                        key={event.value}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.events.includes(event.value)}
                          onChange={() => toggleEvent(event.value)}
                          className="w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-300">{event.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Secret (opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Secret para assinatura HMAC"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Usado para assinar os payloads com HMAC SHA-256
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Descreva o propósito deste webhook..."
                  />
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 bg-gray-600 border-gray-500 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-300">Ativo</span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
                  >
                    {selectedWebhook
                      ? updateMutation.isPending
                        ? "Salvando..."
                        : "Salvar"
                      : createMutation.isPending
                      ? "Criando..."
                      : "Criar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setSelectedWebhook(null);
                      setFormData({
                        url: "",
                        events: [],
                        secret: "",
                        description: "",
                        active: true,
                      });
                    }}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Lista de webhooks */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-100">Webhooks Configurados</h3>
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600"
                >
                  + Novo Webhook
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Carregando...</div>
            ) : webhooks && webhooks.length > 0 ? (
              <div className="space-y-3">
                {webhooks.map((webhook) => (
                  <div
                    key={webhook.id}
                    className="bg-gray-700 rounded-lg p-4 border border-gray-600"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-100">{webhook.url}</h4>
                          {webhook.active ? (
                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
                              Ativo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-gray-600 text-white text-xs rounded">
                              Inativo
                            </span>
                          )}
                        </div>
                        {webhook.description && (
                          <p className="text-sm text-gray-400 mb-2">{webhook.description}</p>
                        )}
                        {webhook.project && (
                          <p className="text-xs text-gray-500">
                            Projeto: {webhook.project.name}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {webhook.events.map((event) => {
                            const eventLabel =
                              AVAILABLE_EVENTS.find((e) => e.value === event)?.label || event;
                            return (
                              <span
                                key={event}
                                className="px-2 py-0.5 bg-indigo-900 text-indigo-200 text-xs rounded"
                              >
                                {eventLabel}
                              </span>
                            );
                          })}
                        </div>
                        {webhook._count && webhook._count.logs > 0 && (
                          <p className="text-xs text-gray-500 mt-2">
                            {webhook._count.logs} tentativa(s) registrada(s)
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowLogs(showLogs === webhook.id ? null : webhook.id)}
                          className="px-3 py-1 bg-blue-700 text-white rounded-md hover:bg-blue-600 text-sm"
                        >
                          {showLogs === webhook.id ? "Ocultar" : "Logs"}
                        </button>
                        <button
                          onClick={() => handleEdit(webhook)}
                          className="px-3 py-1 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(webhook.id)}
                          className="px-3 py-1 bg-red-700 text-white rounded-md hover:bg-red-600 text-sm"
                        >
                          Deletar
                        </button>
                      </div>
                    </div>

                    {/* Logs do webhook */}
                    {showLogs === webhook.id && logs && (
                      <div className="mt-4 border-t border-gray-600 pt-4">
                        <h5 className="text-sm font-semibold text-gray-300 mb-2">Logs Recentes</h5>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {logs.data && logs.data.length > 0 ? (
                            logs.data.map((log) => (
                              <div
                                key={log.id}
                                className="bg-gray-800 rounded p-2 text-xs"
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <span className="font-medium text-gray-200">{log.event}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded ${
                                      log.status === "success"
                                        ? "bg-green-600 text-white"
                                        : log.status === "failed"
                                        ? "bg-red-600 text-white"
                                        : "bg-yellow-600 text-white"
                                    }`}
                                  >
                                    {log.status}
                                  </span>
                                </div>
                                {log.statusCode && (
                                  <p className="text-gray-400">Status: {log.statusCode}</p>
                                )}
                                {log.error && (
                                  <p className="text-red-400 mt-1">{log.error}</p>
                                )}
                                {log.retryCount > 0 && (
                                  <p className="text-gray-500 mt-1">
                                    Tentativas: {log.retryCount}
                                  </p>
                                )}
                                <p className="text-gray-500 mt-1">
                                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-400 text-sm">Nenhum log disponível</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                Nenhum webhook configurado ainda. Crie um novo webhook para começar.
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

