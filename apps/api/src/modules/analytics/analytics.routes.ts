import { Router } from "express";
import {
  getProductivityMetrics,
  getCostMetrics,
  getTimeMetrics,
  getQualityMetrics,
  getActivityHeatmap,
  compareProjects,
} from "./analytics.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /analytics/productivity:
 *   get:
 *     summary: Obtém métricas de produtividade
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filtrar por projeto
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim
 *     responses:
 *       200:
 *         description: Métricas de produtividade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 general:
 *                   type: object
 *                 byMember:
 *                   type: array
 *                 bySprint:
 *                   type: array
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/productivity", getProductivityMetrics);

/**
 * @swagger
 * /analytics/costs:
 *   get:
 *     summary: Obtém métricas de custos
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filtrar por projeto
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim
 *     responses:
 *       200:
 *         description: Métricas de custos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: object
 *                 byProject:
 *                   type: array
 *                 byMember:
 *                   type: array
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/costs", getCostMetrics);

/**
 * @swagger
 * /analytics/time:
 *   get:
 *     summary: Obtém métricas de tempo
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filtrar por projeto
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim
 *     responses:
 *       200:
 *         description: Métricas de tempo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 byStatus:
 *                   type: array
 *                 byMember:
 *                   type: array
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/time", getTimeMetrics);

/**
 * @swagger
 * /analytics/quality:
 *   get:
 *     summary: Obtém métricas de qualidade
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filtrar por projeto
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim
 *     responses:
 *       200:
 *         description: Métricas de qualidade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 general:
 *                   type: object
 *                 bySprint:
 *                   type: array
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/quality", getQualityMetrics);

/**
 * @swagger
 * /analytics/activity-heatmap:
 *   get:
 *     summary: Obtém heatmap de atividade
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         description: Filtrar por projeto
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de início
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Data de fim
 *     responses:
 *       200:
 *         description: Heatmap de atividade
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 heatmap:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/activity-heatmap", getActivityHeatmap);

/**
 * @swagger
 * /analytics/compare-projects:
 *   get:
 *     summary: Compara métricas entre projetos
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: projectIds
 *         required: true
 *         schema:
 *           type: string
 *         description: IDs dos projetos separados por vírgula
 *     responses:
 *       200:
 *         description: Comparação entre projetos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comparison:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         $ref: "#/components/responses/BadRequestError"
 *       401:
 *         $ref: "#/components/responses/UnauthorizedError"
 */
router.get("/compare-projects", compareProjects);

