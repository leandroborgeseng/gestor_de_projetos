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
  importFromMondayExcel,
  importTasksFromExcel,
  inspectMondayExcel,
  downloadImportTemplate,
  generatePublicReportTokenEndpoint,
  getPublicProjectReport,
} from "./project.controller.js";
import {
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
} from "./project-members.controller.js";
import { authMiddleware } from "../../auth/middleware.js";
import { upload } from "../../config/upload.js";
import { uploadLimiter } from "../../middleware/rateLimiter.js";

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

/**
 * @swagger
 * /projects/import/monday:
 *   post:
 *     summary: Importar projeto e tarefas de arquivo Excel do Monday.com
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - projectName
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo Excel exportado do Monday.com
 *               projectName:
 *                 type: string
 *                 description: Nome do projeto a ser criado
 *               projectDescription:
 *                 type: string
 *                 description: Descrição do projeto
 *               defaultHourlyRate:
 *                 type: number
 *                 description: Taxa horária padrão do projeto
 *     responses:
 *       201:
 *         description: Projeto e tarefas importados com sucesso
 *       400:
 *         description: Dados inválidos ou arquivo inválido
 */
router.post("/import/monday", uploadLimiter, upload.single("file"), importFromMondayExcel);

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

/**
 * @swagger
 * /projects/{id}/import/tasks:
 *   post:
 *     summary: Importar tarefas de arquivo Excel do Monday.com para projeto existente
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID do projeto
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo Excel exportado do Monday.com
 *     responses:
 *       200:
 *         description: Tarefas importadas com sucesso
 *       400:
 *         description: Dados inválidos ou arquivo inválido
 */
router.post("/:projectId/import/tasks", uploadLimiter, upload.single("file"), importTasksFromExcel);

/**
 * @swagger
 * /projects/import/template:
 *   get:
 *     summary: Download de template Excel para importação de tarefas
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Arquivo Excel template
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get("/import/template", downloadImportTemplate);

/**
 * @swagger
 * /projects/{id}/public-report-token:
 *   post:
 *     summary: Gerar ou regenerar token de acesso público ao relatório
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
 *         description: Token gerado com sucesso
 *       404:
 *         description: Projeto não encontrado
 */
router.post("/:projectId/public-report-token", generatePublicReportTokenEndpoint);

/**
 * @swagger
 * /projects/inspect/monday:
 *   post:
 *     summary: Inspecionar formato de arquivo Excel do Monday.com (debug)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Arquivo Excel exportado do Monday.com
 *     responses:
 *       200:
 *         description: Informações sobre o formato do arquivo
 *       400:
 *         description: Arquivo inválido
 */
router.post("/inspect/monday", uploadLimiter, upload.single("file"), inspectMondayExcel);

// Rotas de membros do projeto
router.get("/:projectId/members", getProjectMembers);
router.post("/:projectId/members", addProjectMember);
router.patch("/:projectId/members/:memberId", updateProjectMember);
router.delete("/:projectId/members/:memberId", removeProjectMember);

