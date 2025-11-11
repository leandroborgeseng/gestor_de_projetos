import { Router } from "express";
import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
} from "./comment.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/tasks/:taskId", getTaskComments);
router.post("/tasks/:taskId", createComment);
router.patch("/:id", updateComment);
router.delete("/:id", deleteComment);

