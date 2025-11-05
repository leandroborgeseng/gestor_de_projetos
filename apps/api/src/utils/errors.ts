import { Response } from "express";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export function handleError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation error",
      issues: error.flatten().fieldErrors,
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
    });
  }

  console.error("Unexpected error:", error);
  return res.status(500).json({
    error: "Internal server error",
  });
}

