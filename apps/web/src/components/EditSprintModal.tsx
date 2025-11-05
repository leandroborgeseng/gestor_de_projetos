import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import * as v from "valibot";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string;
  endDate: string;
  tasks?: any[];
}

interface EditSprintModalProps {
  projectId: string;
  sprint: Sprint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const sprintSchema = v.object({
  name: v.pipe(v.string(), v.minLength(1, "Nome é obrigatório")),
  goal: v.optional(v.string()),
  startDate: v.pipe(v.string(), v.minLength(1, "Data de início é obrigatória")),
  endDate: v.pipe(v.string(), v.minLength(1, "Data de fim é obrigatória")),
});

type SprintFormData = v.InferInput<typeof sprintSchema>;

export default function EditSprintModal({
  projectId,
  sprint,
  isOpen,
  onClose,
  onSuccess,
}: EditSprintModalProps) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SprintFormData>({
    resolver: valibotResolver(sprintSchema),
    defaultValues: {
      name: "",
      goal: "",
      startDate: "",
      endDate: "",
    },
  });

  const { data: allTasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks`).then((res) => res.data),
    enabled: !!projectId && isOpen,
  });

  const { data: sprintDetails } = useQuery({
    queryKey: ["sprint", sprint?.id],
    queryFn: () => api.get(`/projects/sprints/${sprint?.id}`).then((res) => res.data),
    enabled: !!sprint?.id && isOpen,
  });

  useEffect(() => {
    if (sprint && isOpen) {
      reset({
        name: sprint.name || "",
        goal: sprint.goal || "",
        startDate: sprint.startDate ? new Date(sprint.startDate).toISOString().split("T")[0] : "",
        endDate: sprint.endDate ? new Date(sprint.endDate).toISOString().split("T")[0] : "",
      });
    }
  }, [sprint, isOpen, reset]);

  const updateSprintMutation = useMutation({
    mutationFn: (data: any) =>
      api.patch(`/projects/sprints/${sprint?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", projectId] });
      queryClient.invalidateQueries({ queryKey: ["sprint", sprint?.id] });
      onSuccess();
      onClose();
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.post(`/projects/sprints/${sprint?.id}/tasks`, { taskId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprint", sprint?.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const removeTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      api.delete(`/projects/sprints/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprint", sprint?.id] });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const onSubmit = async (data: SprintFormData) => {
    if (!sprint) return;

    const submitData: any = {
      name: data.name,
      goal: data.goal || undefined,
    };

    if (data.startDate) {
      submitData.startDate = new Date(data.startDate).toISOString();
    }

    if (data.endDate) {
      submitData.endDate = new Date(data.endDate).toISOString();
    }

    updateSprintMutation.mutate(submitData);
  };

  const handleAddTask = (taskId: string) => {
    addTaskMutation.mutate(taskId);
  };

  const handleRemoveTask = (taskId: string) => {
    if (window.confirm("Deseja remover esta tarefa da sprint?")) {
      removeTaskMutation.mutate(taskId);
    }
  };

  if (!isOpen || !sprint) return null;

  const sprintTasks = sprintDetails?.tasks || [];
  const availableTasks = (allTasks || []).filter(
    (task: any) => !task.sprintId || task.sprintId === sprint.id
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-100">Editar Sprint</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Nome
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-gray-300 mb-2">
                  Objetivo
                </label>
                <input
                  id="goal"
                  type="text"
                  {...register("goal")}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.goal && (
                  <p className="mt-1 text-sm text-red-400">{errors.goal.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-2">
                  Data Início
                </label>
                <input
                  id="startDate"
                  type="date"
                  {...register("startDate")}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-400">{errors.startDate.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-2">
                  Data Fim
                </label>
                <input
                  id="endDate"
                  type="date"
                  {...register("endDate")}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {errors.endDate && (
                  <p className="mt-1 text-sm text-red-400">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            {/* Tarefas da Sprint */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tarefas da Sprint ({sprintTasks.length})
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sprintTasks.length === 0 ? (
                  <p className="text-sm text-gray-400">Nenhuma tarefa na sprint</p>
                ) : (
                  sprintTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between bg-gray-700 rounded p-2"
                    >
                      <div className="flex-1">
                        <span className="text-sm text-gray-200">{task.title}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          ({task.status}) - {task.estimateHours || 0}h
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(task.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remover
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Adicionar Tarefa */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Adicionar Tarefa
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddTask(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">Selecione uma tarefa...</option>
                {availableTasks
                  .filter((task: any) => !sprintTasks.find((t: any) => t.id === task.id))
                  .map((task: any) => (
                    <option key={task.id} value={task.id}>
                      {task.title} ({task.status})
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || updateSprintMutation.isPending}
                className="px-6 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 disabled:opacity-50"
              >
                {isSubmitting || updateSprintMutation.isPending ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

