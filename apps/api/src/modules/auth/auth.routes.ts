import { Router } from "express";
import { register, login, refresh } from "./auth.controller.js";

export const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);

