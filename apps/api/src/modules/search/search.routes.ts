import { Router } from "express";
import { globalSearch } from "./search.controller.js";
import { authMiddleware } from "../../auth/middleware.js";
import { searchLimiter } from "../../middleware/rateLimiter.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", searchLimiter, globalSearch);

