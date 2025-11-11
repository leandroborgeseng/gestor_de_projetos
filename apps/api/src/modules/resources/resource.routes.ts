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

/**
 * @swagger
 * tags:
 *   name: Resources
 *   description: Gestão de recursos (materiais, serviços, etc)
 */

/**
 * @swagger
 * /resources:
 *   get:
 *     summary: Lista todos os recursos
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de recursos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   type:
 *                     type: string
 *                   unitCost:
 *                     type: number
 *                   unit:
 *                     type: string
 */
router.get("/", getResources);

/**
 * @swagger
 * /resources:
 *   post:
 *     summary: Cria um novo recurso
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - unitCost
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *               unitCost:
 *                 type: number
 *               unit:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Recurso criado
 */
router.post("/", createResource);

/**
 * @swagger
 * /resources/{id}:
 *   get:
 *     summary: Obtém um recurso específico
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados do recurso
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 */
router.get("/:id", getResource);

/**
 * @swagger
 * /resources/{id}:
 *   patch:
 *     summary: Atualiza um recurso
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               unitCost:
 *                 type: number
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Recurso atualizado
 */
router.patch("/:id", updateResource);

/**
 * @swagger
 * /resources/{id}:
 *   delete:
 *     summary: Deleta um recurso
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Recurso deletado
 */
router.delete("/:id", deleteResource);

