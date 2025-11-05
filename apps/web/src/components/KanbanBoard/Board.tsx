import {
  DndContext,
  closestCorners,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import Column from "./Column.js";
import { useState } from "react";

interface Column {
  id: string;
  title: string;
  status: string;
  order: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  order: number;
  assignee?: { name: string };
  estimateHours?: number;
  subtasks?: Task[];
}

interface BoardProps {
  columns: Column[];
  tasks: Task[];
  onMoveTask: (taskId: string, newStatus: string, newOrder?: number) => void;
  onEditTask?: (task: Task) => void;
  onCreateSubtask?: (taskId: string, parentId: string) => void;
}

export default function Board({ columns, tasks, onMoveTask, onEditTask, onCreateSubtask }: BoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedOverTaskId, setDraggedOverTaskId] = useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    // Se está arrastando sobre outro card (não uma coluna)
    if (over && over.id !== active.id) {
      const overTask = tasks.find((t) => t.id === over.id);
      const activeTask = tasks.find((t) => t.id === active.id);
      
      // Se está arrastando sobre outra tarefa (não uma coluna)
      if (overTask && activeTask && !columns.find((c) => c.id === over.id)) {
        setDraggedOverTaskId(over.id as string);
      } else {
        setDraggedOverTaskId(null);
      }
    } else {
      setDraggedOverTaskId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedOverTaskId(null);

    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Verificar se está arrastando sobre outra tarefa (criar subtarefa)
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask && onCreateSubtask && taskId !== overId) {
      // Confirmar criação de subtarefa
      if (window.confirm(`Deseja tornar "${task.title}" uma subtarefa de "${overTask.title}"?`)) {
        onCreateSubtask(taskId, overId);
        return;
      }
    }

    // Verificar se está arrastando sobre uma coluna (mover entre colunas)
    const targetColumn = columns.find((c) => c.id === overId);
    if (targetColumn && task.status !== targetColumn.status) {
      onMoveTask(taskId, targetColumn.status);
      return;
    }
  };

  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  return (
    <DndContext
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {sortedColumns.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.status === column.status)
            .sort((a, b) => a.order - b.order);

          return (
            <Column
              key={column.id}
              column={column}
              tasks={columnTasks}
              activeId={activeId}
              draggedOverTaskId={draggedOverTaskId}
              onEditTask={onEditTask}
            />
          );
        })}
      </div>
    </DndContext>
  );
}

