import rateLimit from "express-rate-limit";

/**
 * Rate limiter geral para todas as rotas
 * 10000 requisições por 15 minutos por IP (muito generoso para uso normal)
 * Pode ser desabilitado definindo DISABLE_RATE_LIMIT=true no .env
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.DISABLE_RATE_LIMIT === "true" ? Number.MAX_SAFE_INTEGER : 10000, // 10000 requisições por IP (ou desabilitado)
  message: {
    error: "Muitas requisições deste IP, por favor tente novamente em alguns minutos.",
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
  skip: () => process.env.DISABLE_RATE_LIMIT === "true", // Pula completamente se desabilitado
});

/**
 * Rate limiter para rotas de autenticação
 * 20 tentativas de login por 15 minutos por IP (aumentado para uso normal)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.DISABLE_RATE_LIMIT === "true" ? Number.MAX_SAFE_INTEGER : 20, // 20 tentativas de login por IP
  message: {
    error: "Muitas tentativas de login. Por favor, tente novamente em 15 minutos.",
  },
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

/**
 * Rate limiter para rotas de criação/edição
 * 500 requisições por 15 minutos por IP (aumentado significativamente)
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.DISABLE_RATE_LIMIT === "true" ? Number.MAX_SAFE_INTEGER : 500, // 500 requisições de escrita por IP
  message: {
    error: "Muitas requisições de escrita. Por favor, tente novamente em alguns minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

/**
 * Rate limiter para uploads de arquivos
 * 100 uploads por hora por IP (aumentado significativamente)
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: process.env.DISABLE_RATE_LIMIT === "true" ? Number.MAX_SAFE_INTEGER : 100, // 100 uploads por IP
  message: {
    error: "Limite de uploads excedido. Por favor, tente novamente em uma hora.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

/**
 * Rate limiter para webhooks
 * 200 requisições por minuto por IP (aumentado significativamente)
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: process.env.DISABLE_RATE_LIMIT === "true" ? Number.MAX_SAFE_INTEGER : 200, // 200 requisições por minuto
  message: {
    error: "Muitas requisições de webhook. Por favor, tente novamente em um minuto.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

/**
 * Rate limiter para buscas
 * 200 buscas por minuto por IP (aumentado significativamente)
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: process.env.DISABLE_RATE_LIMIT === "true" ? Number.MAX_SAFE_INTEGER : 200, // 200 buscas por minuto
  message: {
    error: "Muitas buscas. Por favor, tente novamente em um minuto.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.DISABLE_RATE_LIMIT === "true",
});

