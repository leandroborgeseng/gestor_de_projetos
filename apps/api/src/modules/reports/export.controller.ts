import { Request, Response } from "express";
import ExcelJS from "exceljs";
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
    select: { id: true, name: true },
  });

  if (!project) {
    throw Object.assign(new Error("Project not found"), { statusCode: 404 });
  }

  return project;
}

/**
 * Exporta relatório financeiro para Excel
 */
export async function exportFinancialExcel(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { id: projectId } = req.params;
    const { groupBy = "sprint" } = req.query as { groupBy?: string };

    const project = await ensureProjectInCompany(projectId, companyId);

    const tasks = await prisma.task.findMany({
      where: { projectId, project: { companyId } },
      include: {
        assignee: true,
        sprint: true,
        project: true,
        resource: true,
      },
    });

    const groups = new Map<string, { planned: number; actual: number; items: string[] }>();

    for (const t of tasks) {
      let key: string;
      if (groupBy === "assignee") {
        key = t.assignee ? t.assignee.name : "Sem Responsável";
      } else if (groupBy === "resource") {
        key = t.resource ? `${t.resource.name} (${t.resource.type})` : "Sem Recurso";
      } else if (groupBy === "status") {
        key = t.status;
      } else {
        key = t.sprint ? t.sprint.name : "Sem Sprint";
      }

      const planned = Number(t.estimateHours) * effectiveRate(t);
      const actual = taskCost(t);

      const g = groups.get(key) ?? { planned: 0, actual: 0, items: [] };
      g.planned += planned;
      g.actual += actual;
      g.items.push(t.title);
      groups.set(key, g);
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Relatório Financeiro");

    worksheet.mergeCells("A1:E1");
    worksheet.getCell("A1").value = `Relatório Financeiro - ${project.name}`;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    worksheet.getCell("A2").value = `Agrupado por: ${
      groupBy === "assignee"
        ? "Responsável"
        : groupBy === "resource"
        ? "Recurso"
        : groupBy === "status"
        ? "Status"
        : "Sprint"
    }`;
    worksheet.getCell("A2").font = { italic: true };

    const headerRow = worksheet.addRow(["Grupo", "Custo Planejado", "Custo Real", "Variação", "Quantidade de Tarefas"]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };

    Array.from(groups.entries()).forEach(([group, v]) => {
      const variance = v.actual - v.planned;
      const row = worksheet.addRow([
        group,
        v.planned.toFixed(2),
        v.actual.toFixed(2),
        variance.toFixed(2),
        v.items.length,
      ]);

      const varianceCell = row.getCell(4);
      if (variance >= 0) {
        varianceCell.font = { color: { argb: "FFFF0000" } };
      } else {
        varianceCell.font = { color: { argb: "FF00FF00" } };
      }
    });

    const totalPlanned = Array.from(groups.values()).reduce((sum, g) => sum + g.planned, 0);
    const totalActual = Array.from(groups.values()).reduce((sum, g) => sum + g.actual, 0);
    const totalVariance = totalActual - totalPlanned;

    const totalRow = worksheet.addRow([
      "TOTAL",
      totalPlanned.toFixed(2),
      totalActual.toFixed(2),
      totalVariance.toFixed(2),
      tasks.length,
    ]);
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" },
    };

    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="relatorio-financeiro-${project.name}-${new Date().toISOString().split("T")[0]}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Exporta relatório financeiro para CSV
 */
export async function exportFinancialCSV(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { id: projectId } = req.params;
    const { groupBy = "sprint" } = req.query as { groupBy?: string };

    const project = await ensureProjectInCompany(projectId, companyId);

    const tasks = await prisma.task.findMany({
      where: { projectId, project: { companyId } },
      include: {
        assignee: true,
        sprint: true,
        project: true,
        resource: true,
      },
    });

    const groups = new Map<string, { planned: number; actual: number; items: string[] }>();

    for (const t of tasks) {
      let key: string;
      if (groupBy === "assignee") {
        key = t.assignee ? t.assignee.name : "Sem Responsável";
      } else if (groupBy === "resource") {
        key = t.resource ? `${t.resource.name} (${t.resource.type})` : "Sem Recurso";
      } else if (groupBy === "status") {
        key = t.status;
      } else {
        key = t.sprint ? t.sprint.name : "Sem Sprint";
      }

      const planned = Number(t.estimateHours) * effectiveRate(t);
      const actual = taskCost(t);

      const g = groups.get(key) ?? { planned: 0, actual: 0, items: [] };
      g.planned += planned;
      g.actual += actual;
      g.items.push(t.title);
      groups.set(key, g);
    }

    let csv = `Relatório Financeiro - ${project.name}\n`;
    csv += `Agrupado por: ${
      groupBy === "assignee"
        ? "Responsável"
        : groupBy === "resource"
        ? "Recurso"
        : groupBy === "status"
        ? "Status"
        : "Sprint"
    }\n\n`;
    csv += "Grupo,Custo Planejado,Custo Real,Variação,Quantidade de Tarefas\n";

    Array.from(groups.entries()).forEach(([group, v]) => {
      const variance = v.actual - v.planned;
      csv += `"${group}",${v.planned.toFixed(2)},${v.actual.toFixed(2)},${variance.toFixed(2)},${v.items.length}\n`;
    });

    const totalPlanned = Array.from(groups.values()).reduce((sum, g) => sum + g.planned, 0);
    const totalActual = Array.from(groups.values()).reduce((sum, g) => sum + g.actual, 0);
    const totalVariance = totalActual - totalPlanned;

    csv += `"TOTAL",${totalPlanned.toFixed(2)},${totalActual.toFixed(2)},${totalVariance.toFixed(2)},${tasks.length}\n`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="relatorio-financeiro-${project.name}-${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.setHeader("Content-Encoding", "utf-8");
    res.send("\ufeff" + csv);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Exporta lista de tarefas para Excel
 */
export async function exportTasksExcel(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { id: projectId } = req.params;

    const project = await ensureProjectInCompany(projectId, companyId);

    const tasks = await prisma.task.findMany({
      where: { projectId, project: { companyId } },
      include: {
        assignee: { select: { name: true, email: true } },
        sprint: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Tarefas");

    worksheet.mergeCells("A1:J1");
    worksheet.getCell("A1").value = `Tarefas do Projeto - ${project.name}`;
    worksheet.getCell("A1").font = { size: 16, bold: true };
    worksheet.getCell("A1").alignment = { horizontal: "center" };

    const headerRow = worksheet.addRow([
      "Título",
      "Descrição",
      "Status",
      "Responsável",
      "Sprint",
      "Horas Planejadas",
      "Horas Realizadas",
      "Data Início",
      "Data Término",
      "Tags",
    ]);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    headerRow.font = { color: { argb: "FFFFFFFF" }, bold: true };

    tasks.forEach((task) => {
      worksheet.addRow([
        task.title,
        task.description || "",
        task.status,
        task.assignee?.name || "Sem responsável",
        task.sprint?.name || "Sem sprint",
        task.estimateHours || 0,
        task.actualHours || 0,
        task.startDate ? new Date(task.startDate).toLocaleDateString("pt-BR") : "",
        task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : "",
        task.tags?.map((t) => t.tag.name).join(", ") || "",
      ]);
    });

    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tarefas-${project.name}-${new Date().toISOString().split("T")[0]}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

/**
 * Exporta lista de tarefas para CSV
 */
export async function exportTasksCSV(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { id: projectId } = req.params;

    const project = await ensureProjectInCompany(projectId, companyId);

    const tasks = await prisma.task.findMany({
      where: { projectId, project: { companyId } },
      include: {
        assignee: { select: { name: true } },
        sprint: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    let csv = `Tarefas do Projeto - ${project.name}\n\n`;
    csv += "Título,Descrição,Status,Responsável,Sprint,Horas Planejadas,Horas Realizadas,Data Início,Data Término,Tags\n";

    tasks.forEach((task) => {
      csv += `"${task.title}","${(task.description || "").replace(/"/g, '""')}","${task.status}","${task.assignee?.name || "Sem responsável"}","${task.sprint?.name || "Sem sprint"}","${task.estimateHours || 0}","${task.actualHours || 0}","${task.startDate ? new Date(task.startDate).toLocaleDateString("pt-BR") : ""}","${task.dueDate ? new Date(task.dueDate).toLocaleDateString("pt-BR") : ""}","${task.tags?.map((t) => t.tag.name).join(", ") || ""}"\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="tarefas-${project.name}-${new Date().toISOString().split("T")[0]}.csv"`
    );
    res.setHeader("Content-Encoding", "utf-8");
    res.send("\ufeff" + csv);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

