import { Router } from "express";
import {
  getSprints,
  createSprint,
  getSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  getSprintBurndown,
} from "./sprint.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/:projectId/sprints", getSprints);
router.post("/:projectId/sprints", createSprint);
router.get("/sprints/:id", getSprint);
router.patch("/sprints/:id", updateSprint);
router.delete("/sprints/:id", deleteSprint);
router.post("/sprints/:id/tasks", addTaskToSprint);
router.delete("/sprints/tasks/:taskId", removeTaskFromSprint);
router.get("/sprints/:id/burndown", getSprintBurndown);

