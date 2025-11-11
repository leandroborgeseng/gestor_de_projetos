import rateLimit from "express-rate-limit";

/**
 * Rate limiter geral para todas as rotas
 * 100 requisições por 15 minutos por IP
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requisições por IP
  message: {
    error: "Muitas requisições deste IP, por favor tente novamente em alguns minutos.",
  },
  standardHeaders: true, // Retorna informações de rate limit nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
});

/**
 * Rate limiter para rotas de autenticação
 * 5 tentativas de login por 15 minutos por IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas de login por IP
  message: {
    error: "Muitas tentativas de login. Por favor, tente novamente em 15 minutos.",
  },
  skipSuccessfulRequests: true, // Não contar requisições bem-sucedidas
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para rotas de criação/edição
 * 50 requisições por 15 minutos por IP
 */
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // 50 requisições de escrita por IP
  message: {
    error: "Muitas requisições de escrita. Por favor, tente novamente em alguns minutos.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para uploads de arquivos
 * 10 uploads por hora por IP
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 10, // 10 uploads por IP
  message: {
    error: "Limite de uploads excedido. Por favor, tente novamente em uma hora.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para webhooks
 * 20 requisições por minuto por IP
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 requisições por minuto
  message: {
    error: "Muitas requisições de webhook. Por favor, tente novamente em um minuto.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter para buscas
 * 30 buscas por minuto por IP
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 buscas por minuto
  message: {
    error: "Muitas buscas. Por favor, tente novamente em um minuto.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

