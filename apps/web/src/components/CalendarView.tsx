import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import { format, startOfMonth, endOfMonth } from "date-fns";
import moment from "moment";
import "moment/locale/pt-br";
import api from "../lib/axios.js";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { getCurrentUser } from "../utils/user.js";

moment.locale("pt-br");
const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  projectId: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    type: "task" | "sprint";
    status?: string;
    assignee?: { name: string };
  };
}

export default function CalendarView({ projectId }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const currentUser = getCurrentUser();
  const queryClient = useQueryClient();

  const { data: calendarData, isLoading } = useQuery({
    queryKey: ["calendar", projectId, currentDate],
    queryFn: async () => {
      const start = format(startOfMonth(currentDate), "yyyy-MM-dd");
      const end = format(endOfMonth(currentDate), "yyyy-MM-dd");
      const response = await api.get(`/calendar/projects/${projectId}/data`, {
        params: { startDate: start, endDate: end },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // cache por 5 minutos
    cacheTime: 10 * 60 * 1000,
  });

  // Converter tarefas e sprints para eventos do calendário
  const events: CalendarEvent[] = useMemo(() => {
    if (!calendarData) return [];

    const computedEvents: CalendarEvent[] = [];

    calendarData.tasks?.forEach((task: any) => {
      if (task.dueDate || task.startDate) {
        const start = task.startDate ? new Date(task.startDate) : new Date(task.dueDate);
        const end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 60 * 60 * 1000);
        computedEvents.push({
          id: task.id,
          title: task.title,
          start,
          end,
          resource: {
            type: "task",
            status: task.status,
            assignee: task.assignee,
          },
        });
      }
    });

    calendarData.sprints?.forEach((sprint: any) => {
      computedEvents.push({
        id: sprint.id,
        title: sprint.name,
        start: new Date(sprint.startDate),
        end: new Date(sprint.endDate),
        resource: {
          type: "sprint",
        },
      });
    });

    return computedEvents;
  }, [calendarData]);

  // Função para obter a cor do evento baseado no tipo e status
  const getEventStyle = (event: CalendarEvent) => {
    if (event.resource?.type === "sprint") {
      return {
        style: {
          backgroundColor: "#6366f1",
          borderColor: "#4f46e5",
          color: "#fff",
        },
      };
    }

    // Cores baseadas no status da tarefa
    const statusColors: Record<string, { bg: string; border: string }> = {
      DONE: { bg: "#10b981", border: "#059669" },
      IN_PROGRESS: { bg: "#3b82f6", border: "#2563eb" },
      REVIEW: { bg: "#f59e0b", border: "#d97706" },
      TODO: { bg: "#6b7280", border: "#4b5563" },
      BLOCKED: { bg: "#ef4444", border: "#dc2626" },
      BACKLOG: { bg: "#9ca3af", border: "#6b7280" },
    };

    const colors = statusColors[event.resource?.status || "TODO"] || statusColors.TODO;

    return {
      style: {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: "#fff",
        borderRadius: "4px",
        border: `1px solid ${colors.border}`,
      },
    };
  };

  const handleExportTasks = async () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const response = await api.get(`/calendar/projects/${projectId}/tasks/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tasks-${projectId}-${new Date().toISOString().split("T")[0]}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportMessage({ type: "success", text: "Tarefas exportadas com sucesso!" });
      setTimeout(() => setExportMessage(null), 3000);
    } catch (error: any) {
      console.error("Erro ao exportar tarefas:", error);
      setExportMessage({ 
        type: "error", 
        text: error.response?.data?.error || "Erro ao exportar tarefas para calendário" 
      });
      setTimeout(() => setExportMessage(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSprints = async () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const response = await api.get(`/calendar/projects/${projectId}/sprints/export`, {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sprints-${projectId}-${new Date().toISOString().split("T")[0]}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportMessage({ type: "success", text: "Sprints exportadas com sucesso!" });
      setTimeout(() => setExportMessage(null), 3000);
    } catch (error: any) {
      console.error("Erro ao exportar sprints:", error);
      setExportMessage({ 
        type: "error", 
        text: error.response?.data?.error || "Erro ao exportar sprints para calendário" 
      });
      setTimeout(() => setExportMessage(null), 5000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportICal = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".ics")) {
      setExportMessage({ type: "error", text: "Por favor, selecione um arquivo .ics" });
      setTimeout(() => setExportMessage(null), 3000);
      return;
    }

    setIsImporting(true);
    setExportMessage(null);

    try {
      const fileContent = await file.text();
      
      const response = await api.post(`/calendar/projects/${projectId}/tasks/import`, {
        content: fileContent,
      });

      const message = response.data.message || `${response.data.imported} tarefa(s) importada(s) com sucesso`;
      setExportMessage({ type: "success", text: message });
      setTimeout(() => setExportMessage(null), 5000);
      
      // Recarregar dados do calendário
      queryClient.invalidateQueries({ queryKey: ["calendar", projectId], exact: false });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId], exact: false });
      
      // Limpar input
      event.target.value = "";
    } catch (error: any) {
      console.error("Erro ao importar iCal:", error);
      setExportMessage({ 
        type: "error", 
        text: error.response?.data?.error || "Erro ao importar arquivo iCal" 
      });
      setTimeout(() => setExportMessage(null), 5000);
    } finally {
      setIsImporting(false);
    }
  };

  const messages = useMemo(() => ({
    allDay: "Dia inteiro",
    previous: "Anterior",
    next: "Próximo",
    today: "Hoje",
    month: "Mês",
    week: "Semana",
    day: "Dia",
    agenda: "Agenda",
    date: "Data",
    time: "Hora",
    event: "Evento",
    noEventsInRange: "Não há eventos neste período.",
    showMore: (total: number) => `+${total} mais`,
  }), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Carregando calendário...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Calendário</h2>
        <div className="flex flex-col gap-3">
          {/* Mensagens de feedback */}
          {exportMessage && (
            <div
              className={`px-4 py-2 rounded-md flex items-center gap-2 ${
                exportMessage.type === "success"
                  ? "bg-green-900/50 text-green-300 border border-green-700"
                  : "bg-red-900/50 text-red-300 border border-red-700"
              }`}
            >
              {exportMessage.type === "success" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className="text-sm font-medium">{exportMessage.text}</span>
            </div>
          )}
          <div className="flex gap-2">
            <label
              className={`px-4 py-2 bg-green-700 text-white rounded-md flex items-center gap-2 cursor-pointer transition-colors ${
                isImporting ? "opacity-50 cursor-not-allowed" : "hover:bg-green-600"
              }`}
            >
              {isImporting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Importando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  Importar iCal
                </>
              )}
              <input
                type="file"
                accept=".ics"
                onChange={handleImportICal}
                className="hidden"
                disabled={isImporting}
              />
            </label>
            <button
              onClick={handleExportTasks}
              disabled={isExporting}
              className={`px-4 py-2 bg-indigo-700 text-white rounded-md flex items-center gap-2 transition-colors ${
                isExporting ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-600"
              }`}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Exportar Tarefas
                </>
              )}
            </button>
            <button
              onClick={handleExportSprints}
              disabled={isExporting}
              className={`px-4 py-2 bg-purple-700 text-white rounded-md flex items-center gap-2 transition-colors ${
                isExporting ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-600"
              }`}
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exportando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Exportar Sprints
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface-elevated rounded-lg p-4 border border-subtle transition-colors duration-200" style={{ height: "600px" }}>
        <style>{`
          .rbc-calendar {
            background-color: #1f2937;
            color: #f3f4f6;
          }
          .rbc-header {
            background-color: #374151;
            color: #f3f4f6;
            border-bottom: 1px solid #4b5563;
            padding: 10px;
          }
          .rbc-today {
            background-color: #111827;
          }
          .rbc-off-range-bg {
            background-color: #111827;
          }
          .rbc-date-cell {
            color: #f3f4f6;
          }
          .rbc-day-slot .rbc-time-slot {
            border-top: 1px solid #374151;
          }
          .rbc-time-header-content {
            border-left: 1px solid #4b5563;
          }
          .rbc-time-content {
            border-top: 2px solid #4b5563;
          }
          .rbc-event {
            border-radius: 4px;
            padding: 2px 5px;
          }
          .rbc-event-label {
            color: #fff;
          }
          .rbc-toolbar button {
            background-color: #374151;
            color: #f3f4f6;
            border: 1px solid #4b5563;
          }
          .rbc-toolbar button:hover {
            background-color: #4b5563;
          }
          .rbc-toolbar button.rbc-active {
            background-color: #6366f1;
            color: #fff;
          }
        `}</style>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
          messages={messages}
          eventPropGetter={getEventStyle}
          culture="pt-BR"
          style={{
            height: "100%",
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-600 rounded"></div>
          <span className="text-gray-300">Sprint</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-600 rounded"></div>
          <span className="text-gray-300">Tarefa Concluída</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span className="text-gray-300">Em Progresso</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-600 rounded"></div>
          <span className="text-gray-300">Em Revisão</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-600 rounded"></div>
          <span className="text-gray-300">A Fazer</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span className="text-gray-300">Bloqueada</span>
        </div>
      </div>
    </div>
  );
}

