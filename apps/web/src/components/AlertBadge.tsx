interface AlertBadgeProps {
  type: "task_overdue" | "task_due_soon" | "project_inactive" | "hours_overestimated";
  severity: "high" | "medium" | "low";
  title?: string;
}

export default function AlertBadge({ type, severity, title }: AlertBadgeProps) {
  const getBadgeConfig = () => {
    switch (type) {
      case "task_overdue":
        return {
          icon: "⚠️",
          color: severity === "high" ? "bg-red-600" : severity === "medium" ? "bg-orange-600" : "bg-yellow-600",
          text: "Atrasada",
        };
      case "task_due_soon":
        return {
          icon: "⏰",
          color: severity === "high" ? "bg-orange-600" : severity === "medium" ? "bg-yellow-600" : "bg-blue-600",
          text: "Prazo próximo",
        };
      case "hours_overestimated":
        return {
          icon: "📊",
          color: severity === "high" ? "bg-red-600" : severity === "medium" ? "bg-orange-600" : "bg-yellow-600",
          text: "Horas acima",
        };
      case "project_inactive":
        return {
          icon: "💤",
          color: severity === "high" ? "bg-gray-600" : severity === "medium" ? "bg-gray-500" : "bg-gray-400",
          text: "Inativo",
        };
      default:
        return {
          icon: "ℹ️",
          color: "bg-gray-600",
          text: "Alerta",
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white ${config.color}`}
      title={title}
    >
      <span>{config.icon}</span>
      <span>{config.text}</span>
    </span>
  );
}

