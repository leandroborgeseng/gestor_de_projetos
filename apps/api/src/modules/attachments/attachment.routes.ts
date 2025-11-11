import { Router } from "express";
import {
  getTaskAttachments,
  uploadAttachment,
  deleteAttachment,
  downloadAttachment,
} from "./attachment.controller.js";
import { authMiddleware } from "../../auth/middleware.js";
import { upload } from "../../config/upload.js";
import { uploadLimiter } from "../../middleware/rateLimiter.js";

export const router = Router();

router.use(authMiddleware);

router.get("/tasks/:taskId", getTaskAttachments);
router.post("/tasks/:taskId", uploadLimiter, upload.single("file"), uploadAttachment);
router.delete("/:id", deleteAttachment);
router.get("/:id/download", downloadAttachment);

