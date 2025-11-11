import { Router } from "express";
import { financialSummary, ganttData } from "./financial.controller.js";
import {
  exportFinancialExcel,
  exportFinancialCSV,
  exportTasksExcel,
  exportTasksCSV,
} from "./export.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/:id/reports/financial", financialSummary);
router.get("/:id/gantt", ganttData);

// Rotas de exportação
router.get("/:id/export/financial/excel", exportFinancialExcel);
router.get("/:id/export/financial/csv", exportFinancialCSV);
router.get("/:id/export/tasks/excel", exportTasksExcel);
router.get("/:id/export/tasks/csv", exportTasksCSV);

