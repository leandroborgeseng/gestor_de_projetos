import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { useHotkeys } from "react-hotkeys-hook";
import * as v from "valibot";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";
import DependenciesManager from "./DependenciesManager.js";
import FileAttachmentManager from "./FileAttachmentManager.js";
import CommentThread from "./CommentThread.js";
import TagSelector from "./TagSelector.js";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  assigneeId?: string;
  assignee?: { id: string; name: string; email: string };
  sprintId?: string;
  sprint?: { id: string; name: string };
  estimateHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  tags?: Array<{ id: string; tag: { id: string; name: string; color: string } }>;
}

interface EditTaskModalProps {
  projectId: string;
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const taskSchema = v.object({
  title: v.pipe(v.string(), v.minLength(1, "Título é obrigatório")),
  description: v.optional(v.string()),
  status: v.pipe(
    v.string(),
    v.picklist(["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"])
  ),
  assigneeId: v.optional(v.string()),
  sprintId: v.optional(v.string()),
  estimateHours: v.optional(v.pipe(v.string(), v.transform((val: string) => val === "" ? undefined : parseFloat(val)), v.optional(v.number()))),
  actualHours: v.optional(v.pipe(v.string(), v.transform((val: string) => val === "" ? undefined : parseFloat(val)), v.optional(v.number()))),
  startDate: v.optional(v.string()),
  dueDate: v.optional(v.string()),
});

type TaskFormData = v.InferInput<typeof taskSchema>;

export default function EditTaskModal({
  projectId,
  task,
  isOpen,
  onClose,
  onSuccess,
}: EditTaskModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setError,
  } = useForm<TaskFormData>({
    resolver: valibotResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "BACKLOG",
      assigneeId: "",
      sprintId: "",
      estimateHours: "",
      actualHours: "",
      startDate: "",
      dueDate: "",
    },
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get("/users").then((res) => res.data.data),
  });

  const { data: sprints } = useQuery({
    queryKey: ["sprints", projectId],
    queryFn: () => api.get(`/projects/${projectId}/sprints`).then((res) => res.data),
    enabled: !!projectId,
  });

  const { data: allTasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`).then((res) => res.data),
    enabled: !!projectId,
  });

  // Carregar dados da tarefa quando o modal abrir
  useEffect(() => {
    if (task && isOpen) {
      reset({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "BACKLOG",
        assigneeId: task.assigneeId || task.assignee?.id || "",
        sprintId: task.sprintId || task.sprint?.id || "",
        estimateHours: task.estimateHours?.toString() || "",
        actualHours: task.actualHours?.toString() || "",
        startDate: task.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      });
    }
  }, [task, isOpen, reset]);

  // Atalho Ctrl+S para salvar
  useHotkeys(
    "ctrl+s, cmd+s",
    (e) => {
      e.preventDefault();
      handleSubmit(onSubmit)();
    },
    { enabled: isOpen && !!task }
  );

  // Atalho Esc para fechar
  useHotkeys(
    "escape",
    (e) => {
      if (isOpen) {
        e.preventDefault();
        onClose();
      }
    },
    { enabled: isOpen }
  );

  const onSubmit = async (data: TaskFormData) => {
    if (!task) return;

    try {
      const submitData: any = {
        title: data.title,
        description: data.description || undefined,
        status: data.status,
      };

      if (data.estimateHours !== undefined && data.estimateHours !== "") {
        submitData.estimateHours = parseFloat(data.estimateHours as string);
      }

      if (data.actualHours !== undefined && data.actualHours !== "") {
        submitData.actualHours = parseFloat(data.actualHours as string);
      }

      // Converter datas para formato ISO se fornecidas
      if (data.startDate) {
        submitData.startDate = new Date(data.startDate).toISOString();
      } else {
        submitData.startDate = null;
      }

      if (data.dueDate) {
        submitData.dueDate = new Date(data.dueDate).toISOString();
      } else {
        submitData.dueDate = null;
      }

      if (data.assigneeId) {
        submitData.assigneeId = data.assigneeId;
      } else {
        submitData.assigneeId = null;
      }

      if (data.sprintId) {
        submitData.sprintId = data.sprintId;
      } else {
        submitData.sprintId = null;
      }

      await api.patch(`/projects/tasks/${task.id}`, submitData);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError("root", {
        message:
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          "Erro ao atualizar tarefa. Tente novamente.",
      });
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-100">Editar Tarefa</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            aria-label="Fechar"
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {errors.root && (
            <div className="bg-red-900/20 border border-red-800 text-red-400 px-4 py-3 rounded">
              {errors.root.message}
            </div>
          )}

          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-300 mb-2">
              Título da Tarefa <span className="text-red-400">*</span>
            </label>
            <input
              id="edit-title"
              type="text"
              {...register("title")}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: Implementar autenticação"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-400">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="edit-description" className="block text-sm font-medium text-gray-300 mb-2">
              Descrição
            </label>
            <textarea
              id="edit-description"
              {...register("description")}
              rows={4}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Descreva os detalhes da tarefa..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-status" className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                id="edit-status"
                {...register("status")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="BACKLOG">Backlog</option>
                <option value="TODO">A Fazer</option>
                <option value="IN_PROGRESS">Em Progresso</option>
                <option value="REVIEW">Revisão</option>
                <option value="DONE">Concluído</option>
                <option value="BLOCKED">Bloqueado</option>
              </select>
              {errors.status && (
                <p className="mt-1 text-sm text-red-400">{errors.status.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-assigneeId" className="block text-sm font-medium text-gray-300 mb-2">
                Responsável
              </label>
              <select
                id="edit-assigneeId"
                {...register("assigneeId")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Nenhum responsável</option>
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
              {errors.assigneeId && (
                <p className="mt-1 text-sm text-red-400">{errors.assigneeId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-sprintId" className="block text-sm font-medium text-gray-300 mb-2">
                Sprint
              </label>
              <select
                id="edit-sprintId"
                {...register("sprintId")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Sem sprint (Backlog)</option>
                {sprints && sprints.length > 0 ? (
                  sprints.map((sprint: any) => (
                    <option key={sprint.id} value={sprint.id}>
                      {sprint.name}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Nenhuma sprint disponível</option>
                )}
              </select>
              {errors.sprintId && (
                <p className="mt-1 text-sm text-red-400">{errors.sprintId.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-estimateHours" className="block text-sm font-medium text-gray-300 mb-2">
                Horas Estimadas
              </label>
              <input
                id="edit-estimateHours"
                type="number"
                step="0.5"
                min="0"
                {...register("estimateHours")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ex: 8"
              />
              {errors.estimateHours && (
                <p className="mt-1 text-sm text-red-400">{errors.estimateHours.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="edit-actualHours" className="block text-sm font-medium text-gray-300 mb-2">
              Horas Reais Trabalhadas
            </label>
            <input
              id="edit-actualHours"
              type="number"
              step="0.5"
              min="0"
              {...register("actualHours")}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ex: 6.5"
            />
            {errors.actualHours && (
              <p className="mt-1 text-sm text-red-400">{errors.actualHours.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-startDate" className="block text-sm font-medium text-gray-300 mb-2">
                Data de Início
              </label>
              <input
                id="edit-startDate"
                type="date"
                {...register("startDate")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-400">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="edit-dueDate" className="block text-sm font-medium text-gray-300 mb-2">
                Data de Entrega
              </label>
              <input
                id="edit-dueDate"
                type="date"
                {...register("dueDate")}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-red-400">{errors.dueDate.message}</p>
              )}
            </div>
          </div>

          {/* Seção de Dependências */}
          {task && allTasks && (
            <div className="pt-4 border-t border-gray-700">
              <DependenciesManager
                taskId={task.id}
                projectId={projectId}
                allTasks={allTasks}
              />
            </div>
          )}

          {/* Seção de Tags */}
          {task && (
            <div className="pt-4 border-t border-gray-700">
              <TagSelector
                projectId={projectId}
                taskId={task.id}
                selectedTagIds={task.tags?.map((t) => t.tag.id) || []}
              />
            </div>
          )}

          {/* Seção de Anexos */}
          {task && (
            <div className="pt-4 border-t border-gray-700">
              <FileAttachmentManager taskId={task.id} />
            </div>
          )}

          {/* Seção de Comentários */}
          {task && (
            <div className="pt-4 border-t border-gray-700">
              <CommentThread taskId={task.id} />
            </div>
          )}

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
