import { Request, Response } from "express";
import { prisma } from "../../db/prisma.js";
import { CreateResourceSchema, UpdateResourceSchema } from "./resource.model.js";
import { handleError } from "../../utils/errors.js";

export async function getResources(req: Request, res: Response) {
  try {
    const resources = await prisma.resource.findMany({
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(resources);
  } catch (error) {
    handleError(error, res);
  }
}

export async function createResource(req: Request, res: Response) {
  try {
    const parse = CreateResourceSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const resource = await prisma.resource.create({
      data: parse.data,
    });

    res.status(201).json(resource);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getResource(req: Request, res: Response) {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!resource) {
      return res.status(404).json({ error: "Resource not found" });
    }

    res.json(resource);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateResource(req: Request, res: Response) {
  try {
    const parse = UpdateResourceSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const resource = await prisma.resource.update({
      where: { id: req.params.id },
      data: parse.data,
    });

    res.json(resource);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteResource(req: Request, res: Response) {
  try {
    await prisma.resource.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

