import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";

interface ActivityLog {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, [any, any]>;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ActivityTimelineProps {
  entityType?: string;
  entityId?: string;
  userId?: string;
  limit?: number;
}

export default function ActivityTimeline({
  entityType,
  entityId,
  userId,
  limit = 50,
}: ActivityTimelineProps) {
  const { data: activities, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["activities", entityType, entityId, userId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (entityType) params.append("entityType", entityType);
      if (entityId) params.append("entityId", entityId);
      if (userId) params.append("userId", userId);
      params.append("limit", limit.toString());
      return api.get(`/activities?${params.toString()}`).then((res) => res.data.data);
    },
    enabled: !!(entityType && entityId) || !!userId,
  });

  if (isLoading) {
    return (
      <div className="text-center py-8 text-gray-400">
        Carregando atividades...
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Nenhuma atividade registrada
      </div>
    );
  }

  const getActionLabel = (action: string, entityType: string) => {
    const labels: Record<string, Record<string, string>> = {
      created: {
        Task: "criou a tarefa",
        Project: "criou o projeto",
        Sprint: "criou a sprint",
        User: "criou o usuário",
        TimeEntry: "registrou horas",
      },
      updated: {
        Task: "atualizou a tarefa",
        Project: "atualizou o projeto",
        Sprint: "atualizou a sprint",
        User: "atualizou o usuário",
        TimeEntry: "atualizou o registro de horas",
      },
      deleted: {
        Task: "excluiu a tarefa",
        Project: "excluiu o projeto",
        Sprint: "excluiu a sprint",
        User: "excluiu o usuário",
        TimeEntry: "excluiu o registro de horas",
      },
      moved: {
        Task: "moveu a tarefa",
      },
      assigned: {
        Task: "atribuiu a tarefa",
      },
    };

    return labels[action]?.[entityType] || `${action} ${entityType.toLowerCase()}`;
  };

  const formatChange = (field: string, oldVal: any, newVal: any) => {
    if (oldVal === null || oldVal === undefined) {
      return `definiu ${field} como ${newVal}`;
    }
    if (newVal === null || newVal === undefined) {
      return `removeu ${field} (era ${oldVal})`;
    }
    return `alterou ${field} de "${oldVal}" para "${newVal}"`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-100 mb-4">Histórico de Atividades</h3>
      <div className="relative">
        {/* Linha vertical */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700"></div>

        <div className="space-y-6">
          {activities.map((activity, index) => (
            <div key={activity.id} className="relative flex items-start gap-4">
              {/* Ponto na timeline */}
              <div className="relative z-10 flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.action === "created"
                      ? "bg-green-600"
                      : activity.action === "updated"
                      ? "bg-blue-600"
                      : activity.action === "deleted"
                      ? "bg-red-600"
                      : "bg-indigo-600"
                  }`}
                >
                  {activity.action === "created" && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  {activity.action === "updated" && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  )}
                  {activity.action === "deleted" && (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Conteúdo */}
              <div className="flex-1 min-w-0 bg-gray-800 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium text-gray-100">{activity.user.name}</span>{" "}
                      {getActionLabel(activity.action, activity.entityType)}
                    </p>

                    {/* Mostrar mudanças */}
                    {activity.changes && Object.keys(activity.changes).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(activity.changes).map(([field, [oldVal, newVal]]) => (
                          <p key={field} className="text-xs text-gray-400 pl-4 border-l-2 border-gray-700">
                            {formatChange(field, oldVal, newVal)}
                          </p>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(activity.createdAt).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

