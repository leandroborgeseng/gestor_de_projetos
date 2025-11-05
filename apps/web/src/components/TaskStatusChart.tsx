interface TaskStatusChartProps {
  tasksByStatus: Record<string, number>;
  totalTasks: number;
}

const statusColors: Record<string, string> = {
  BACKLOG: "bg-gray-300",
  TODO: "bg-blue-400",
  IN_PROGRESS: "bg-yellow-400",
  REVIEW: "bg-purple-400",
  DONE: "bg-green-400",
  BLOCKED: "bg-red-400",
};

const statusLabels: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "To Do",
  IN_PROGRESS: "Em Progresso",
  REVIEW: "Revisão",
  DONE: "Concluído",
  BLOCKED: "Bloqueado",
};

export default function TaskStatusChart({ tasksByStatus, totalTasks }: TaskStatusChartProps) {
  if (totalTasks === 0) {
    return (
      <div className="text-xs text-gray-400">Sem tarefas</div>
    );
  }

  const statusOrder = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {statusOrder.map((status) => {
        const count = tasksByStatus[status] || 0;
        const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;

        if (count === 0) return null;

        return (
          <div
            key={status}
            className="flex items-center gap-1.5"
            title={`${statusLabels[status]}: ${count} tarefa${count !== 1 ? "s" : ""}`}
          >
            <div
              className={`h-3 rounded-full ${statusColors[status]}`}
              style={{ width: `${Math.max(percentage * 3, 12)}px`, minWidth: "12px" }}
            />
            <span className="text-xs text-gray-300 font-medium">{count}</span>
          </div>
        );
      })}
      <span className="text-xs text-gray-500 ml-1">({totalTasks} total)</span>
    </div>
  );
}

