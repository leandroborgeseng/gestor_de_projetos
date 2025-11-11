import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateResourceSchema, UpdateResourceSchema } from "./resource.model.js";
import { handleError } from "../../utils/errors.js";

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
}

async function ensureResourceInCompany(resourceId: string, companyId: string) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, companyId },
    select: { id: true },
  });

  if (!resource) {
    throw Object.assign(new Error("Recurso não encontrado"), { statusCode: 404 });
  }
}

async function ensureSkillInCompany(skillId: string, companyId: string) {
  const skill = await prisma.skill.findFirst({
    where: { id: skillId, companyId },
    select: { id: true },
  });

  if (!skill) {
    throw Object.assign(new Error("Habilidade não encontrada para esta empresa"), { statusCode: 404 });
  }
}

export async function getResources(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const resources = await prisma.resource.findMany({
      where: { companyId },
      include: {
        tasks: {
          where: { project: { companyId } },
          select: {
            id: true,
            title: true,
            projectId: true,
            estimateHours: true,
            actualHours: true,
          },
        },
        resourceSkills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const resourcesWithCalculations = resources.map((resource) => {
      const allocatedHours = resource.tasks.reduce((total, task) => {
        const hours = task.actualHours > 0 ? task.actualHours : task.estimateHours;
        return total + hours;
      }, 0);

      const skills = resource.resourceSkills.map((rs) => ({
        id: rs.skill.id,
        name: rs.skill.name,
        description: rs.skill.description,
        category: rs.skill.category,
        score: rs.score,
      }));

      return {
        ...resource,
        allocatedHours,
        skills,
      };
    });

    res.json(resourcesWithCalculations);
  } catch (error) {
    handleError(error, res);
  }
}

export async function createResource(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const parse = CreateResourceSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { resourceSkills, ...resourceData } = parse.data;

    if (Array.isArray(resourceSkills)) {
      for (const rs of resourceSkills) {
        await ensureSkillInCompany(rs.skillId, companyId);
      }
    }

    const resource = await prisma.resource.create({
      data: {
        ...resourceData,
        companyId,
        resourceSkills: resourceSkills
          ? {
              create: resourceSkills.map((rs: any) => ({
                skillId: rs.skillId,
                score: Math.max(0, Math.min(10, rs.score || 0)),
              })),
            }
          : undefined,
      },
      include: {
        tasks: {
          where: { project: { companyId } },
          select: {
            id: true,
            title: true,
            projectId: true,
            estimateHours: true,
            actualHours: true,
          },
        },
        resourceSkills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
              },
            },
          },
        },
      },
    });

    const allocatedHours = resource.tasks.reduce((total, task) => {
      const hours = task.actualHours > 0 ? task.actualHours : task.estimateHours;
      return total + hours;
    }, 0);

    const skills = resource.resourceSkills.map((rs) => ({
      id: rs.skill.id,
      name: rs.skill.name,
      description: rs.skill.description,
      category: rs.skill.category,
      score: rs.score,
    }));

    res.status(201).json({
      ...resource,
      allocatedHours,
      skills,
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function getResource(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureResourceInCompany(req.params.id, companyId);

    const resource = await prisma.resource.findFirst({
      where: { id: req.params.id, companyId },
      include: {
        tasks: {
          where: { project: { companyId } },
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
          select: {
            id: true,
            title: true,
            projectId: true,
            estimateHours: true,
            actualHours: true,
            project: {
              select: { id: true, name: true },
            },
          },
        },
        resourceSkills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
              },
            },
          },
        },
      },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    const allocatedHours = resource.tasks.reduce((total, task) => {
      const hours = task.actualHours > 0 ? task.actualHours : task.estimateHours;
      return total + hours;
    }, 0);

    const skills = resource.resourceSkills.map((rs) => ({
      id: rs.skill.id,
      name: rs.skill.name,
      description: rs.skill.description,
      category: rs.skill.category,
      score: rs.score,
    }));

    res.json({
      ...resource,
      allocatedHours,
      skills,
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function updateResource(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureResourceInCompany(req.params.id, companyId);

    const parse = UpdateResourceSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { resourceSkills, ...resourceData } = parse.data;

    if (resourceSkills !== undefined) {
      await prisma.resourceSkill.deleteMany({
        where: { resourceId: req.params.id, resource: { companyId } },
      });

      if (Array.isArray(resourceSkills) && resourceSkills.length > 0) {
        for (const rs of resourceSkills) {
          await ensureSkillInCompany(rs.skillId, companyId);
        }

        await prisma.resourceSkill.createMany({
          data: resourceSkills.map((rs: any) => ({
            resourceId: req.params.id,
            skillId: rs.skillId,
            score: Math.max(0, Math.min(10, rs.score || 0)),
          })),
        });
      }
    }

    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: resourceData,
      include: {
        tasks: {
          where: { project: { companyId } },
          select: {
            id: true,
            title: true,
            projectId: true,
            estimateHours: true,
            actualHours: true,
          },
        },
        resourceSkills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
                description: true,
                category: true,
              },
            },
          },
        },
      },
    });

    const allocatedHours = resource.tasks.reduce((total, task) => {
      const hours = task.actualHours > 0 ? task.actualHours : task.estimateHours;
      return total + hours;
    }, 0);

    const skills = resource.resourceSkills.map((rs) => ({
      id: rs.skill.id,
      name: rs.skill.name,
      description: rs.skill.description,
      category: rs.skill.category,
      score: rs.score,
    }));

    res.json({
      ...resource,
      allocatedHours,
      skills,
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function deleteResource(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureResourceInCompany(req.params.id, companyId);

    await prisma.resource.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

