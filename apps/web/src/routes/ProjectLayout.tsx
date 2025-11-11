import { useState } from "react";
import { Outlet, useParams, NavLink } from "react-router-dom";
import Navbar from "../components/Navbar.js";
import { useQuery } from "@tanstack/react-query";
import api from "../lib/axios.js";
import ConvertToTemplateModal from "../components/ConvertToTemplateModal.js";
import WebhookManager from "../components/WebhookManager.js";
import { getCurrentUser } from "../utils/user.js";

export default function ProjectLayout() {
  const { id } = useParams<{ id: string }>();
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isWebhookManagerOpen, setIsWebhookManagerOpen] = useState(false);
  const currentUser = getCurrentUser();

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => api.get(`/projects/${id}`).then((res) => res.data),
    enabled: !!id,
  });

  const isOwnerOrAdmin =
    currentUser?.role === "ADMIN" ||
    currentUser?.role === "SUPERADMIN" ||
    currentUser?.id === project?.ownerId;

  const navLinks = [
    { to: `/projects/${id}/tasks`, label: "Tarefas" },
    { to: `/projects/${id}/board`, label: "Board" },
    { to: `/projects/${id}/gantt`, label: "Gantt" },
    { to: `/projects/${id}/calendar`, label: "Calendário" },
    { to: `/projects/${id}/sprints`, label: "Sprints" },
    { to: `/projects/${id}/people`, label: "Pessoas" },
    { to: `/projects/${id}/resources`, label: "Recursos" },
    { to: `/projects/${id}/reports/financial`, label: "Financeiro" },
    { to: `/projects/${id}/reports/hours`, label: "Horas" },
  ];

  return (
    <div className="min-h-screen bg-surface text-primary transition-colors duration-200">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {project && (
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-100">{project.name}</h1>
              {project.description && (
                <p className="text-gray-400 mt-2">{project.description}</p>
              )}
            </div>
            {isOwnerOrAdmin && (
              <div className="flex gap-2">
                <button
                  onClick={() => setIsWebhookManagerOpen(true)}
                  className="px-4 py-2 bg-green-700 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
                  title="Gerenciar webhooks"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
                    />
                  </svg>
                  Webhooks
                </button>
                <button
                  onClick={() => setIsConvertModalOpen(true)}
                  className="px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-600 flex items-center gap-2"
                  title="Converter projeto em template"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z"
                    />
                  </svg>
                  Converter em Template
                </button>
              </div>
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

      {project && (
        <>
          <ConvertToTemplateModal
            projectId={project.id}
            projectName={project.name}
            isOpen={isConvertModalOpen}
            onClose={() => setIsConvertModalOpen(false)}
          />
          <WebhookManager
            projectId={project.id}
            isOpen={isWebhookManagerOpen}
            onClose={() => setIsWebhookManagerOpen(false)}
          />
        </>
      )}
    </div>
  );
}

