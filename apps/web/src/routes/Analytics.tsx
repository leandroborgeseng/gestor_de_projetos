import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from "recharts";
import api from "../lib/axios.js";
import Navbar from "../components/Navbar.js";

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function Analytics() {
  const { id: projectId } = useParams<{ id: string }>();
  const [selectedProject, setSelectedProject] = useState<string>(projectId || "all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Buscar projetos para filtro
  const { data: projectsResponse } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get("/projects?archived=false").then((res) => res.data),
  });

  const projects = projectsResponse?.data || [];

  // Query params para filtros
  const queryParams = new URLSearchParams();
  if (selectedProject && selectedProject !== "all") {
    queryParams.append("projectId", selectedProject);
  }
  if (startDate) queryParams.append("startDate", startDate);
  if (endDate) queryParams.append("endDate", endDate);

  // Métricas de produtividade
  const { data: productivity, isLoading: isLoadingProductivity } = useQuery({
    queryKey: ["analytics-productivity", selectedProject, startDate, endDate],
    queryFn: () => api.get(`/analytics/productivity?${queryParams.toString()}`).then((res) => res.data),
  });

  // Métricas de custos
  const { data: costs, isLoading: isLoadingCosts } = useQuery({
    queryKey: ["analytics-costs", selectedProject, startDate, endDate],
    queryFn: () => api.get(`/analytics/costs?${queryParams.toString()}`).then((res) => res.data),
  });

  // Métricas de tempo
  const { data: time, isLoading: isLoadingTime } = useQuery({
    queryKey: ["analytics-time", selectedProject, startDate, endDate],
    queryFn: () => api.get(`/analytics/time?${queryParams.toString()}`).then((res) => res.data),
  });

  // Métricas de qualidade
  const { data: quality, isLoading: isLoadingQuality } = useQuery({
    queryKey: ["analytics-quality", selectedProject, startDate, endDate],
    queryFn: () => api.get(`/analytics/quality?${queryParams.toString()}`).then((res) => res.data),
  });

  // Heatmap de atividade
  const { data: activity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["analytics-activity", selectedProject, startDate, endDate],
    queryFn: () => api.get(`/analytics/activity-heatmap?${queryParams.toString()}`).then((res) => res.data),
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoadingProductivity || isLoadingCosts || isLoadingTime || isLoadingQuality || isLoadingActivity) {
    return (
      <div className="min-h-screen bg-surface text-primary transition-colors duration-200">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12 text-gray-400">Carregando analytics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-primary transition-colors duration-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-100 mb-4">Dashboard Analítico</h1>

          {/* Filtros */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Projeto</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="all">Todos os Projetos</option>
                  {Array.isArray(projects) && projects.map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setStartDate("");
                    setEndDate("");
                    setSelectedProject(projectId || "all");
                  }}
                  className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Métricas Gerais de Produtividade */}
        {productivity?.general && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="text-sm text-gray-400 mb-1">Total de Tarefas</div>
              <div className="text-2xl font-bold text-blue-400">{productivity.general.totalTasks}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-green-500">
              <div className="text-sm text-gray-400 mb-1">Tarefas Concluídas</div>
              <div className="text-2xl font-bold text-green-400">
                {productivity.general.completedTasks}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-yellow-500">
              <div className="text-sm text-gray-400 mb-1">Taxa de Conclusão</div>
              <div className="text-2xl font-bold text-yellow-400">
                {productivity.general.completionRate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border-l-4 border-purple-500">
              <div className="text-sm text-gray-400 mb-1">Eficiência</div>
              <div className="text-2xl font-bold text-purple-400">
                {productivity.general.efficiency.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de Produtividade por Membro */}
        {productivity?.byMember && productivity.byMember.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Produtividade por Membro</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={productivity.byMember}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                />
                <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                <Bar dataKey="velocity" fill="#10B981" name="Velocity (h)" />
                <Bar dataKey="plannedHours" fill="#3B82F6" name="Horas Planejadas" />
                <Bar dataKey="actualHours" fill="#F59E0B" name="Horas Realizadas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de Custos */}
        {costs && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Custos por Projeto</h2>
              {costs.byProject && costs.byProject.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costs.byProject}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="projectName" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F3F4F6",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                    <Bar dataKey="planned" fill="#3B82F6" name="Planejado" />
                    <Bar dataKey="actual" fill="#10B981" name="Real" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-400">Sem dados disponíveis</div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Custos por Membro</h2>
              {costs.byMember && costs.byMember.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={costs.byMember}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F3F4F6",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                    <Bar dataKey="planned" fill="#3B82F6" name="Planejado" />
                    <Bar dataKey="actual" fill="#10B981" name="Real" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-400">Sem dados disponíveis</div>
              )}
            </div>
          </div>
        )}

        {/* Métricas de Tempo */}
        {time && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Tempo Médio por Status</h2>
              {time.byStatus && time.byStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={time.byStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="status" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" label={{ value: "Dias", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F3F4F6",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)} dias`, ""]}
                    />
                    <Bar dataKey="avgDays" fill="#8B5CF6" name="Dias Médios" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-400">Sem dados disponíveis</div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Tempo Médio por Membro</h2>
              {time.byMember && time.byMember.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={time.byMember}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F3F4F6",
                      }}
                    />
                    <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                    <Bar dataKey="avgDays" fill="#8B5CF6" name="Dias Médios" />
                    <Bar dataKey="totalHours" fill="#EC4899" name="Total Horas" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-400">Sem dados disponíveis</div>
              )}
            </div>
          </div>
        )}

        {/* Métricas de Qualidade */}
        {quality && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Taxa de Conclusão por Sprint</h2>
              {quality.bySprint && quality.bySprint.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={quality.bySprint}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="sprintName" stroke="#9CA3AF" angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#9CA3AF" label={{ value: "%", angle: -90, position: "insideLeft" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F3F4F6",
                      }}
                      formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
                    />
                    <Bar dataKey="completionRate" fill="#10B981" name="Taxa de Conclusão" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-400">Sem dados disponíveis</div>
              )}
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-100 mb-4">Métricas de Qualidade</h2>
              <div className="space-y-4">
                {quality.general && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Taxa de Conclusão</span>
                      <span className="text-xl font-bold text-green-400">
                        {quality.general.completionRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Taxa de Bloqueio</span>
                      <span className="text-xl font-bold text-red-400">
                        {quality.general.blockRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Total de Tarefas</span>
                      <span className="text-xl font-bold text-gray-100">{quality.general.totalTasks}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Tarefas Concluídas</span>
                      <span className="text-xl font-bold text-green-400">
                        {quality.general.completedTasks}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-300">Tarefas Bloqueadas</span>
                      <span className="text-xl font-bold text-red-400">
                        {quality.general.blockedTasks}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Heatmap de Atividade */}
        {activity?.heatmap && activity.heatmap.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Heatmap de Atividade</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activity.heatmap}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  tickFormatter={(value) => new Date(value).toLocaleDateString("pt-BR")}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                  labelFormatter={(value) => new Date(value).toLocaleDateString("pt-BR")}
                />
                <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                <Bar dataKey="created" fill="#3B82F6" name="Criadas" />
                <Bar dataKey="completed" fill="#10B981" name="Concluídas" />
                <Bar dataKey="inProgress" fill="#F59E0B" name="Em Progresso" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Produtividade por Sprint */}
        {productivity?.bySprint && productivity.bySprint.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Produtividade por Sprint</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={productivity.bySprint}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="sprintName" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                />
                <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                <Line
                  type="monotone"
                  dataKey="velocity"
                  stroke="#10B981"
                  strokeWidth={3}
                  name="Velocity"
                  dot={{ fill: "#10B981", r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="plannedHours"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Horas Planejadas"
                  dot={{ fill: "#3B82F6", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="actualHours"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  name="Horas Realizadas"
                  dot={{ fill: "#F59E0B", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de Pizza - Distribuição de Tarefas por Status */}
        {productivity?.general && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Distribuição de Tarefas por Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Concluídas", value: productivity.general.completedTasks, color: "#10B981" },
                        { name: "Em Progresso", value: productivity.general.totalTasks - productivity.general.completedTasks, color: "#F59E0B" },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10B981" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1F2937",
                        border: "1px solid #374151",
                        borderRadius: "8px",
                        color: "#F3F4F6",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Total de Tarefas</div>
                  <div className="text-3xl font-bold text-gray-100">{productivity.general.totalTasks}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Taxa de Conclusão</div>
                  <div className="text-3xl font-bold text-green-400">
                    {productivity.general.completionRate.toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Eficiência</div>
                  <div className="text-3xl font-bold text-purple-400">
                    {productivity.general.efficiency.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de Área - Evolução de Produtividade ao Longo do Tempo */}
        {productivity?.bySprint && productivity.bySprint.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Evolução de Produtividade</h2>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={productivity.bySprint}>
                <defs>
                  <linearGradient id="colorVelocity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="sprintName" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                />
                <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                <Area
                  type="monotone"
                  dataKey="velocity"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorVelocity)"
                  name="Velocity"
                />
                <Area
                  type="monotone"
                  dataKey="plannedHours"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorPlanned)"
                  name="Horas Planejadas"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de Barras Empilhadas - Distribuição de Horas por Projeto */}
        {costs?.byProject && costs.byProject.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Distribuição de Horas por Projeto</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={costs.byProject}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="projectName" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    color: "#F3F4F6",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                <Bar dataKey="planned" stackId="a" fill="#3B82F6" name="Planejado" />
                <Bar dataKey="variance" stackId="a" fill={costs.byProject[0]?.variance >= 0 ? "#EF4444" : "#10B981"} name="Variação" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gráfico de Radar - Comparação de Membros */}
        {productivity?.byMember && productivity.byMember.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Comparação de Performance dos Membros</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {productivity.byMember.slice(0, 4).map((member: any, index: number) => {
                const maxVelocity = Math.max(...productivity.byMember.map((m: any) => m.velocity || 0));
                const maxHours = Math.max(...productivity.byMember.map((m: any) => m.plannedHours || 0));
                const maxCompletion = 100;

                const radarData = [
                  { subject: "Velocity", A: ((member.velocity || 0) / maxVelocity) * 100, fullMark: 100 },
                  { subject: "Horas", A: ((member.plannedHours || 0) / maxHours) * 100, fullMark: 100 },
                  { subject: "Conclusão", A: member.completionRate || 0, fullMark: 100 },
                  { subject: "Eficiência", A: member.plannedHours > 0 ? ((member.actualHours || 0) / member.plannedHours) * 100 : 0, fullMark: 100 },
                ];

                return (
                  <div key={member.name || index} className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-100 mb-4 text-center">{member.name}</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#374151" />
                        <PolarAngleAxis dataKey="subject" stroke="#9CA3AF" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#9CA3AF" />
                        <Radar
                          name="Performance"
                          dataKey="A"
                          stroke={COLORS[index % COLORS.length]}
                          fill={COLORS[index % COLORS.length]}
                          fillOpacity={0.6}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#1F2937",
                            border: "1px solid #374151",
                            borderRadius: "8px",
                            color: "#F3F4F6",
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Gráfico de Linha - Tendência de Custos ao Longo do Tempo */}
        {costs && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-100 mb-4">Tendência de Custos</h2>
            {costs.total && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Custo Total Planejado</div>
                  <div className="text-2xl font-bold text-blue-400">{formatCurrency(costs.total.planned)}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Custo Total Real</div>
                  <div className="text-2xl font-bold text-green-400">{formatCurrency(costs.total.actual)}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400 mb-2">Variação Total</div>
                  <div className={`text-2xl font-bold ${costs.total.variance >= 0 ? "text-red-400" : "text-green-400"}`}>
                    {formatCurrency(costs.total.variance)}
                  </div>
                </div>
              </div>
            )}
            {costs.byProject && costs.byProject.length > 0 && (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={costs.byProject}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="projectName" stroke="#9CA3AF" angle={-45} textAnchor="end" height={100} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#F3F4F6",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend wrapperStyle={{ color: "#9CA3AF" }} />
                  <Line
                    type="monotone"
                    dataKey="planned"
                    stroke="#3B82F6"
                    strokeWidth={3}
                    name="Planejado"
                    dot={{ fill: "#3B82F6", r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#10B981"
                    strokeWidth={3}
                    name="Real"
                    dot={{ fill: "#10B981", r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="variance"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    name="Variação"
                    dot={{ fill: "#EF4444", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

