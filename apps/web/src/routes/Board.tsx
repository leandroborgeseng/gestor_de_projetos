import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useHotkeys } from "react-hotkeys-hook";
import api from "../lib/axios.js";
import KanbanBoard from "../components/KanbanBoard/Board.js";
import CreateTaskModal from "../components/CreateTaskModal.js";
import EditTaskModal from "../components/EditTaskModal.js";
import TagFilter from "../components/TagFilter.js";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  order?: number;
  assigneeId?: string;
  assignee?: { id?: string; name: string; email?: string };
  sprintId?: string;
  sprint?: { id: string; name: string };
  estimateHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  tags?: Array<{ id: string; tag: { id: string; name: string; color: string } }>;
}

export default function Board() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const { data: columns } = useQuery({
    queryKey: ["columns", id],
    queryFn: () => api.get(`/projects/${id}/columns`).then((res) => res.data),
    enabled: !!id,
  });

  const { data: tasks } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api.get(`/projects/${id}/tasks`).then((res) => res.data),
    enabled: !!id,
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: any }) =>
      api.patch(`/projects/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });

  const handleMoveTask = (taskId: string, newStatus: string, newOrder?: number) => {
    updateTaskMutation.mutate({
      taskId,
      data: {
        status: newStatus,
        order: newOrder,
      },
    });
  };

  const handleTaskCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks", id] });
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsEditModalOpen(true);
  };

  const handleTaskUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks", id] });
  };

  const createSubtaskMutation = useMutation({
    mutationFn: ({ taskId, parentId }: { taskId: string; parentId: string }) =>
      api.patch(`/projects/tasks/${taskId}`, { parentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", id] });
    },
  });

  const handleCreateSubtask = (taskId: string, parentId: string) => {
    createSubtaskMutation.mutate({ taskId, parentId });
  };

  // Filtrar tarefas por tags
  const filteredTasks = useMemo(() => {
    if (!tasks || selectedTagIds.length === 0) return tasks;

    return tasks.filter((task: Task) => {
      if (!task.tags || task.tags.length === 0) return false;
      const taskTagIds = task.tags.map((t) => t.tag.id);
      return selectedTagIds.some((tagId) => taskTagIds.includes(tagId));
    });
  }, [tasks, selectedTagIds]);

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleClearTags = () => {
    setSelectedTagIds([]);
  };

  // Atalho Ctrl+N para nova tarefa
  useHotkeys(
    "ctrl+n, cmd+n",
    (e) => {
      e.preventDefault();
      setIsCreateModalOpen(true);
    }
  );

  if (!columns || !tasks) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>;
  }

  return (
    <div>
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-100">Board Kanban</h2>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-indigo-700 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center gap-2"
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
            Nova Tarefa
          </button>
        </div>

        {id && (
          <TagFilter
            projectId={id}
            selectedTagIds={selectedTagIds}
            onTagToggle={handleTagToggle}
            onClearAll={handleClearTags}
          />
        )}
      </div>

      <KanbanBoard
        columns={columns}
        tasks={filteredTasks || tasks}
        onMoveTask={handleMoveTask}
        onEditTask={handleEditTask}
        onCreateSubtask={handleCreateSubtask}
      />

      {id && (
        <>
          <CreateTaskModal
            projectId={id}
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={handleTaskCreated}
          />
          <EditTaskModal
            projectId={id}
            task={selectedTask}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedTask(null);
            }}
            onSuccess={handleTaskUpdated}
          />
        </>
      )}
    </div>
  );
}

