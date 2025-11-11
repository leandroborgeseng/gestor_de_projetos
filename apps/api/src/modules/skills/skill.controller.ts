import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateSkillSchema, UpdateSkillSchema } from "./skill.model.js";
import { handleError } from "../../utils/errors.js";

function getCompanyOrReject(req: Request, res: Response): string | null {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return companyId;
}

async function ensureSkillInCompany(skillId: string, companyId: string) {
  const skill = await prisma.skill.findFirst({
    where: { id: skillId, companyId },
    select: { id: true },
  });

  if (!skill) {
    throw Object.assign(new Error("Habilidade não encontrada"), { statusCode: 404 });
  }
}

export async function getSkills(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const { category } = req.query as { category?: string };

    const where: any = { companyId };
    if (category) {
      where.category = category;
    }

    const skills = await prisma.skill.findMany({
      where,
      include: {
        _count: {
          select: { resourceSkills: true },
        },
      },
      orderBy: [
        { category: "asc" },
        { name: "asc" },
      ],
    });

    res.json(skills);
  } catch (error) {
    handleError(error, res);
  }
}

export async function createSkill(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    const parse = CreateSkillSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const skill = await prisma.skill.create({
      data: {
        ...parse.data,
        companyId,
      },
    });

    res.status(201).json(skill);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Habilidade com este nome já existe na empresa" });
    }
    handleError(error, res);
  }
}

export async function getSkill(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureSkillInCompany(req.params.id, companyId);

    const skill = await prisma.skill.findFirst({
      where: { id: req.params.id, companyId },
      include: {
        resourceSkills: {
          include: {
            resource: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!skill) {
      return res.status(404).json({ error: "Skill not found" });
    }

    res.json(skill);
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function updateSkill(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureSkillInCompany(req.params.id, companyId);

    const parse = UpdateSkillSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const skill = await prisma.skill.update({
      where: { id: req.params.id },
      data: {
        ...parse.data,
        companyId,
      },
    });

    res.json(skill);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "Habilidade com este nome já existe na empresa" });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    handleError(error, res);
  }
}

export async function deleteSkill(req: Request, res: Response) {
  try {
    const companyId = getCompanyOrReject(req, res);
    if (!companyId) return;

    await ensureSkillInCompany(req.params.id, companyId);

    await prisma.skill.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    if ((error as any).statusCode) {
      return res.status((error as any).statusCode).json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

