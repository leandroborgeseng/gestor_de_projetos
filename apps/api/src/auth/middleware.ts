import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { activeCompanyRole?: string };
      companyId?: string;
      companyRole?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.substring(7);

  try {
    const payload = verifyAccessToken(token);
    const companyHeader = (req.headers["x-company-id"] || req.headers["x-company"] || req.query.companyId) as
      | string
      | undefined;

    let activeCompanyId = companyHeader || payload.activeCompanyId || payload.companies?.[0]?.companyId;

    if (!activeCompanyId) {
      return res.status(400).json({ error: "Company context required" });
    }

    const membership = payload.companies?.find((c) => c.companyId === activeCompanyId);

    if (!membership) {
      return res.status(403).json({ error: "User does not belong to requested company" });
    }

    req.user = { ...payload, activeCompanyId, activeCompanyRole: membership.role };
    req.companyId = activeCompanyId;
    req.companyRole = membership.role;

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

