import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { handleError } from "../../utils/errors.js";

function effectiveRate(t: any): number {
  if (t.hourlyRateOverride) return Number(t.hourlyRateOverride);
  if (t.assignee?.hourlyRate) return Number(t.assignee.hourlyRate);
  if (t.project?.defaultHourlyRate) return Number(t.project.defaultHourlyRate);
  return 0;
}

function taskCost(t: any): number {
  if (t.costOverride) return Number(t.costOverride);
  const hours = t.actualHours && t.actualHours > 0 ? Number(t.actualHours) : Number(t.estimateHours ?? 0);
  return hours * effectiveRate(t);
}

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
}

async function ensureMembership(companyId: string, userId: string) {
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

async function ensureProjectAccess(companyId: string, userId: string, projectId?: string) {
  if (!projectId) return;

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId,
    },
    select: { id: true },
  });

  if (!project) {
    throw Object.assign(new Error("Projeto não encontrado"), { statusCode: 404 });
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
    select: { id: true },
  });

  const isOwner = await prisma.project.findFirst({
    where: { id: projectId, ownerId: userId },
    select: { id: true },
  });

  if (!membership && !isOwner) {
    const companyMembership = await prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId,
          userId,
        },
      },
      select: { role: true },
    });

    if (!companyMembership || (companyMembership.role !== "OWNER" && companyMembership.role !== "ADMIN")) {
      throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
    }
  }
}

async function ensureProjectInCompany(projectId: string, companyId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });

  if (!project) {
    throw Object.assign(new Error("Projeto não encontrado"), { statusCode: 404 });
  }
}

