import { Router } from "express";
import {
  getTimeEntries,
  createTimeEntry,
  deleteTimeEntry,
} from "./time.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", getTimeEntries);
router.post("/", createTimeEntry);
router.delete("/:id", deleteTimeEntry);

