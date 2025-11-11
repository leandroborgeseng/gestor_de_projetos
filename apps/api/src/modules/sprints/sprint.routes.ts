import { Router } from "express";
import {
  getSprints,
  createSprint,
  getSprint,
  updateSprint,
  deleteSprint,
  addTaskToSprint,
  removeTaskFromSprint,
  getSprintBurndown,
  cloneSprint,
} from "./sprint.controller.js";
import { getSprintVelocity, getProjectVelocity } from "./velocity.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /projects/{projectId}/sprints:
 *   get:
 *     summary: Lista todas as sprints de um projeto
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Lista de sprints
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Sprint"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/:projectId/sprints", getSprints);

/**
 * @swagger
 * /projects/{projectId}/sprints:
 *   post:
 *     summary: Cria uma nova sprint
 *     tags: [Sprints]
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
 *               - name
 *               - startDate
 *               - endDate
 *             properties:
 *               name:
 *                 type: string
 *               goal:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Sprint criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Sprint"
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.post("/:projectId/sprints", createSprint);

/**
 * @swagger
 * /projects/sprints/{id}:
 *   get:
 *     summary: Busca uma sprint específica
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sprint
 *     responses:
 *       200:
 *         description: Dados da sprint
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Sprint"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/sprints/:id", getSprint);

/**
 * @swagger
 * /projects/sprints/{id}:
 *   patch:
 *     summary: Atualiza uma sprint
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sprint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               goal:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Sprint atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Sprint"
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.patch("/sprints/:id", updateSprint);

/**
 * @swagger
 * /projects/sprints/{id}:
 *   delete:
 *     summary: Deleta uma sprint
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sprint
 *     responses:
 *       204:
 *         description: Sprint deletada com sucesso
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.delete("/sprints/:id", deleteSprint);

router.post("/sprints/:id/tasks", addTaskToSprint);
router.delete("/sprints/tasks/:taskId", removeTaskFromSprint);

/**
 * @swagger
 * /projects/sprints/{id}/burndown:
 *   get:
 *     summary: Obtém dados do burndown chart de uma sprint
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sprint
 *     responses:
 *       200:
 *         description: Dados do burndown chart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sprint:
 *                   $ref: "#/components/schemas/Sprint"
 *                 burndown:
 *                   type: array
 *                   items:
 *                     type: object
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/sprints/:id/burndown", getSprintBurndown);

/**
 * @swagger
 * /projects/sprints/{id}/clone:
 *   post:
 *     summary: Clona uma sprint
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sprint a ser clonada
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               includeTasks:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Sprint clonada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Sprint"
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.post("/sprints/:id/clone", cloneSprint);

// Rotas de velocity
/**
 * @swagger
 * /projects/sprints/{id}/velocity:
 *   get:
 *     summary: Obtém a velocity de uma sprint específica
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da sprint
 *     responses:
 *       200:
 *         description: Dados de velocity da sprint
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 velocity:
 *                   type: number
 *                 plannedHours:
 *                   type: number
 *                 actualHours:
 *                   type: number
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/sprints/:id/velocity", getSprintVelocity);

/**
 * @swagger
 * /projects/{projectId}/velocity:
 *   get:
 *     summary: Obtém a velocity de todas as sprints de um projeto
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     responses:
 *       200:
 *         description: Dados de velocity do projeto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 velocityHistory:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/:projectId/velocity", getProjectVelocity);

