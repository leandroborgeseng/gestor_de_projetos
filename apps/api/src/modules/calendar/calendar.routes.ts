import { Router } from "express";
import {
  exportTasksToICal,
  exportSprintsToICal,
  getCalendarData,
  importTasksFromICal,
} from "./calendar.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /calendar/projects/{projectId}/tasks/export:
 *   get:
 *     summary: Exportar tarefas do projeto para iCal
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *         description: Filtrar por responsável
 *       - in: query
 *         name: sprintId
 *         schema:
 *           type: string
 *         description: Filtrar por sprint
 *     responses:
 *       200:
 *         description: Arquivo iCal
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 */
router.get("/projects/:projectId/tasks/export", exportTasksToICal);

/**
 * @swagger
 * /calendar/projects/{projectId}/sprints/export:
 *   get:
 *     summary: Exportar sprints do projeto para iCal
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Arquivo iCal
 *         content:
 *           text/calendar:
 *             schema:
 *               type: string
 */
router.get("/projects/:projectId/sprints/export", exportSprintsToICal);

/**
 * @swagger
 * /calendar/projects/{projectId}/data:
 *   get:
 *     summary: Buscar dados de calendário (tarefas e sprints)
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início do período
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim do período
 *       - in: query
 *         name: assigneeId
 *         schema:
 *           type: string
 *         description: Filtrar por responsável
 *     responses:
 *       200:
 *         description: Dados de calendário
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tasks:
 *                   type: array
 *                   items:
 *                     type: object
 *                 sprints:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get("/projects/:projectId/data", getCalendarData);

/**
 * @swagger
 * /calendar/projects/{projectId}/tasks/import:
 *   post:
 *     summary: Importa tarefas de um arquivo iCal
 *     tags: [Calendar]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Conteúdo do arquivo iCal (.ics)
 *     responses:
 *       200:
 *         description: Tarefas importadas com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tasks:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Task"
 *                 total:
 *                   type: integer
 *                 imported:
 *                   type: integer
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 */
router.post("/projects/:projectId/tasks/import", importTasksFromICal);

