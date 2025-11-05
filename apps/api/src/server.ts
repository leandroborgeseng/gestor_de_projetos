import express from "express";
import cors from "cors";
import morgan from "morgan";
import { router as authRoutes } from "./modules/auth/auth.routes.js";
import { router as userRoutes } from "./modules/users/user.routes.js";
import { router as projectRoutes } from "./modules/projects/project.routes.js";
import { router as sprintRoutes } from "./modules/sprints/sprint.routes.js";
import { router as taskRoutes } from "./modules/tasks/task.routes.js";
import { router as kanbanRoutes } from "./modules/kanban/kanban.routes.js";
import { router as resourceRoutes } from "./modules/resources/resource.routes.js";
import { router as timeRoutes } from "./modules/time/time.routes.js";
import { router as financialRoutes } from "./modules/reports/financial.routes.js";
import { router as settingsRoutes } from "./modules/settings/settings.routes.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/projects", sprintRoutes);
app.use("/projects", taskRoutes);
app.use("/projects", kanbanRoutes);
app.use("/projects", financialRoutes);
app.use("/resources", resourceRoutes);
app.use("/time", timeRoutes);
app.use("/settings", settingsRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