function buildTaskWhere(companyId: string, projectId?: string, startDate?: string, endDate?: string) {
  const where: any = {
    project: {
      is: {
        companyId,
      },
    },
  };

  if (projectId) {
    where.projectId = projectId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  return where;
}

/**
 * Métricas agregadas de produtividade
 */
export async function getProductivityMetrics(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureMembership(companyId, userId);

    const { projectId, startDate, endDate } = req.query as {
      projectId?: string;
      startDate?: string;
      endDate?: string;
    };

    if (projectId) {
      await ensureProjectInCompany(projectId, companyId);
    }

    const where = buildTaskWhere(companyId, projectId, startDate, endDate);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: true,
        sprint: true,
        project: true,
      },
    });

    const memberProductivity = new Map<string, {
      name: string;
      completedTasks: number;
      totalTasks: number;
      plannedHours: number;
      actualHours: number;
      velocity: number;
    }>();

    tasks.forEach((task) => {
      if (!task.assignee) return;

      const member = memberProductivity.get(task.assigneeId!) || {
        name: task.assignee.name,
        completedTasks: 0,
        totalTasks: 0,
        plannedHours: 0,
        actualHours: 0,
        velocity: 0,
      };

      member.totalTasks++;
      member.plannedHours += task.estimateHours || 0;
      member.actualHours += task.actualHours || 0;

      if (task.status === "DONE") {
        member.completedTasks++;
        member.velocity += task.actualHours || task.estimateHours || 0;
      }

      memberProductivity.set(task.assigneeId!, member);
    });

    const sprintProductivity = new Map<string, {
      sprintName: string;
      completedTasks: number;
      totalTasks: number;
      plannedHours: number;
      actualHours: number;
      velocity: number;
    }>();

    tasks.forEach((task) => {
      if (!task.sprint) return;

      const sprint = sprintProductivity.get(task.sprintId!) || {
        sprintName: task.sprint.name,
        completedTasks: 0,
        totalTasks: 0,
        plannedHours: 0,
        actualHours: 0,
        velocity: 0,
      };

      sprint.totalTasks++;
      sprint.plannedHours += task.estimateHours || 0;
      sprint.actualHours += task.actualHours || 0;

      if (task.status === "DONE") {
        sprint.completedTasks++;
        sprint.velocity += task.actualHours || task.estimateHours || 0;
      }

      sprintProductivity.set(task.sprintId!, sprint);
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const totalPlannedHours = tasks.reduce((sum, t) => sum + (t.estimateHours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    const efficiency = totalPlannedHours > 0 ? (totalActualHours / totalPlannedHours) * 100 : 0;

    res.json({
      general: {
        totalTasks,
        completedTasks,
        totalPlannedHours: Math.round(totalPlannedHours * 100) / 100,
        totalActualHours: Math.round(totalActualHours * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        efficiency: Math.round(efficiency * 100) / 100,
      },
      byMember: Array.from(memberProductivity.values()).map((m) => ({
        ...m,
        plannedHours: Math.round(m.plannedHours * 100) / 100,
        actualHours: Math.round(m.actualHours * 100) / 100,
        velocity: Math.round(m.velocity * 100) / 100,
        completionRate: m.totalTasks > 0 ? Math.round((m.completedTasks / m.totalTasks) * 100 * 100) / 100 : 0,
      })),
      bySprint: Array.from(sprintProductivity.values()).map((s) => ({
        ...s,
        plannedHours: Math.round(s.plannedHours * 100) / 100,
        actualHours: Math.round(s.actualHours * 100) / 100,
        velocity: Math.round(s.velocity * 100) / 100,
        completionRate: s.totalTasks > 0 ? Math.round((s.completedTasks / s.totalTasks) * 100 * 100) / 100 : 0,
      })),
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Métricas de custos agregadas
 */
export async function getCostMetrics(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureMembership(companyId, userId);

    const { projectId, startDate, endDate } = req.query as {
      projectId?: string;
      startDate?: string;
      endDate?: string;
    };

    if (projectId) {
      await ensureProjectInCompany(projectId, companyId);
    }

    const where = buildTaskWhere(companyId, projectId, startDate, endDate);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: true,
        sprint: true,
        project: true,
        resource: true,
      },
    });

    const projectCosts = new Map<string, {
      projectName: string;
      planned: number;
      actual: number;
      variance: number;
    }>();

    const memberCosts = new Map<string, {
      name: string;
      planned: number;
      actual: number;
      variance: number;
    }>();

    let totalPlanned = 0;
    let totalActual = 0;

    tasks.forEach((task) => {
      const planned = (task.estimateHours || 0) * effectiveRate(task);
      const actual = taskCost(task);

      totalPlanned += planned;
      totalActual += actual;

      const project = projectCosts.get(task.projectId) || {
        projectName: task.project.name,
        planned: 0,
        actual: 0,
        variance: 0,
      };
      project.planned += planned;
      project.actual += actual;
      projectCosts.set(task.projectId, project);

      if (task.assignee) {
        const member = memberCosts.get(task.assigneeId!) || {
          name: task.assignee.name,
          planned: 0,
          actual: 0,
          variance: 0,
        };
        member.planned += planned;
        member.actual += actual;
        memberCosts.set(task.assigneeId!, member);
      }
    });

    projectCosts.forEach((project) => {
      project.variance = project.actual - project.planned;
    });

    memberCosts.forEach((member) => {
      member.variance = member.actual - member.planned;
    });

    res.json({
      total: {
        planned: Math.round(totalPlanned * 100) / 100,
        actual: Math.round(totalActual * 100) / 100,
        variance: Math.round((totalActual - totalPlanned) * 100) / 100,
      },
      byProject: Array.from(projectCosts.values()).map((p) => ({
        ...p,
        planned: Math.round(p.planned * 100) / 100,
        actual: Math.round(p.actual * 100) / 100,
        variance: Math.round(p.variance * 100) / 100,
      })),
      byMember: Array.from(memberCosts.values()).map((m) => ({
        ...m,
        planned: Math.round(m.planned * 100) / 100,
        actual: Math.round(m.actual * 100) / 100,
        variance: Math.round(m.variance * 100) / 100,
      })),
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Métricas de tempo
 */
export async function getTimeMetrics(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureMembership(companyId, userId);

    const { projectId, startDate, endDate } = req.query as {
      projectId?: string;
      startDate?: string;
      endDate?: string;
    };

    if (projectId) {
      await ensureProjectInCompany(projectId, companyId);
    }

    const where = buildTaskWhere(companyId, projectId, startDate, endDate);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: true,
        sprint: true,
      },
    });

    const timeByStatus = new Map<string, {
      status: string;
      avgDays: number;
      count: number;
    }>();

    const timeByMember = new Map<string, {
      name: string;
      avgDays: number;
      count: number;
      totalHours: number;
    }>();

    tasks.forEach((task) => {
      if (task.status === "DONE" && task.startDate && task.dueDate) {
        const start = new Date(task.startDate);
        const end = new Date(task.dueDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

        const status = timeByStatus.get(task.status) || {
          status: task.status,
          avgDays: 0,
          count: 0,
        };
        status.avgDays += days;
        status.count++;
        timeByStatus.set(task.status, status);

        if (task.assignee) {
          const member = timeByMember.get(task.assigneeId!) || {
            name: task.assignee.name,
            avgDays: 0,
            count: 0,
            totalHours: 0,
          };
          member.avgDays += days;
          member.count++;
          member.totalHours += task.actualHours || task.estimateHours || 0;
          timeByMember.set(task.assigneeId!, member);
        }
      }
    });

    timeByStatus.forEach((status) => {
      status.avgDays = status.count > 0 ? status.avgDays / status.count : 0;
    });

    timeByMember.forEach((member) => {
      member.avgDays = member.count > 0 ? member.avgDays / member.count : 0;
    });

    res.json({
      byStatus: Array.from(timeByStatus.values()).map((s) => ({
        ...s,
        avgDays: Math.round(s.avgDays * 100) / 100,
      })),
      byMember: Array.from(timeByMember.values()).map((m) => ({
        ...m,
        avgDays: Math.round(m.avgDays * 100) / 100,
        totalHours: Math.round(m.totalHours * 100) / 100,
      })),
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Métricas de qualidade (taxa de retrabalho, bugs, etc)
 */
export async function getQualityMetrics(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureMembership(companyId, userId);

    const { projectId, startDate, endDate } = req.query as {
      projectId?: string;
      startDate?: string;
      endDate?: string;
    };

    if (projectId) {
      await ensureProjectInCompany(projectId, companyId);
    }

    const where = buildTaskWhere(companyId, projectId, startDate, endDate);

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignee: true,
        sprint: true,
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const blockedTasks = tasks.filter((t) => t.status === "BLOCKED").length;

    const sprintQuality = new Map<string, {
      sprintName: string;
      totalTasks: number;
      completedTasks: number;
      blockedTasks: number;
      completionRate: number;
    }>();

    tasks.forEach((task) => {
      if (task.sprint) {
        const sprint = sprintQuality.get(task.sprintId!) || {
          sprintName: task.sprint.name,
          totalTasks: 0,
          completedTasks: 0,
          blockedTasks: 0,
          completionRate: 0,
        };

        sprint.totalTasks++;
        if (task.status === "DONE") sprint.completedTasks++;
        if (task.status === "BLOCKED") sprint.blockedTasks++;

        sprintQuality.set(task.sprintId!, sprint);
      }
    });

    sprintQuality.forEach((sprint) => {
      sprint.completionRate = sprint.totalTasks > 0
        ? (sprint.completedTasks / sprint.totalTasks) * 100
        : 0;
    });

    res.json({
      general: {
        totalTasks,
        completedTasks,
        blockedTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100 * 100) / 100 : 0,
        blockRate: totalTasks > 0 ? Math.round((blockedTasks / totalTasks) * 100 * 100) / 100 : 0,
      },
      bySprint: Array.from(sprintQuality.values()).map((s) => ({
        ...s,
        completionRate: Math.round(s.completionRate * 100) / 100,
      })),
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Heatmap de atividade (tarefas criadas por dia)
 */
export async function getActivityHeatmap(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectId } = req.query as { projectId?: string };
    await ensureProjectAccess(companyId, userId, projectId);

    const where = buildTaskWhere(companyId, projectId, undefined, undefined);

    const tasks = await prisma.task.findMany({
      where,
      select: {
        createdAt: true,
        status: true,
        assigneeId: true,
      },
    });

    const activityByDay = new Map<string, {
      date: string;
      created: number;
      completed: number;
      inProgress: number;
    }>();

    tasks.forEach((task) => {
      const date = new Date(task.createdAt).toISOString().split("T")[0];
      const day = activityByDay.get(date) || {
        date,
        created: 0,
        completed: 0,
        inProgress: 0,
      };

      day.created++;

      if (task.status === "DONE") {
        day.completed++;
      } else if (task.status === "IN_PROGRESS" || task.status === "REVIEW") {
        day.inProgress++;
      }

      activityByDay.set(date, day);
    });

    res.json({
      heatmap: Array.from(activityByDay.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      ),
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Comparação entre projetos
 */
export async function compareProjects(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const projects = await prisma.project.findMany({
      where: { companyId },
      include: {
        tasks: true,
        sprints: true,
      },
    });

    if (projects.length === 0) {
      return res.status(404).json({ error: "Nenhum projeto encontrado para esta empresa" });
    }

    const comparison = projects.map((project) => {
      const tasks = project.tasks;
      const completedTasks = tasks.filter((t) => t.status === "DONE").length;
      const totalPlanned = tasks.reduce((sum, t) => sum + ((t.estimateHours || 0) * effectiveRate(t)), 0);
      const totalActual = tasks.reduce((sum, t) => sum + taskCost(t), 0);
      const totalPlannedHours = tasks.reduce((sum, t) => sum + (t.estimateHours || 0), 0);
      const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

      return {
        projectId: project.id,
        projectName: project.name,
        totalTasks: tasks.length,
        completedTasks,
        completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100 * 100) / 100 : 0,
        totalPlanned: Math.round(totalPlanned * 100) / 100,
        totalActual: Math.round(totalActual * 100) / 100,
        costVariance: Math.round((totalActual - totalPlanned) * 100) / 100,
        totalPlannedHours: Math.round(totalPlannedHours * 100) / 100,
        totalActualHours: Math.round(totalActualHours * 100) / 100,
        hoursVariance: Math.round((totalActualHours - totalPlannedHours) * 100) / 100,
      };
    });

    res.json({ comparison });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function getProductivityAnalytics(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectId } = req.query as { projectId?: string };
    await ensureProjectAccess(companyId, userId, projectId);

    const whereTask: any = {
      project: {
        companyId,
      },
    };

    if (projectId) {
      whereTask.projectId = projectId;
    }

    const tasks = await prisma.task.findMany({
      where: whereTask,
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true },
        },
      },
    });

    const productivityByProject = new Map<string, {
      projectId: string;
      projectName: string;
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      backlogTasks: number;
    }>();

    for (const task of tasks) {
      const projectKey = task.project.id;
      if (!productivityByProject.has(projectKey)) {
        productivityByProject.set(projectKey, {
          projectId: task.project.id,
          projectName: task.project.name,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          backlogTasks: 0,
        });
      }

      const data = productivityByProject.get(projectKey)!;
      data.totalTasks += 1;

      if (task.status === "DONE") {
        data.completedTasks += 1;
      } else if (task.status === "IN_PROGRESS") {
        data.inProgressTasks += 1;
      } else {
        data.backlogTasks += 1;
      }
    }

    const result = Array.from(productivityByProject.values()).map((project) => ({
      ...project,
      completionRate: project.totalTasks > 0 ? Number(((project.completedTasks / project.totalTasks) * 100).toFixed(2)) : 0,
    }));

    res.json(result);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function getCostsAnalytics(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { projectId } = req.query as { projectId?: string };
    await ensureProjectAccess(companyId, userId, projectId);

    const whereTask: any = {
      project: {
        companyId,
      },
    };

    if (projectId) {
      whereTask.projectId = projectId;
    }

    const tasks = await prisma.task.findMany({
      where: whereTask,
      include: {
        project: {
          select: { id: true, name: true, defaultHourlyRate: true },
        },
        assignee: {
          select: { id: true, name: true, hourlyRate: true },
        },
      },
    });

    const costsByProject = new Map<string, {
      projectId: string;
      projectName: string;
      plannedCost: number;
      actualCost: number;
    }>();

    for (const task of tasks) {
      const projectKey = task.project.id;
      if (!costsByProject.has(projectKey)) {
        costsByProject.set(projectKey, {
          projectId: task.project.id,
          projectName: task.project.name,
          plannedCost: 0,
          actualCost: 0,
        });
      }

      const data = costsByProject.get(projectKey)!;
      const rate = task.assignee?.hourlyRate
        ? Number(task.assignee.hourlyRate)
        : task.project.defaultHourlyRate
        ? Number(task.project.defaultHourlyRate)
        : 0;

      const plannedHours = Number(task.estimateHours) || 0;
      const actualHours = Number(task.actualHours) || plannedHours;

      data.plannedCost += plannedHours * rate;
      data.actualCost += actualHours * rate;
    }

    const result = Array.from(costsByProject.values()).map((project) => ({
      ...project,
      variance: Number((project.actualCost - project.plannedCost).toFixed(2)),
    }));

    res.json(result);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

