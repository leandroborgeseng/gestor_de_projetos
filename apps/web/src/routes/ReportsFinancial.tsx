import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useState } from "react";
import api from "../lib/axios.js";

export default function ReportsFinancial() {
  const { id } = useParams<{ id: string }>();
  const [groupBy, setGroupBy] = useState("sprint");

  const { data, isLoading } = useQuery({
    queryKey: ["financial", id, groupBy],
    queryFn: () =>
      api
        .get(`/projects/${id}/reports/financial?groupBy=${groupBy}`)
        .then((res) => res.data),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>;
  }

  const totalPlanned = data?.reduce((sum: number, item: any) => sum + item.planned, 0) || 0;
  const totalActual = data?.reduce((sum: number, item: any) => sum + item.actual, 0) || 0;
  const totalVariance = totalActual - totalPlanned;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Resumo Financeiro</h2>
        <div className="flex gap-2">
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="px-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="sprint">Por Sprint</option>
            <option value="assignee">Por Pessoa</option>
            <option value="resource">Por Recurso</option>
            <option value="status">Por Status</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500">
          <div className="text-sm text-gray-400 mb-1">Total Planejado</div>
          <div className="text-2xl font-bold text-blue-400">
            {formatCurrency(totalPlanned)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg shadow p-6 border-l-4 border-green-500">
          <div className="text-sm text-gray-400 mb-1">Total Real</div>
          <div className="text-2xl font-bold text-green-400">
            {formatCurrency(totalActual)}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg shadow p-6 border-l-4 border-yellow-500">
          <div className="text-sm text-gray-400 mb-1">Variação</div>
          <div
            className={`text-2xl font-bold ${
              totalVariance >= 0 ? "text-red-400" : "text-green-400"
            }`}
          >
            {formatCurrency(totalVariance)}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Grupo
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Planejado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Real
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                Variação
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                Tarefas
              </th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {data?.map((item: any) => (
              <tr key={item.group} className="hover:bg-gray-700 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                  {item.group}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-right">
                  {formatCurrency(item.planned)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-right">
                  {formatCurrency(item.actual)}
                </td>
                <td
                  className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${
                    item.variance >= 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {formatCurrency(item.variance)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 text-center">
                  {item.itemsCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data?.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          Nenhum dado disponível para este projeto
        </div>
      )}
    </div>
  );
}

