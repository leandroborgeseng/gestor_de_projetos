import { Router } from "express";
import {
  getSkills,
  createSkill,
  getSkill,
  updateSkill,
  deleteSkill,
} from "./skill.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", getSkills);
router.post("/", createSkill);
router.get("/:id", getSkill);
router.patch("/:id", updateSkill);
router.delete("/:id", deleteSkill);

