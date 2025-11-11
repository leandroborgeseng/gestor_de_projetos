import { Router } from "express";
import {
  getTimeEntries,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getHoursByProject,
  getHoursByPerson,
} from "./time.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Time
 *   description: Gestão de registros de horas trabalhadas
 */

/**
 * @swagger
 * /time:
 *   get:
 *     summary: Lista registros de horas
 *     tags: [Time]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: taskId
 *         schema:
 *           type: string
 *         description: Filtrar por tarefa
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filtrar por usuário
 *     responses:
 *       200:
 *         description: Lista de registros de horas
 */
router.get("/", getTimeEntries);

/**
 * @swagger
 * /time/by-project:
 *   get:
 *     summary: Obtém horas trabalhadas por projeto
 *     tags: [Time]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Horas agrupadas por projeto
 */
router.get("/by-project", getHoursByProject);

/**
 * @swagger
 * /time/by-person:
 *   get:
 *     summary: Obtém horas trabalhadas por pessoa
 *     tags: [Time]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Horas agrupadas por pessoa
 */
router.get("/by-person", getHoursByPerson);

/**
 * @swagger
 * /time:
 *   post:
 *     summary: Cria um novo registro de horas
 *     tags: [Time]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - hours
 *               - date
 *             properties:
 *               taskId:
 *                 type: string
 *               hours:
 *                 type: number
 *               date:
 *                 type: string
 *                 format: date
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Registro criado
 */
router.post("/", createTimeEntry);

/**
 * @swagger
 * /time/{id}:
 *   patch:
 *     summary: Atualiza um registro de horas
 *     tags: [Time]
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
 *               hours:
 *                 type: number
 *               date:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registro atualizado
 */
router.patch("/:id", updateTimeEntry);

/**
 * @swagger
 * /time/{id}:
 *   delete:
 *     summary: Deleta um registro de horas
 *     tags: [Time]
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
 *         description: Registro deletado
 */
router.delete("/:id", deleteTimeEntry);

