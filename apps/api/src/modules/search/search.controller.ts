import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
}

async function ensureMembership(companyId: string, userId?: string) {
  if (!userId) {
    throw Object.assign(new Error("Não autenticado"), { statusCode: 401 });
  }

  const membership = await prisma.companyUser.findUnique({
    where: {
      companyId_userId: {
        companyId,
        userId,
      },
    },
  });

  if (!membership) {
    throw Object.assign(new Error("Usuário não pertence à empresa"), { statusCode: 403 });
  }

  return membership;
}

export async function globalSearch(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    await ensureMembership(companyId, userId);

    const {
      q,
      type,
      status,
      assigneeId,
      projectId,
      startDate,
      endDate,
      limit = "20",
    } = req.query as {
      q?: string;
      type?: "task" | "project" | "user" | "comment" | "all";
      status?: string;
      assigneeId?: string;
      projectId?: string;
      startDate?: string;
      endDate?: string;
      limit?: string;
    };

    if (!q || q.trim().length === 0) {
      return res.json({
        tasks: [],
        projects: [],
        users: [],
        comments: [],
      });
    }

    const searchTerm = q.trim();
    const maxResults = parseInt(limit, 10) || 20;

    const results: {
      tasks: any[];
      projects: any[];
      users: any[];
      comments: any[];
    } = {
      tasks: [],
      projects: [],
      users: [],
      comments: [],
    };

    // Buscar tarefas
    if (!type || type === "task" || type === "all") {
      const taskWhere: any = {
        OR: [
          { title: { contains: searchTerm, mode: "insensitive" as const } },
          { description: { contains: searchTerm, mode: "insensitive" as const } },
        ],
        project: {
          companyId,
        },
      };

      if (status) taskWhere.status = status;
      if (assigneeId) {
        await ensureMembership(companyId, assigneeId);
        taskWhere.assigneeId = assigneeId;
      }
      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, companyId },
          select: { id: true },
        });
        if (!project) {
          return res.status(404).json({ error: "Projeto não encontrado" });
        }
        taskWhere.projectId = projectId;
      }
      if (startDate || endDate) {
        taskWhere.createdAt = {};
        if (startDate) taskWhere.createdAt.gte = new Date(startDate);
        if (endDate) taskWhere.createdAt.lte = new Date(endDate);
      }

      const tasks = await prisma.task.findMany({
        where: taskWhere,
        take: maxResults,
        include: {
          assignee: {
            select: { id: true, name: true, email: true },
          },
          project: {
            select: { id: true, name: true },
          },
          sprint: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      results.tasks = tasks.map((task) => ({
        id: task.id,
        type: "task",
        title: task.title,
        description: task.description,
        status: task.status,
        project: task.project,
        assignee: task.assignee,
        sprint: task.sprint,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      }));
    }

    // Buscar projetos
    if (!type || type === "project" || type === "all") {
      const projectWhere: any = {
        companyId,
        archived: false,
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" as const } },
          { description: { contains: searchTerm, mode: "insensitive" as const } },
        ],
      };

      if (startDate || endDate) {
        projectWhere.createdAt = {};
        if (startDate) projectWhere.createdAt.gte = new Date(startDate);
        if (endDate) projectWhere.createdAt.lte = new Date(endDate);
      }

      const projects = await prisma.project.findMany({
        where: projectWhere,
        take: maxResults,
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      results.projects = projects.map((project) => ({
        id: project.id,
        type: "project",
        title: project.name,
        description: project.description,
        owner: project.owner,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      }));
    }

    // Buscar usuários
    if (!type || type === "user" || type === "all") {
      const userWhere: any = {
        active: true,
        companyMemberships: {
          some: {
            companyId,
          },
        },
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" as const } },
          { email: { contains: searchTerm, mode: "insensitive" as const } },
          { lastName: { contains: searchTerm, mode: "insensitive" as const } },
          { position: { contains: searchTerm, mode: "insensitive" as const } },
        ],
      };

      const users = await prisma.user.findMany({
        where: userWhere,
        take: maxResults,
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          position: true,
          role: true,
          createdAt: true,
        },
        orderBy: { name: "asc" },
      });

      results.users = users.map((user) => ({
        id: user.id,
        type: "user",
        title: `${user.name} ${user.lastName || ""}`.trim(),
        description: user.email,
        position: user.position,
        role: user.role,
        createdAt: user.createdAt,
      }));
    }

    // Buscar comentários
    if (!type || type === "comment" || type === "all") {
      const commentWhere: any = {
        content: { contains: searchTerm, mode: "insensitive" as const },
        task: {
          project: {
            companyId,
          },
        },
      };

      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: projectId, companyId },
          select: { id: true },
        });
        if (!project) {
          return res.status(404).json({ error: "Projeto não encontrado" });
        }
        commentWhere.task.projectId = projectId;
      }

      const comments = await prisma.comment.findMany({
        where: commentWhere,
        take: maxResults,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          task: {
            select: {
              id: true,
              title: true,
              project: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      results.comments = comments.map((comment) => ({
        id: comment.id,
        type: "comment",
        title: comment.content.substring(0, 100),
        description: comment.content,
        user: comment.user,
        task: comment.task,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      }));
    }

    res.json(results);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

