import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import api from "../lib/axios.js";
import GanttChart from "../components/GanttChart.js";

export default function Gantt() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["gantt", id],
    queryFn: async () => {
      try {
        const response = await api.get(`/projects/${id}/gantt`);
        return response.data;
      } catch (err) {
        console.error("Erro ao carregar dados do Gantt:", err);
        return [];
      }
    },
    enabled: !!id,
    staleTime: 30000, // Cache por 30 segundos
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400">Carregando gráfico de Gantt...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg shadow p-8 text-center">
        <div className="text-red-400 mb-2">Erro ao carregar dados</div>
        <div className="text-gray-400 text-sm">
          Não foi possível carregar as tarefas para o gráfico de Gantt
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h2 className="text-2xl font-bold text-gray-100 mb-4">Gráfico de Gantt</h2>
      {data && data.length > 0 ? (
        <div className="w-full" style={{ width: "100%" }}>
          <GanttChart items={data} />
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg shadow p-8 text-center text-gray-400">
          Nenhuma tarefa com datas definidas para exibir no gráfico de Gantt
        </div>
      )}
    </div>
  );
}