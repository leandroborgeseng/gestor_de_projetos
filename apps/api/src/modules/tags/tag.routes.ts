import { Router } from "express";
import {
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTaskTags,
  addTagToTask,
  removeTagFromTask,
} from "./tag.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: Gestão de tags e categorias para tarefas
 */

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: Lista todas as tags
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filtrar por projeto
 *     responses:
 *       200:
 *         description: Lista de tags
 */
router.get("/", getTags);

/**
 * @swagger
 * /tags:
 *   post:
 *     summary: Cria uma nova tag
 *     tags: [Tags]
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
 *               - color
 *             properties:
 *               name:
 *                 type: string
 *               color:
 *                 type: string
 *               projectId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tag criada
 */
router.post("/", createTag);

/**
 * @swagger
 * /tags/{id}:
 *   patch:
 *     summary: Atualiza uma tag
 *     tags: [Tags]
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
 *               color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tag atualizada
 */
router.patch("/:id", updateTag);

/**
 * @swagger
 * /tags/{id}:
 *   delete:
 *     summary: Deleta uma tag
 *     tags: [Tags]
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
 *         description: Tag deletada
 */
router.delete("/:id", deleteTag);

/**
 * @swagger
 * /tags/tasks/{taskId}:
 *   get:
 *     summary: Lista tags de uma tarefa
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de tags da tarefa
 */
router.get("/tasks/:taskId", getTaskTags);

/**
 * @swagger
 * /tags/tasks/{taskId}:
 *   post:
 *     summary: Adiciona uma tag a uma tarefa
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tagId
 *             properties:
 *               tagId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tag adicionada à tarefa
 */
router.post("/tasks/:taskId", addTagToTask);

/**
 * @swagger
 * /tags/tasks/{taskId}/{tagId}:
 *   delete:
 *     summary: Remove uma tag de uma tarefa
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Tag removida da tarefa
 */
router.delete("/tasks/:taskId/:tagId", removeTagFromTask);

