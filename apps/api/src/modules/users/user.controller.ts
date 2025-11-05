import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../../db/prisma.js";
import { CreateUserSchema, UpdateUserSchema, ResetPasswordSchema } from "./user.model.js";
import { handleError } from "../../utils/errors.js";
import { getPaginationParams } from "../../utils/pagination.js";
import axios from "axios";

export async function getUsers(req: Request, res: Response) {
  try {
    const { skip, take, page, limit } = getPaginationParams(req.query);
    const { q } = req.query as { q?: string };

    const where = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
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
          createdAt: true,
        },
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
    handleError(error, res);
  }
}

export async function createUser(req: Request, res: Response) {
  try {
    const parse = CreateUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { password, ...data } = parse.data;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { ...data, passwordHash },
      select: {
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
        createdAt: true,
      },
    });

    res.status(201).json(user);
  } catch (error) {
    handleError(error, res);
  }
}

export async function getUser(req: Request, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
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
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateUser(req: Request, res: Response) {
  try {
    const parse = UpdateUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: parse.data,
      select: {
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
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    handleError(error, res);
  }
}

export async function deleteUser(req: Request, res: Response) {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
}

// Obter perfil do usuário logado
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
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
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    handleError(error, res);
  }
}

// Atualizar perfil do usuário logado
export async function updateCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parse = UpdateUserSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: parse.data,
      select: {
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
        createdAt: true,
      },
    });

    res.json(user);
  } catch (error) {
    handleError(error, res);
  }
}

// Buscar CEP via API ViaCEP
export async function getCepInfo(req: Request, res: Response) {
  try {
    const { cep } = req.query as { cep?: string };

    if (!cep) {
      return res.status(400).json({ error: "CEP é obrigatório" });
    }

    // Remove formatação do CEP
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

// Resetar senha do usuário
export async function resetUserPassword(req: Request, res: Response) {
  try {
    const parse = ResetPasswordSchema.safeParse({
      userId: req.params.id,
      newPassword: req.body.newPassword,
    });

    if (!parse.success) {
      return res.status(400).json({ error: parse.error.flatten() });
    }

    const { userId, newPassword } = parse.data;

    // Verificar se o usuário existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Hash da nova senha
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Atualizar senha
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    res.json({ message: "Senha resetada com sucesso" });
  } catch (error) {
    handleError(error, res);
  }
}

