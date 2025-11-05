import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { queryClient } from "./lib/query.js";
import Login from "./routes/Login.js";
import Projects from "./routes/Projects.js";
import NewProject from "./routes/NewProject.js";
import ProjectLayout from "./routes/ProjectLayout.js";
import Tasks from "./routes/Tasks.js";
import Board from "./routes/Board.js";
import Gantt from "./routes/Gantt.js";
import Sprints from "./routes/Sprints.js";
import People from "./routes/People.js";
import UsersManagement from "./routes/UsersManagement.js";
import ProjectsManagement from "./routes/ProjectsManagement.js";
import Resources from "./routes/Resources.js";
import ReportsFinancial from "./routes/ReportsFinancial.js";
import Settings from "./routes/Settings.js";
import Protected from "./routes/Protected.js";

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
      {
        path: "/",
        element: <Protected />,
        children: [
          { index: true, element: <Projects /> },
          { path: "projects/new", element: <NewProject /> },
          { path: "access-management", element: <People /> },
          { path: "users-management", element: <UsersManagement /> },
          { path: "projects-management", element: <ProjectsManagement /> },
          { path: "settings", element: <Settings /> },
          {
            path: "projects/:id",
            element: <ProjectLayout />,
            children: [
              { index: true, element: <Tasks /> },
              { path: "tasks", element: <Tasks /> },
              { path: "board", element: <Board /> },
              { path: "gantt", element: <Gantt /> },
              { path: "sprints", element: <Sprints /> },
              { path: "people", element: <People /> },
              { path: "resources", element: <Resources /> },
              { path: "reports/financial", element: <ReportsFinancial /> },
            ],
          },
        ],
      },
]);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

