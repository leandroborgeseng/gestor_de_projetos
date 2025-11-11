import { Router } from "express";
import {
  getFilters,
  getFilter,
  createFilter,
  updateFilter,
  deleteFilter,
  getQuickFilters,
} from "./filter.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", getFilters);
router.get("/quick", getQuickFilters);
router.get("/:id", getFilter);
router.post("/", createFilter);
router.put("/:id", updateFilter);
router.delete("/:id", deleteFilter);

