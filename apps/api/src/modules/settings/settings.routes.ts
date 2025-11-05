import { Router } from "express";
import {
  getSettings,
  updateSettings,
  updatePermissions,
} from "./settings.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", getSettings);
router.put("/", updateSettings);
router.put("/permissions", updatePermissions);

