import { Router } from "express";
import {
  getProjects,
  getProjectsSummary,
  searchAll,
  getTasksByStatus,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  archiveProject,
  unarchiveProject,
} from "./project.controller.js";
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} from "./project-members.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/search", searchAll);
router.get("/summary", getProjectsSummary);
router.get("/tasks-by-status", getTasksByStatus);
router.get("/", getProjects);
router.post("/", createProject);
router.get("/:id", getProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);
router.post("/:id/archive", archiveProject);
router.post("/:id/unarchive", unarchiveProject);

// Rotas de membros do projeto
router.get("/:projectId/members", getProjectMembers);
router.post("/:projectId/members", addProjectMember);
router.patch("/:projectId/members/:memberId", updateProjectMember);
router.delete("/:projectId/members/:memberId", removeProjectMember);

