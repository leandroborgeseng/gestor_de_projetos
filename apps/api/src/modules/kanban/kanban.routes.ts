import { Router } from "express";
import {
  getColumns,
  createColumn,
  updateColumn,
  deleteColumn,
} from "./kanban.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/:projectId/columns", getColumns);
router.post("/:projectId/columns", createColumn);
router.patch("/columns/:id", updateColumn);
router.delete("/columns/:id", deleteColumn);

