import { Router } from "express";
import { getAlerts, getAlertConfig, updateAlertConfig } from "./alert.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/", getAlerts);
router.get("/config", getAlertConfig);
router.put("/config", updateAlertConfig);

