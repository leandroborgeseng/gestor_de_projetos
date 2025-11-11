import { Router } from "express";
import {
  getWebhooks,
  getWebhook,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookLogs,
} from "./webhook.controller.js";
import { authMiddleware } from "../../auth/middleware.js";
import { webhookLimiter } from "../../middleware/rateLimiter.js";

export const router = Router();

router.use(authMiddleware);
router.use(webhookLimiter);

/**
 * @swagger
 * /webhooks:
 *   get:
 *     summary: Lista todos os webhooks do usuário
 *     tags: [Webhooks]
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
 *         description: Lista de webhooks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   url:
 *                     type: string
 *                   events:
 *                     type: array
 *                     items:
 *                       type: string
 *                   active:
 *                     type: boolean
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/", getWebhooks);

/**
 * @swagger
 * /webhooks/{id}:
 *   get:
 *     summary: Busca um webhook específico
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do webhook
 *     responses:
 *       200:
 *         description: Dados do webhook
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/:id", getWebhook);

/**
 * @swagger
 * /webhooks:
 *   post:
 *     summary: Cria um novo webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *               - events
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               secret:
 *                 type: string
 *               description:
 *                 type: string
 *               active:
 *                 type: boolean
 *                 default: true
 *               projectId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Webhook criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.post("/", createWebhook);

/**
 * @swagger
 * /webhooks/{id}:
 *   put:
 *     summary: Atualiza um webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do webhook
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *               secret:
 *                 type: string
 *               description:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Webhook atualizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.put("/:id", updateWebhook);

/**
 * @swagger
 * /webhooks/{id}:
 *   delete:
 *     summary: Deleta um webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do webhook
 *     responses:
 *       200:
 *         description: Webhook deletado com sucesso
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.delete("/:id", deleteWebhook);

/**
 * @swagger
 * /webhooks/{id}/logs:
 *   get:
 *     summary: Lista logs de um webhook
 *     tags: [Webhooks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do webhook
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Limite de resultados
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Offset para paginação
 *     responses:
 *       200:
 *         description: Lista de logs do webhook
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *       404:
 *         $ref: "#/components/responses/NotFoundError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/:id/logs", getWebhookLogs);

