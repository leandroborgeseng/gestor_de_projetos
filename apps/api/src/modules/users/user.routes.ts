import { Router } from "express";
import { 
  getUsers, 
  createUser, 
  getUser, 
  updateUser, 
  deleteUser,
  getCurrentUser,
  updateCurrentUser,
  getCepInfo,
  resetUserPassword,
} from "./user.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

router.get("/cep", getCepInfo);
router.get("/me", getCurrentUser);
router.patch("/me", updateCurrentUser);
router.get("/", getUsers);
router.post("/", createUser);
router.get("/:id", getUser);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);
router.post("/:id/reset-password", resetUserPassword);

