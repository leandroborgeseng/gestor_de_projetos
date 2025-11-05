import { useDraggable, useDroppable } from "@dnd-kit/core";

interface Task {
  id: string;
  title: string;
  description?: string;
  status?: string;
  assignee?: { id?: string; name: string; email?: string };
  assigneeId?: string;
  sprintId?: string;
  sprint?: { id?: string; name: string };
  estimateHours?: number;
  actualHours?: number;
  startDate?: string;
  dueDate?: string;
  subtasks?: Task[];
}

interface CardProps {
  task: Task;
  isDragging: boolean;
  isDragOver?: boolean;
  onEdit?: (task: Task) => void;
}

export default function Card({ task, isDragging, isDragOver, onEdit }: CardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: task.id,
  });

  // Combinar refs
  const combinedRef = (node: HTMLElement | null) => {
    setNodeRef(node);
    setDroppableRef(node);
  };

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(task);
    }
  };

  return (
    <div
      ref={combinedRef}
      style={style}
      className={`bg-gray-700 rounded-lg shadow-md p-4 hover:shadow-lg transition-all ${
        isDragging ? "opacity-50" : ""
      } ${
        (isDragOver || isOver) ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-800 bg-indigo-900/20" : ""
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <h4
          {...listeners}
          {...attributes}
          className="font-medium text-gray-100 flex-1 cursor-move"
        >
          {task.title}
        </h4>
        {onEdit && (
          <button
            onClick={handleEditClick}
            className="ml-2 p-1 text-gray-400 hover:text-indigo-400 transition-colors"
            title="Editar tarefa"
            aria-label="Editar tarefa"
          >
            <svg
              className="w-4 h-4"
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
        )}
      </div>
      {task.description && (
        <p
          {...listeners}
          {...attributes}
          className="text-sm text-gray-400 mb-2 line-clamp-2 cursor-move"
        >
          {task.description}
        </p>
      )}
      <div
        {...listeners}
        {...attributes}
        className="flex justify-between items-center text-xs text-gray-400 cursor-move"
      >
        <div className="flex items-center gap-2">
          {task.assignee && (
            <span className="bg-blue-900/30 text-blue-300 px-2 py-1 rounded">
              {task.assignee.name}
            </span>
          )}
          {task.subtasks && task.subtasks.length > 0 && (
            <span 
              className="flex items-center gap-1 bg-purple-900/30 text-purple-300 px-2 py-1 rounded"
              title={`${task.subtasks.length} subtarefa${task.subtasks.length > 1 ? 's' : ''}`}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <span className="font-medium">{task.subtasks.length}</span>
            </span>
          )}
        </div>
        {task.estimateHours && (
          <span>{task.estimateHours.toFixed(1)}h</span>
        )}
      </div>
    </div>
  );
}

