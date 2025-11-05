import { Router } from "express";
import {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  createDependency,
  deleteDependency,
  getTaskDependencies,
} from "./task.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/:projectId/tasks", getTasks);
router.post("/:projectId/tasks", createTask);
router.get("/tasks/:id", getTask);
router.patch("/tasks/:id", updateTask);
router.delete("/tasks/:id", deleteTask);

// Rotas de dependências
router.post("/tasks/dependencies", createDependency);
router.delete("/dependencies/:id", deleteDependency);
router.get("/tasks/:id/dependencies", getTaskDependencies);

