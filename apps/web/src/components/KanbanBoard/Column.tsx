import { useDroppable } from "@dnd-kit/core";
import Card from "./Card.js";

interface Column {
  id: string;
  title: string;
  status: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  assignee?: { name: string };
  estimateHours?: number;
}

interface ColumnProps {
  column: Column;
  tasks: Task[];
  activeId: string | null;
  draggedOverTaskId?: string | null;
  onEditTask?: (task: Task) => void;
}

export default function Column({ column, tasks, activeId, draggedOverTaskId, onEditTask }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`bg-gray-800 rounded-lg p-4 min-h-[500px] ${
        isOver ? "bg-gray-700" : ""
      }`}
    >
      <h3 className="font-semibold text-gray-300 mb-4 sticky top-0 bg-gray-800 py-2">
        {column.title} ({tasks.length})
      </h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <Card
            key={task.id}
            task={task}
            isDragging={activeId === task.id}
            isDragOver={draggedOverTaskId === task.id}
            onEdit={onEditTask}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-8">
            Sem tarefas
          </div>
        )}
      </div>
    </div>
  );
}

