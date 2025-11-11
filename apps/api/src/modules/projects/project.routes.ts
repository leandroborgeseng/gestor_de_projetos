import { Router } from "express";
import {
  getProjects,
  getProjectsSummary,
  searchAll,
  getTasksByStatus,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  archiveProject,
  unarchiveProject,
  cloneProject,
} from "./project.controller.js";
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} from "./project-members.controller.js";
import { authMiddleware } from "../../auth/middleware.js";

export const router = Router();

router.use(authMiddleware);

/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Listar projetos
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número da página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Itens por página
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Busca por nome
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *         description: Filtrar por arquivados
 *     responses:
 *       200:
 *         description: Lista de projetos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Project'
 *                 pagination:
 *                   type: object
 */
router.get("/", getProjects);

/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Criar novo projeto
 *     tags: [Projects]
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
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               defaultHourlyRate:
 *                 type: number
 *                 format: decimal
 *     responses:
 *       201:
 *         description: Projeto criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dados inválidos
 */
router.post("/", createProject);

router.get("/summary", getProjectsSummary);
router.get("/search", searchAll);
router.get("/tasks-by-status", getTasksByStatus);

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Buscar projeto por ID
 *     tags: [Projects]
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
 *         description: Detalhes do projeto
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       404:
 *         description: Projeto não encontrado
 */
router.get("/:id", getProject);

/**
 * @swagger
 * /projects/{id}:
 *   patch:
 *     summary: Atualizar projeto
 *     tags: [Projects]
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
 *               description:
 *                 type: string
 *               defaultHourlyRate:
 *                 type: number
 *     responses:
 *       200:
 *         description: Projeto atualizado
 *       404:
 *         description: Projeto não encontrado
 */
router.patch("/:id", updateProject);

/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Deletar projeto
 *     tags: [Projects]
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
 *         description: Projeto deletado
 *       404:
 *         description: Projeto não encontrado
 */
router.delete("/:id", deleteProject);

/**
 * @swagger
 * /projects/{id}/archive:
 *   post:
 *     summary: Arquivar projeto
 *     tags: [Projects]
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
 *         description: Projeto arquivado
 */
router.post("/:id/archive", archiveProject);

/**
 * @swagger
 * /projects/{id}/unarchive:
 *   post:
 *     summary: Desarquivar projeto
 *     tags: [Projects]
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
 *         description: Projeto desarquivado
 */
router.post("/:id/unarchive", unarchiveProject);

/**
 * @swagger
 * /projects/{id}/clone:
 *   post:
 *     summary: Clonar projeto
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
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
 *               includeMembers:
 *                 type: boolean
 *                 default: true
 *               includeSprints:
 *                 type: boolean
 *                 default: true
 *               includeColumns:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Projeto clonado com sucesso
 */
router.post("/:id/clone", cloneProject);

// Rotas de membros do projeto
router.get("/:projectId/members", getProjectMembers);
router.post("/:projectId/members", addProjectMember);
router.patch("/:projectId/members/:memberId", updateProjectMember);
router.delete("/:projectId/members/:memberId", removeProjectMember);

