import { Router } from "express";
import { financialSummary, ganttData } from "./financial.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/:id/reports/financial", financialSummary);
router.get("/:id/gantt", ganttData);

