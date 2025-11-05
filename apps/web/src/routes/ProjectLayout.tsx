import { Outlet, useParams, NavLink } from "react-router-dom";
import Navbar from "../components/Navbar.js";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";

export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>();

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get(`/projects/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  const navLinks = [
    { to: `/projects/${id}/tasks`, label: "Tarefas" },
    { to: `/projects/${id}/board`, label: "Board" },
    { to: `/projects/${id}/gantt`, label: "Gantt" },
    { to: `/projects/${id}/sprints`, label: "Sprints" },
    { to: `/projects/${id}/people`, label: "Pessoas" },
    { to: `/projects/${id}/resources`, label: "Recursos" },
    { to: `/projects/${id}/reports/financial`, label: "Relatórios" },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {project && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-100">{project.name}</h1>
            {project.description && (
              <p className="text-gray-400 mt-2">{project.description}</p>
            )}
          </div>
        )}

        <nav className="mb-6 border-b border-gray-700">
          <div className="flex space-x-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `pb-4 px-1 border-b-2 font-medium text-sm ${
                    isActive
                      ? "border-indigo-400 text-indigo-400"
                      : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <Outlet />
      </div>
    </div>
  );
}

