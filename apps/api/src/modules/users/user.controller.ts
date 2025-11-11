import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import axios from "axios";
import { CompanyUserRole, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { CreateUserSchema, UpdateUserSchema, ResetPasswordSchema } from "./user.model.js";
import { handleError } from "../../utils/errors.js";
import { getPaginationParams } from "../../utils/pagination.js";

const USER_SELECT = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  position: true,
  cep: true,
  address: true,
  addressNumber: true,
  addressComplement: true,
  neighborhood: true,
  city: true,
  state: true,
  phone: true,
  cellphone: true,
  role: true,
  hourlyRate: true,
  active: true,
  createdAt: true,
};

function requireCompanyContext(req: Request, res: Response) {
  const companyId = req.companyId;
  if (!companyId) {
    res.status(400).json({ error: "Empresa não selecionada" });
    return null;
  }
  return {
    companyId,
    userId: req.user?.userId,
    userRole: req.user?.role,
    companyRole: req.companyRole,
  };
}

function isSuperAdmin(role?: string) {
  return role === "SUPERADMIN";
}

function isCompanyAdmin(role?: string) {
  return role === "OWNER" || role === "ADMIN";
}

async function ensureCompanyAccess(
  companyId: string,
  userId?: string,
  userRole?: string
): Promise<{ role: CompanyUserRole | "ADMIN" }> {
  if (isSuperAdmin(userRole)) {
    return { role: "ADMIN" };
  }

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

  return { role: membership.role }; // OWNER, ADMIN ou MEMBER
}

