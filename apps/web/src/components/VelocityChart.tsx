import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import api from "../lib/axios.js";

interface VelocityChartProps {
  projectId: string;
}

export default function VelocityChart({ projectId }: VelocityChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["project-velocity", projectId],
    queryFn: () => api.get(`/projects/${projectId}/velocity`).then((res) => res.data),
    enabled: !!projectId,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Carregando dados de velocity...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-400">Erro ao carregar dados de velocity</div>;
  }

  if (!data || !data.velocityHistory || data.velocityHistory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Não há dados de velocity disponíveis. Crie sprints e conclua tarefas para ver o histórico.
      </div>
    );
  }

  const chartData = data.velocityHistory.map((sprint: any) => ({
    name: sprint.sprintName,
    velocity: sprint.velocity,
    planned: sprint.plannedHours,
    actual: sprint.actualHours,
    completionRate: sprint.completionRate,
  }));

  const { metrics } = data;

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-400 mb-1">Velocity Média</div>
          <div className="text-2xl font-bold text-blue-400">
            {metrics.averageVelocity.toFixed(1)}h
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-400 mb-1">Média Recente (3 sprints)</div>
          <div className="text-2xl font-bold text-green-400">
            {metrics.recentAverage.toFixed(1)}h
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-400 mb-1">Previsão Próxima Sprint</div>
          <div className="text-2xl font-bold text-yellow-400">
            {metrics.forecast.toFixed(1)}h
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-400 mb-1">Tendência</div>
          <div
            className={`text-2xl font-bold ${
              metrics.trend >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {metrics.trend >= 0 ? "+" : ""}
            {metrics.trend.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Velocity ao Longo do Tempo
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="name"
              stroke="#9CA3AF"
              angle={-45}
              textAnchor="end"
              height={80}
              interval={0}
            />
            <YAxis stroke="#9CA3AF" label={{ value: "Horas", angle: -90, position: "insideLeft" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "8px",
                color: "#F3F4F6",
              }}
              formatter={(value: any) => [`${value.toFixed(1)}h`, ""]}
            />
            <Legend
              wrapperStyle={{ color: "#9CA3AF" }}
              iconType="line"
            />
            <ReferenceLine
              y={metrics.averageVelocity}
              stroke="#6366F1"
              strokeDasharray="5 5"
              label={{ value: "Média", position: "right", fill: "#6366F1" }}
            />
            <Line
              type="monotone"
              dataKey="velocity"
              stroke="#10B981"
              strokeWidth={3}
              name="Velocity"
              dot={{ fill: "#10B981", r: 5 }}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="planned"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Horas Planejadas"
              dot={{ fill: "#3B82F6", r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              stroke="#F59E0B"
              strokeWidth={2}
              name="Horas Realizadas"
              dot={{ fill: "#F59E0B", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela de detalhes */}
      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100">Detalhes por Sprint</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Sprint
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Velocity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Planejado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Realizado
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Tarefas
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Taxa Conclusão
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-700">
              {data.velocityHistory.map((sprint: any) => (
                <tr key={sprint.sprintId} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                    {sprint.sprintName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right font-semibold">
                    {sprint.velocity.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-right">
                    {sprint.plannedHours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-right">
                    {sprint.actualHours.toFixed(1)}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-center">
                    {sprint.completedTasks}/{sprint.totalTasks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-center">
                    {sprint.completionRate.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

