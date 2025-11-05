import { Router } from "express";
import {
  getResources,
  createResource,
  getResource,
  updateResource,
  deleteResource,
} from "./resource.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", getResources);
router.post("/", createResource);
router.get("/:id", getResource);
router.patch("/:id", updateResource);
router.delete("/:id", deleteResource);