function buildUserWhere(companyId: string, q?: string): Prisma.UserWhereInput {
  const filters: Prisma.UserWhereInput[] = [
    {
      companyMemberships: {
        some: { companyId },
      },
    },
  ];

  if (q && q.trim().length > 0) {
    filters.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  return {
    AND: filters,
  };
}

async function findUserForCompany(userId: string, companyId: string) {
  return prisma.user.findFirst({
    where: {
      AND: [
        { id: userId },
        {
          companyMemberships: {
            some: { companyId },
          },
        },
      ],
    },
    select: USER_SELECT,
  });
}

export async function getUsers(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const { skip, take, page, limit } = getPaginationParams(req.query);
    const { q } = req.query as { q?: string };

    await ensureCompanyAccess(context.companyId, context.userId, context.userRole);

    const where = buildUserWhere(context.companyId, q);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: USER_SELECT,
        orderBy: { name: "asc" },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const actorAccess = await ensureCompanyAccess(
      context.companyId,
      context.userId,
      context.userRole
    );

    const actorIsAdmin =
      isSuperAdmin(context.userRole) || isCompanyAdmin(context.companyRole ?? actorAccess.role);

    if (!actorIsAdmin) {
      return res.status(403).json({ error: "Você não tem permissão para criar usuários" });
    }

    const parse = CreateUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { password, ...data } = parse.data;

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: USER_SELECT,
    });

    if (existingUser) {
      const existingMembership = await prisma.companyUser.findUnique({
        where: {
          companyId_userId: {
            companyId: context.companyId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership) {
        return res.status(409).json({ error: "Usuário já pertence à empresa" });
      }

      await prisma.companyUser.create({
        data: {
          companyId: context.companyId,
          userId: existingUser.id,
          role: CompanyUserRole.MEMBER,
        },
      });

      return res.status(200).json(existingUser);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { ...data, passwordHash },
      select: USER_SELECT,
    });

    await prisma.companyUser.create({
      data: {
        companyId: context.companyId,
        userId: user.id,
        role: CompanyUserRole.MEMBER,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function getUser(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    await ensureCompanyAccess(context.companyId, context.userId, context.userRole);

    const user = await findUserForCompany(req.params.id, context.companyId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(user);
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const actorAccess = await ensureCompanyAccess(
      context.companyId,
      context.userId,
      context.userRole
    );

    const parse = UpdateUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const targetId = req.params.id;
    const isSelf = context.userId === targetId;
    const actorIsAdmin =
      isSuperAdmin(context.userRole) || isCompanyAdmin(context.companyRole ?? actorAccess.role);

    if (!isSelf && !actorIsAdmin) {
      return res.status(403).json({ error: "Você não tem permissão para atualizar este usuário" });
    }

    const existing = await findUserForCompany(targetId, context.companyId);
    if (!existing) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = await prisma.user.update({
      where: { id: targetId },
      data: parse.data,
      select: USER_SELECT,
    });

    res.json(user);
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const actorAccess = await ensureCompanyAccess(
      context.companyId,
      context.userId,
      context.userRole
    );

    const actorIsAdmin =
      isSuperAdmin(context.userRole) || isCompanyAdmin(context.companyRole ?? actorAccess.role);

    if (!actorIsAdmin) {
      return res.status(403).json({ error: "Você não tem permissão para remover usuários" });
    }

    const targetId = req.params.id;

    const existing = await findUserForCompany(targetId, context.companyId);
    if (!existing) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    await prisma.companyUser.delete({
      where: {
        companyId_userId: {
          companyId: context.companyId,
          userId: targetId,
        },
      },
    });

    const remainingMemberships = await prisma.companyUser.count({
      where: { userId: targetId },
    });

    if (remainingMemberships === 0) {
      await prisma.user.delete({ where: { id: targetId } });
    }

    res.status(204).send();
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const userId = context.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureCompanyAccess(context.companyId, userId, context.userRole);

    const user = await findUserForCompany(userId, context.companyId);

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(user);
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function updateCurrentUser(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const userId = context.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await ensureCompanyAccess(context.companyId, userId, context.userRole);

    const parse = UpdateUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const existing = await findUserForCompany(userId, context.companyId);
    if (!existing) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: parse.data,
      select: USER_SELECT,
    });

    res.json(user);
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function getCepInfo(req: Request, res: Response) {
  try {
    const { cep } = req.query as { cep?: string };

    if (!cep) {
      return res.status(400).json({ error: "CEP é obrigatório" });
    }

    const cleanCep = cep.replace(/\D/g, "");

    if (cleanCep.length !== 8) {
      return res.status(400).json({ error: "CEP inválido" });
    }

    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`);

      if (response.data.erro) {
        return res.status(404).json({ error: "CEP não encontrado" });
      }

      res.json({
        cep: response.data.cep,
        address: response.data.logradouro,
        neighborhood: response.data.bairro,
        city: response.data.localidade,
        state: response.data.uf,
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar CEP" });
    }
  } catch (error) {
    handleError(error, res);
  }
}

export async function resetUserPassword(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const actorAccess = await ensureCompanyAccess(
      context.companyId,
      context.userId,
      context.userRole
    );

    const actorIsAdmin =
      isSuperAdmin(context.userRole) || isCompanyAdmin(context.companyRole ?? actorAccess.role);

    if (!actorIsAdmin) {
      return res.status(403).json({ error: "Você não tem permissão para redefinir senhas" });
    }

    const parse = ResetPasswordSchema.safeParse({
      userId: req.params.id,
      newPassword: req.body.newPassword,
    });

    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { userId, newPassword } = parse.data;

    const user = await findUserForCompany(userId, context.companyId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: "Senha resetada com sucesso" });
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const actorAccess = await ensureCompanyAccess(
      context.companyId,
      context.userId,
      context.userRole
    );

    const actorIsAdmin =
      isSuperAdmin(context.userRole) || isCompanyAdmin(context.companyRole ?? actorAccess.role);

    if (!actorIsAdmin) {
      return res.status(403).json({ error: "Você não tem permissão para alterar status de usuários" });
    }

    const { id } = req.params;
    const { active } = req.body as { active: boolean };

    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Campo 'active' deve ser um booleano" });
    }

    const existing = await findUserForCompany(id, context.companyId);
    if (!existing) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { active },
      select: USER_SELECT,
    });

    res.json(updatedUser);
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

export async function bulkImportUsers(req: Request, res: Response) {
  try {
    const context = requireCompanyContext(req, res);
    if (!context) return;

    const actorAccess = await ensureCompanyAccess(
      context.companyId,
      context.userId,
      context.userRole
    );

    const actorIsAdmin =
      isSuperAdmin(context.userRole) || isCompanyAdmin(context.companyRole ?? actorAccess.role);

    if (!actorIsAdmin) {
      return res.status(403).json({ error: "Você não tem permissão para importar usuários" });
    }

    const { users } = req.body as { users: any[] };

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: "Lista de usuários é obrigatória" });
    }

    const results = {
      success: [] as any[],
      errors: [] as Array<{ row: number; email: string; error: string }>,
    };

    const emailsInBatch = new Set<string>();
    for (const user of users) {
      if (emailsInBatch.has(user.email)) {
        results.errors.push({
          row: user.rowNumber || 0,
          email: user.email,
          error: "Email duplicado no arquivo",
        });
        continue;
      }
      emailsInBatch.add(user.email);
    }

    for (const userData of users) {
      try {
        const parse = CreateUserSchema.safeParse(userData);
        if (!parse.success) {
          results.errors.push({
            row: userData.rowNumber || 0,
            email: userData.email || "N/A",
            error: parse.error.errors.map((e) => e.message).join(", "),
          });
          continue;
        }

        const { password, ...data } = parse.data;

        const existingUser = await prisma.user.findUnique({
          where: { email: data.email },
          select: USER_SELECT,
        });

        if (existingUser) {
          const existingMembership = await prisma.companyUser.findUnique({
            where: {
              companyId_userId: {
                companyId: context.companyId,
                userId: existingUser.id,
              },
            },
          });

          if (existingMembership) {
            results.errors.push({
              row: userData.rowNumber || 0,
              email: data.email,
              error: "Usuário já pertence à empresa",
            });
            continue;
          }

          await prisma.companyUser.create({
            data: {
              companyId: context.companyId,
              userId: existingUser.id,
              role: CompanyUserRole.MEMBER,
            },
          });

          results.success.push(existingUser);
          continue;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
          data: { ...data, passwordHash },
          select: USER_SELECT,
        });

        await prisma.companyUser.create({
          data: {
            companyId: context.companyId,
            userId: user.id,
            role: CompanyUserRole.MEMBER,
          },
        });

        results.success.push(user);
      } catch (error: any) {
        results.errors.push({
          row: userData.rowNumber || 0,
          email: userData.email || "N/A",
          error: error.message || "Erro desconhecido",
        });
      }
    }

    res.status(201).json({
      message: `${results.success.length} usuário(s) processado(s) com sucesso`,
      success: results.success.length,
      errors: results.errors.length,
      details: results,
    });
  } catch (error) {
    if ((error as any).statusCode) {
      return res
        .status((error as any).statusCode)
        .json({ error: (error as Error).message });
    }
    handleError(error, res);
  }
}

