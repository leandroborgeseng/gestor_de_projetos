import { Router } from "express";
import {
  getActivities,
  getEntityActivities,
  getActivity,
} from "./activity.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", getActivities);
router.get("/:entityType/:entityId", getEntityActivities);
router.get("/:id", getActivity);

