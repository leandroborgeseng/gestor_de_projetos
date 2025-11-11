import { Router } from "express";
import {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  addCompanyUser,
  updateCompanyUser,
  removeCompanyUser,
  uploadCompanyLogo,
  deleteCompanyLogo,
} from "./company.controller.js";
import { authMiddleware } from "../../auth/middleware.js";
import { upload } from "../../config/upload.js";
import { uploadLimiter, writeLimiter } from "../../middleware/rateLimiter.js";

export const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Companies
 *   description: Gestão de empresas (multi-tenant)
 */

router.get("/", listCompanies);
router.post("/", writeLimiter, createCompany);
router.get("/:id", getCompany);
router.patch("/:id", writeLimiter, updateCompany);
router.delete("/:id", writeLimiter, deleteCompany);

router.post("/:id/users", writeLimiter, addCompanyUser);
router.patch("/:id/users/:userId", writeLimiter, updateCompanyUser);
router.delete("/:id/users/:userId", writeLimiter, removeCompanyUser);

router.post("/:id/logo", uploadLimiter, upload.single("logo"), uploadCompanyLogo);
router.delete("/:id/logo", deleteCompanyLogo);
