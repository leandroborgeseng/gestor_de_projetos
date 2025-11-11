import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface ConvertToTemplateModalProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ConvertToTemplateModal({
  projectId,
  projectName,
  isOpen,
  onClose,
  onSuccess,
}: ConvertToTemplateModalProps) {
  const queryClient = useQueryClient();
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const convertMutation = useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      api.post(`/templates/from-project/${projectId}`, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      onSuccess?.();
      onClose();
      alert("Template criado com sucesso!");
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Erro ao criar template");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      alert("Por favor, informe o nome do template");
      return;
    }

    convertMutation.mutate({
      name: templateName,
      description: templateDescription || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-100">Converter Projeto em Template</h2>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-4">
              O projeto <strong className="text-gray-200">"{projectName}"</strong> será convertido em um template reutilizável.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome do Template *
            </label>
            <input
              type="text"
              required
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Ex: Template de Desenvolvimento"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descrição (opcional)
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Descreva o template..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={convertMutation.isPending || !templateName.trim()}
              className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {convertMutation.isPending ? "Criando..." : "Criar Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

