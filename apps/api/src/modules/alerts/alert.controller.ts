import { Request, Response } from "express";
import { handleError } from "../../utils/errors.js";
import {
  getUserAlerts,
  updateUserAlertConfig,
  getUserAlertConfig as getConfig,
  AlertConfig,
} from "./alert.service.js";

export async function getAlerts(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const companyId = req.companyId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const alerts = await getUserAlerts(userId, companyId);
    res.json({ alerts });
  } catch (error) {
    handleError(error, res);
  }
}

export async function getAlertConfig(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const companyId = req.companyId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const config = await getConfig(userId, companyId);
    res.json({ config });
  } catch (error) {
    handleError(error, res);
  }
}

export async function updateAlertConfig(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    const companyId = req.companyId;
    if (!userId) {
      return res.status(401).json({ error: "Não autenticado" });
    }

    if (!companyId) {
      return res.status(400).json({ error: "Empresa não selecionada" });
    }

    const config = req.body as Partial<AlertConfig>;
    await updateUserAlertConfig(userId, companyId, config);

    res.json({ message: "Configurações de alertas atualizadas" });
  } catch (error) {
    handleError(error, res);
  }
}

