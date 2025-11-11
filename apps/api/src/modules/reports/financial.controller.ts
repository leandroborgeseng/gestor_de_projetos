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

async function ensureProjectInCompany(projectId: string, companyId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, companyId },
    select: { id: true },
  });

  if (!project) {
    throw Object.assign(new Error("Projeto não encontrado"), { statusCode: 404 });
  }
}

export async function financialSummary(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { id: projectId } = req.params;
    const { groupBy = "sprint" } = req.query as { groupBy?: string };

    await ensureProjectInCompany(projectId, companyId);

    const tasks = await prisma.task.findMany({
      where: { projectId, project: { companyId } },
      include: {
        assignee: true,
        sprint: true,
        project: true,
        resource: true,
      },
    });

    const groups = new Map<
      string,
      { planned: number; actual: number; items: string[] }
    >();

    for (const t of tasks) {
      let key: string;

      if (groupBy === "assignee") {
        key = t.assignee ? t.assignee.name : "Unassigned";
      } else if (groupBy === "resource") {
        key = t.resource ? `${t.resource.name} (${t.resource.type})` : "No Resource";
      } else if (groupBy === "status") {
        key = t.status;
      } else {
        key = t.sprint ? t.sprint.name : "No Sprint";
      }

      const planned = Number(t.estimateHours) * effectiveRate(t);
      const actual = taskCost(t);

      const g = groups.get(key) ?? { planned: 0, actual: 0, items: [] };
      g.planned += planned;
      g.actual += actual;
      g.items.push(t.title);
      groups.set(key, g);
    }

    const result = Array.from(groups.entries()).map(([group, v]) => ({
      group,
      planned: Number(v.planned.toFixed(2)),
      actual: Number(v.actual.toFixed(2)),
      variance: Number((v.actual - v.planned).toFixed(2)),
      itemsCount: v.items.length,
      items: v.items,
    }));

    res.json(result);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function ganttData(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { id: projectId } = req.params;

    await ensureProjectInCompany(projectId, companyId);

    const tasks = await prisma.task.findMany({
      where: { projectId, project: { companyId } },
      include: {
        assignee: {
          select: { id: true, name: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startDate: "asc" },
    });

    const ganttItems = tasks.map((t) => {
      const progress =
        t.estimateHours > 0
          ? Math.min(100, (t.actualHours / t.estimateHours) * 100)
          : 0;

      return {
        id: t.id,
        name: t.title,
        start: t.startDate || t.createdAt,
        end: t.dueDate || t.startDate || t.createdAt,
        progress: Math.round(progress),
        assignee: t.assignee?.name,
        sprint: t.sprint?.name,
        status: t.status,
      };
    });

    res.json(ganttItems);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

