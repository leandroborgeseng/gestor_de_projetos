import { Gantt, ViewMode } from "gantt-task-react";
import "gantt-task-react/dist/index.css";
import { useEffect, useMemo } from "react";

interface GanttItem {
  id: string;
  name: string;
  start: string | Date;
  end: string | Date;
  progress: number;
  assignee?: string;
  sprint?: string;
  status?: string;
}

interface GanttChartProps {
  items: GanttItem[];
}

export default function GanttChart({ items }: GanttChartProps) {
  // Converter items para o formato do Gantt
  const tasks = useMemo(() => {
    return items.map((item) => ({
      start: new Date(item.start),
      end: new Date(item.end),
      name: item.name,
      id: item.id,
      type: "task" as const,
      progress: item.progress || 0,
      hideChildren: true,
      styles: {
        progressColor: "#10b981",
        progressSelectedColor: "#059669",
        backgroundColor: "#4b5563",
        backgroundSelectedColor: "#6b7280",
        barBackgroundColor: "#4b5563",
        barBackgroundSelectedColor: "#6b7280",
      },
    }));
  }, [items]);

  // Aplicar estilos escuros ao Gantt
  useEffect(() => {
    const styleId = "gantt-dark-theme";
    
    // Remover estilo anterior se existir
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    // Criar novo estilo
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* Container principal */
      .gantt-container {
        background-color: #1f2937 !important;
        color: #f3f4f6 !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Todas as tabelas */
      .gantt-container table,
      .gantt-container table * {
        background-color: #1f2937 !important;
        color: #f3f4f6 !important;
        border-color: #374151 !important;
      }

      /* Forçar tabela a ocupar toda a largura */
      .gantt-container table {
        width: 100% !important;
        table-layout: auto !important;
      }

      /* Cabeçalhos */
      .gantt-container thead,
      .gantt-container thead th,
      .gantt-container thead td {
        background-color: #374151 !important;
        color: #f3f4f6 !important;
      }

      /* Células */
      .gantt-container td,
      .gantt-container th {
        background-color: #1f2937 !important;
        color: #f3f4f6 !important;
        border-color: #374151 !important;
      }

      /* Linhas */
      .gantt-container tr {
        background-color: #1f2937 !important;
      }

      .gantt-container tr:hover {
        background-color: #374151 !important;
      }

      /* Divs e spans */
      .gantt-container div,
      .gantt-container span {
        color: #f3f4f6 !important;
      }

      /* Scrollbar */
      .gantt-container::-webkit-scrollbar {
        background-color: #1f2937;
        width: 8px;
        height: 8px;
      }

      .gantt-container::-webkit-scrollbar-thumb {
        background-color: #4b5563;
        border-radius: 4px;
      }

      .gantt-container::-webkit-scrollbar-thumb:hover {
        background-color: #6b7280;
      }
    `;

    document.head.appendChild(style);

    return () => {
      const styleElement = document.getElementById(styleId);
      if (styleElement) {
        styleElement.remove();
      }
    };
  }, []);

  if (tasks.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-8 text-center text-gray-400">
        Nenhuma tarefa com datas definidas para exibir no gráfico de Gantt
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Gantt
        tasks={tasks}
        viewMode={ViewMode.Month}
        locale="pt-BR"
        columnWidth={65}
        preStepsCount={1}
        todayColor="rgba(59, 130, 246, 0.5)"
      />
    </div>
  );
}