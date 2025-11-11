import { Router } from "express";
import {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  createDependency,
  deleteDependency,
  getTaskDependencies,
} from "./task.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /projects/{projectId}/tasks:
 *   get:
 *     summary: Lista todas as tarefas de um projeto
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED]
 *         description: Filtrar por status
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
 *         description: Lista de tarefas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/Task"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/:projectId/tasks", getTasks);

/**
 * @swagger
 * /projects/{projectId}/tasks:
 *   post:
 *     summary: Cria uma nova tarefa
 *     tags: [Tasks]
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED]
 *               estimateHours:
 *                 type: number
 *               assigneeId:
 *                 type: string
 *               sprintId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Tarefa criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Task"
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.post("/:projectId/tasks", createTask);

/**
 * @swagger
 * /projects/tasks/{id}:
 *   get:
 *     summary: Busca uma tarefa específica
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da tarefa
 *     responses:
 *       200:
 *         description: Dados da tarefa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Task"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/tasks/:id", getTask);

/**
 * @swagger
 * /projects/tasks/{id}:
 *   patch:
 *     summary: Atualiza uma tarefa
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da tarefa
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [BACKLOG, TODO, IN_PROGRESS, REVIEW, DONE, BLOCKED]
 *               estimateHours:
 *                 type: number
 *               actualHours:
 *                 type: number
 *               assigneeId:
 *                 type: string
 *               sprintId:
 *                 type: string
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Tarefa atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/Task"
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.patch("/tasks/:id", updateTask);

/**
 * @swagger
 * /projects/tasks/{id}:
 *   delete:
 *     summary: Deleta uma tarefa
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID da tarefa
 *     responses:
 *       204:
 *         description: Tarefa deletada com sucesso
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.delete("/tasks/:id", deleteTask);

// Rotas de dependências
router.post("/tasks/dependencies", createDependency);
router.delete("/dependencies/:id", deleteDependency);
router.get("/tasks/:id/dependencies", getTaskDependencies);

