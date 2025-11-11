import { Router } from "express";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  convertProjectToTemplate,
  createProjectFromTemplate,
} from "./template.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", getTemplates);
router.get("/:id", getTemplate);
router.post("/", createTemplate);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);
router.post("/from-project/:projectId", convertProjectToTemplate);
router.post("/:templateId/create-project", createProjectFromTemplate);

