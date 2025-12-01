import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface ImportTasksModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportTasksModal({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}: ImportTasksModalProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    errors?: Array<{ row: number; error: string }>;
  } | null>(null);

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await api.post(`/projects/${projectId}/import/tasks`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setImportResult({
        imported: data.imported || data.tasks?.length || 0,
        errors: data.errors,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsImporting(false);
      
      // Log do mapeamento para debug (se disponível)
      if (data.columnMapping) {
        console.log("Mapeamento de colunas usado:", data.columnMapping);
      }
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      let errorMessage = "Erro ao importar tarefas";
      
      if (errorData?.error) {
        errorMessage = errorData.error;
        if (errorData.foundColumns) {
          errorMessage += `\n\nColunas encontradas no arquivo:\n${errorData.foundColumns.join(", ")}`;
        }
        if (errorData.suggestion) {
          errorMessage += `\n\nSugestão: ${errorData.suggestion}`;
        }
      }
      
      alert(errorMessage);
      setIsImporting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Por favor, selecione um arquivo Excel");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    importMutation.mutate(formData);
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setIsImporting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Importar Tarefas</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!importResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="mb-4">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const response = await api.get("/projects/import/template", {
                        responseType: "blob",
                      });
                      const blob = new Blob([response.data], {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                      });
                      const url = window.URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = "template-importacao-tarefas.xlsx";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (error) {
                      console.error("Erro ao baixar template:", error);
                      alert("Erro ao baixar template. Tente novamente.");
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm font-medium mb-3"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Baixar Template Excel
                </button>
              </div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Arquivo Excel
              </label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                required
              />
              <p className="mt-2 text-sm text-gray-400">
                Selecione o arquivo Excel preenchido com as tarefas. Use o template acima como referência.
              </p>
            </div>

            <div className="bg-blue-900/30 border border-blue-700 rounded p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">Colunas suportadas:</h3>
              <ul className="text-sm text-gray-300 space-y-1 list-disc list-inside">
                <li><strong>Name / Item:</strong> Nome da tarefa (obrigatório)</li>
                <li><strong>Status:</strong> Status da tarefa (Feito, Em progresso, Parado, etc.)</li>
                <li><strong>Person / Assignee / Responsável:</strong> Pessoa responsável</li>
                <li><strong>Date / Data:</strong> Data de início ou vencimento</li>
                <li><strong>Due Date / Prazo:</strong> Data de vencimento</li>
                <li><strong>Start Date:</strong> Data de início</li>
                <li><strong>Description / Notes / Observação:</strong> Descrição da tarefa</li>
                <li><strong>Hours / Horas:</strong> Horas estimadas</li>
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                disabled={isImporting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isImporting || !file}
              >
                {isImporting ? "Importando..." : "Importar Tarefas"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className={`p-4 rounded ${importResult.errors && importResult.errors.length > 0 ? "bg-yellow-900/30 border border-yellow-700" : "bg-green-900/30 border border-green-700"}`}>
              <h3 className={`text-lg font-semibold mb-2 ${importResult.errors && importResult.errors.length > 0 ? "text-yellow-300" : "text-green-300"}`}>
                {importResult.errors && importResult.errors.length > 0 ? "Importação concluída com erros" : "Importação concluída com sucesso!"}
              </h3>
              <p className="text-gray-300">
                {importResult.imported} tarefa(s) importada(s) com sucesso.
              </p>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="text-yellow-300 font-semibold mb-2">
                    {importResult.errors.length} erro(s) encontrado(s):
                  </p>
                  <div className="max-h-40 overflow-y-auto">
                    <ul className="text-sm text-gray-300 space-y-1">
                      {importResult.errors.slice(0, 10).map((error, index) => (
                        <li key={index}>
                          Linha {error.row}: {error.error}
                        </li>
                      ))}
                      {importResult.errors.length > 10 && (
                        <li className="text-yellow-400">
                          ... e mais {importResult.errors.length - 10} erro(s)
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  handleClose();
                  onSuccess();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

