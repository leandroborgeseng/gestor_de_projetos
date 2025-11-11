import crypto from "crypto";
import axios, { AxiosError } from "axios";
import { prisma } from "../db/prisma.js";
import { WebhookEvent } from "../modules/webhooks/webhook.model.js";

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: any;
  projectId?: string;
}

/**
 * Dispara webhooks para um evento específico
 */
export async function triggerWebhooks(
  event: WebhookEvent,
  data: any,
  projectId?: string,
  companyId?: string
): Promise<void> {
  try {
    let finalCompanyId = companyId;

    if (!finalCompanyId && projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { companyId: true },
      });
      finalCompanyId = project?.companyId || null;
    }

    if (!finalCompanyId && data?.companyId) {
      finalCompanyId = data.companyId;
    }

    if (!finalCompanyId) {
      return;
    }

    const where: any = {
      active: true,
      companyId: finalCompanyId,
      events: {
        has: event,
      },
    };

    if (projectId) {
      where.OR = [{ projectId }, { projectId: null }];
    } else {
      where.projectId = null;
    }

    const webhooks = await prisma.webhook.findMany({
      where,
    });

    if (webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
      projectId: projectId || undefined,
    };

    await Promise.allSettled(
      webhooks.map((webhook) =>
        sendWebhook(webhook.id, webhook.url, webhook.secret, payload, event)
      )
    );
  } catch (error) {
    console.error("Erro ao disparar webhooks:", error);
  }
}

/**
 * Envia um webhook individual
 */
async function sendWebhook(
  webhookId: string,
  url: string,
  secret: string | null,
  payload: WebhookPayload,
  event: string
): Promise<void> {
  let logId: string | null = null;

  try {
    // Criar log inicial
    const log = await prisma.webhookLog.create({
      data: {
        webhookId,
        event,
        status: "pending",
        retryCount: 0,
      },
    });
    logId = log.id;

    // Assinar payload se houver secret
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "AgilePM-Webhook/1.0",
    };

    if (secret) {
      const signature = generateSignature(JSON.stringify(payload), secret);
      headers["X-Webhook-Signature"] = signature;
    }

    // Enviar webhook
    const response = await axios.post(url, payload, {
      headers,
      timeout: 10000, // 10 segundos
    });

    // Atualizar log com sucesso
    await prisma.webhookLog.update({
      where: { id: logId },
      data: {
        status: "success",
        statusCode: response.status,
        response: JSON.stringify(response.data).substring(0, 1000), // Limitar tamanho
      },
    });
  } catch (error) {
    const axiosError = error as AxiosError;
    const statusCode = axiosError.response?.status || null;
    const errorMessage = axiosError.message || "Erro desconhecido";

    // Atualizar log com erro
    if (logId) {
      const log = await prisma.webhookLog.findUnique({
        where: { id: logId },
      });

      if (log) {
        const retryCount = log.retryCount + 1;
        const shouldRetry = statusCode && statusCode >= 500 && retryCount < 3;

        await prisma.webhookLog.update({
          where: { id: logId },
          data: {
            status: shouldRetry ? "pending" : "failed",
            statusCode,
            error: errorMessage.substring(0, 500),
            retryCount,
          },
        });

        // Retry se for erro do servidor (até 3 tentativas)
        if (shouldRetry) {
          setTimeout(() => {
            sendWebhook(webhookId, url, secret, payload, event).catch(console.error);
          }, Math.pow(2, retryCount) * 1000); // Exponential backoff: 2s, 4s, 8s
        }
      }
    }
  }
}

/**
 * Gera assinatura HMAC para o payload
 */
function generateSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Verifica assinatura de um webhook recebido
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = generateSignature(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

