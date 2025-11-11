import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../lib/axios.js";
import AlertBadge from "./AlertBadge.js";

interface Alert {
  id: string;
  type: "task_overdue" | "task_due_soon" | "project_inactive" | "hours_overestimated";
  severity: "high" | "medium" | "low";
  title: string;
  message: string;
  entityType: "Task" | "Project";
  entityId: string;
  entityName: string;
  link?: string;
  createdAt: string;
}

export default function AlertsPanel() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ alerts: Alert[] }>({
    queryKey: ["alerts"],
    queryFn: () => api.get("/alerts").then((res) => res.data),
    refetchInterval: 60000, // Atualizar a cada minuto
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-4">
        <div className="text-center text-gray-400">Carregando alertas...</div>
      </div>
    );
  }

  const alerts = data?.alerts || [];
  const highSeverityAlerts = alerts.filter((a) => a.severity === "high");
  const mediumSeverityAlerts = alerts.filter((a) => a.severity === "medium");
  const lowSeverityAlerts = alerts.filter((a) => a.severity === "low");

  if (alerts.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="w-5 h-5 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-100">Alertas</h3>
        </div>
        <p className="text-sm text-gray-400">Nenhum alerta no momento</p>
      </div>
    );
  }

  const handleAlertClick = (alert: Alert) => {
    if (alert.link) {
      navigate(alert.link);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-yellow-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-100">Alertas</h3>
          <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
            {alerts.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Alertas de alta severidade */}
        {highSeverityAlerts.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wide">
              Alta Prioridade ({highSeverityAlerts.length})
            </div>
            {highSeverityAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className="w-full text-left p-3 bg-red-900/30 border border-red-700 rounded-md hover:bg-red-900/50 transition-colors mb-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertBadge type={alert.type} severity={alert.severity} />
                      <span className="text-sm font-medium text-gray-100">{alert.title}</span>
                    </div>
                    <p className="text-xs text-gray-300">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.entityName}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Alertas de média severidade */}
        {mediumSeverityAlerts.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-orange-400 mb-2 uppercase tracking-wide">
              Média Prioridade ({mediumSeverityAlerts.length})
            </div>
            {mediumSeverityAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className="w-full text-left p-3 bg-orange-900/30 border border-orange-700 rounded-md hover:bg-orange-900/50 transition-colors mb-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertBadge type={alert.type} severity={alert.severity} />
                      <span className="text-sm font-medium text-gray-100">{alert.title}</span>
                    </div>
                    <p className="text-xs text-gray-300">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.entityName}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Alertas de baixa severidade */}
        {lowSeverityAlerts.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-yellow-400 mb-2 uppercase tracking-wide">
              Baixa Prioridade ({lowSeverityAlerts.length})
            </div>
            {lowSeverityAlerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => handleAlertClick(alert)}
                className="w-full text-left p-3 bg-yellow-900/30 border border-yellow-700 rounded-md hover:bg-yellow-900/50 transition-colors mb-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertBadge type={alert.type} severity={alert.severity} />
                      <span className="text-sm font-medium text-gray-100">{alert.title}</span>
                    </div>
                    <p className="text-xs text-gray-300">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{alert.entityName}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

