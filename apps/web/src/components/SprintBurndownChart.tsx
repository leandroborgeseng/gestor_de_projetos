import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../lib/axios.js";

interface SprintBurndownChartProps {
  sprintId: string;
}

export default function SprintBurndownChart({ sprintId }: SprintBurndownChartProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sprint-burndown", sprintId],
    queryFn: () => api.get(`/projects/sprints/${sprintId}/burndown`).then((res) => res.data),
    enabled: !!sprintId,
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-400">Carregando gráfico...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-400">Erro ao carregar dados do burndown</div>;
  }

  if (!data) return null;

  // Preparar dados para o gráfico
  const idealData = data.idealBurndown || [];
  const realData = data.realBurndown || [];

  // Combinar dados ideal e real
  const maxDay = Math.max(
    idealData.length > 0 ? idealData[idealData.length - 1].day : 0,
    realData.length > 0 ? realData[realData.length - 1].day : 0
  );

  const chartData = [];
  
  for (let day = 0; day <= maxDay; day++) {
    const idealPoint = idealData.find((p: any) => p.day === day);
    const realPoint = realData.find((p: any) => p.day === day);

    // Se não houver ponto real, usar o último valor conhecido ou o inicial
    let realValue = null;
    if (realPoint) {
      realValue = realPoint.remainingHours;
    } else if (day === 0) {
      realValue = data.metrics.totalEstimatedHours;
    } else {
      // Encontrar o último ponto real antes deste dia
      const previousRealPoint = realData
        .filter((p: any) => p.day < day)
        .sort((a: any, b: any) => b.day - a.day)[0];
      if (previousRealPoint) {
        realValue = previousRealPoint.remainingHours;
      }
    }

    chartData.push({
      day: day,
      dayLabel: `Dia ${day}`,
      ideal: idealPoint?.idealHours ?? 0,
      real: realValue,
    });
  }

  // Filtrar apenas pontos válidos
  const filteredChartData = chartData.filter((point) => point.real !== null);

  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-xl font-bold text-gray-100 mb-4">Gráfico de Burndown</h3>
      
      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-400">Horas Estimadas</div>
          <div className="text-2xl font-bold text-blue-400">{data.metrics.totalEstimatedHours.toFixed(1)}h</div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-400">Horas Concluídas</div>
          <div className="text-2xl font-bold text-green-400">{data.metrics.completedHours.toFixed(1)}h</div>
        </div>
        <div className="bg-gray-700 rounded p-3">
          <div className="text-sm text-gray-400">Horas Restantes</div>
          <div className="text-2xl font-bold text-yellow-400">{data.metrics.remainingHours.toFixed(1)}h</div>
        </div>
        <div className={`bg-gray-700 rounded p-3 ${data.metrics.isOnTrack ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
          <div className="text-sm text-gray-400">Status</div>
          <div className={`text-lg font-bold ${data.metrics.isOnTrack ? 'text-green-400' : 'text-red-400'}`}>
            {data.metrics.isOnTrack ? "No Prazo" : "Atrasado"}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="dayLabel" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              label={{ value: 'Horas', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
              formatter={(value: any) => [`${Number(value).toFixed(1)}h`, '']}
            />
            <Legend 
              wrapperStyle={{ color: '#9ca3af' }}
            />
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideal"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="real"
              name="Real"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Informações adicionais */}
      <div className="mt-4 text-sm text-gray-400">
        <p>
          Dias decorridos: {data.metrics.daysElapsed} / {data.metrics.totalDays} • 
          Dias restantes: {data.metrics.daysRemaining}
        </p>
        <p>
          Velocidade: {data.metrics.velocity.toFixed(2)}h/dia • 
          Projeção de conclusão: {new Date(data.metrics.projectedCompletionDate).toLocaleDateString("pt-BR")}
        </p>
      </div>
    </div>
  );
}

