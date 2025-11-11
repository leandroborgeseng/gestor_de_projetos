import { prisma } from "../db/prisma.js";

export interface ActivityLogData {
  userId: string;
  companyId: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: Record<string, [any, any]>;
  metadata?: Record<string, any>;
}

/**
 * Registra uma atividade no sistema
 */
export async function logActivity(data: ActivityLogData) {
  try {
    return await prisma.activityLog.create({
      data: {
        userId: data.userId,
        companyId: data.companyId,
        entityType: data.entityType,
        entityId: data.entityId,
        action: data.action,
        changes: data.changes || null,
        metadata: data.metadata || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  } catch (error) {
    // Log erro mas não interrompe o fluxo principal
    console.error("Erro ao registrar atividade:", error);
    return null;
  }
}

/**
 * Compara dois objetos e retorna as mudanças
 */
export function calculateChanges(oldData: any, newData: any): Record<string, [any, any]> {
  const changes: Record<string, [any, any]> = {};

  // Verificar campos que mudaram
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    // Ignorar campos de sistema
    if (key === "createdAt" || key === "updatedAt" || key === "id") {
      continue;
    }

    // Comparar valores (tratando null/undefined)
    const oldVal = oldValue === null || oldValue === undefined ? null : oldValue;
    const newVal = newValue === null || newValue === undefined ? null : newValue;

    // Se valores são diferentes
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = [oldVal, newVal];
    }
  }

  return changes;
}

/**
 * Cria log de criação de entidade
 */
export async function logCreate(
  userId: string,
  companyId: string,
  entityType: string,
  entityId: string,
  entityData?: any,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId,
    companyId,
    entityType,
    entityId,
    action: "created",
    changes: entityData ? { initial: [null, entityData] } : undefined,
    metadata,
  });
}

/**
 * Cria log de atualização de entidade
 */
export async function logUpdate(
  userId: string,
  companyId: string,
  entityType: string,
  entityId: string,
  oldData: any,
  newData: any,
  metadata?: Record<string, any>
) {
  const changes = calculateChanges(oldData, newData);
  
  if (Object.keys(changes).length === 0) {
    return null; // Sem mudanças, não precisa logar
  }

  return logActivity({
    userId,
    companyId,
    entityType,
    entityId,
    action: "updated",
    changes,
    metadata,
  });
}

/**
 * Cria log de exclusão de entidade
 */
export async function logDelete(
  userId: string,
  companyId: string,
  entityType: string,
  entityId: string,
  entityData?: any,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId,
    companyId,
    entityType,
    entityId,
    action: "deleted",
    changes: entityData ? { final: [entityData, null] } : undefined,
    metadata,
  });
}

/**
 * Cria log de ação customizada
 */
export async function logAction(
  userId: string,
  companyId: string,
  entityType: string,
  entityId: string,
  action: string,
  changes?: Record<string, [any, any]>,
  metadata?: Record<string, any>
) {
  return logActivity({
    userId,
    companyId,
    entityType,
    entityId,
    action,
    changes,
    metadata,
  });
}

