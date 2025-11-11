import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";
import { queryClient } from "./lib/query.js";
import Login from "./routes/Login.js";
import Projects from "./routes/Projects.js";
import NewProject from "./routes/NewProject.js";
import ProjectLayout from "./routes/ProjectLayout.js";
import Tasks from "./routes/Tasks.js";
import Board from "./routes/Board.js";
import Gantt from "./routes/Gantt.js";
import Calendar from "./routes/Calendar.js";
import Sprints from "./routes/Sprints.js";
import People from "./routes/People.js";
import UsersManagement from "./routes/UsersManagement.js";
import ProjectsManagement from "./routes/ProjectsManagement.js";
import Resources from "./routes/Resources.js";
import ReportsFinancial from "./routes/ReportsFinancial.js";
import ReportsHours from "./routes/ReportsHours.js";
import Settings from "./routes/Settings.js";
import TagsManagement from "./routes/TagsManagement.js";
import Analytics from "./routes/Analytics.js";
import Protected from "./routes/Protected.js";
import CompaniesManagement from "./routes/CompaniesManagement.js";
import ErrorPage from "./components/ErrorPage.js";
import PWAInstallPrompt from "./components/PWAInstallPrompt.js";
import OfflineIndicator from "./components/OfflineIndicator.js";

const router = createBrowserRouter([
  { 
    path: "/login", 
    element: <Login />,
    errorElement: <ErrorPage />,
  },
  {
    path: "/",
    element: <Protected />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Projects />, errorElement: <ErrorPage /> },
      { path: "projects/new", element: <NewProject />, errorElement: <ErrorPage /> },
      { path: "access-management", element: <People />, errorElement: <ErrorPage /> },
      { path: "users-management", element: <UsersManagement />, errorElement: <ErrorPage /> },
      { path: "companies", element: <CompaniesManagement />, errorElement: <ErrorPage /> },
      { path: "projects-management", element: <ProjectsManagement />, errorElement: <ErrorPage /> },
      { path: "tags-management", element: <TagsManagement />, errorElement: <ErrorPage /> },
      { path: "analytics", element: <Analytics />, errorElement: <ErrorPage /> },
      { path: "settings", element: <Settings />, errorElement: <ErrorPage /> },
      // Redirecionar rota antiga de skills
      { path: "skills", element: <Navigate to="/" replace /> },
      {
        path: "projects/:id",
        element: <ProjectLayout />,
        errorElement: <ErrorPage />,
        children: [
          { index: true, element: <Tasks />, errorElement: <ErrorPage /> },
          { path: "tasks", element: <Tasks />, errorElement: <ErrorPage /> },
          { path: "board", element: <Board />, errorElement: <ErrorPage /> },
          { path: "gantt", element: <Gantt />, errorElement: <ErrorPage /> },
          { path: "calendar", element: <Calendar />, errorElement: <ErrorPage /> },
          { path: "sprints", element: <Sprints />, errorElement: <ErrorPage /> },
          { path: "people", element: <People />, errorElement: <ErrorPage /> },
          { path: "resources", element: <Resources />, errorElement: <ErrorPage /> },
          { path: "reports/financial", element: <ReportsFinancial />, errorElement: <ErrorPage /> },
          { path: "reports/hours", element: <ReportsHours />, errorElement: <ErrorPage /> },
        ],
      },
      // Rota catch-all para 404
      { path: "*", element: <ErrorPage /> },
    ],
  },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OfflineIndicator />
      <RouterProvider router={router} />
      <PWAInstallPrompt />
    </QueryClientProvider>
  );
}

