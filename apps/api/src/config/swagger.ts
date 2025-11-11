import swaggerJsdoc, { Options } from "swagger-jsdoc";
import { Express } from "express";
import swaggerUi from "swagger-ui-express";

const options: Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Agile Project Manager API",
      version: "1.0.0",
      description: "API REST para gerenciamento de projetos ágeis com Kanban, Sprints, Tarefas e Recursos",
      contact: {
        name: "API Support",
        email: "support@agilepm.com",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor de desenvolvimento",
      },
      {
        url: "https://api.agilepm.com",
        description: "Servidor de produção",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Token JWT obtido através do endpoint /auth/login",
        },
      },
      responses: {
        UnauthorizedError: {
          description: "Não autenticado",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        BadRequestError: {
          description: "Requisição inválida",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
        NotFoundError: {
          description: "Recurso não encontrado",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/Error",
              },
            },
          },
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Mensagem de erro",
            },
          },
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string" },
            lastName: { type: "string", nullable: true },
            position: { type: "string", nullable: true },
            role: { type: "string", enum: ["SUPERADMIN", "ADMIN", "MANAGER", "MEMBER"] },
            hourlyRate: { type: "number", format: "decimal", nullable: true },
            active: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Project: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            defaultHourlyRate: { type: "number", format: "decimal", nullable: true },
            archived: { type: "boolean" },
            ownerId: { type: "string" },
            owner: { $ref: "#/components/schemas/User" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            status: {
              type: "string",
              enum: ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"],
            },
            estimateHours: { type: "number", nullable: true },
            actualHours: { type: "number", nullable: true },
            startDate: { type: "string", format: "date-time", nullable: true },
            dueDate: { type: "string", format: "date-time", nullable: true },
            assigneeId: { type: "string", nullable: true },
            sprintId: { type: "string", nullable: true },
            projectId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Sprint: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            goal: { type: "string", nullable: true },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            projectId: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    "./src/modules/**/*.routes.ts",
    "./src/modules/**/*.controller.ts",
    "./src/server.ts",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Agile PM API Documentation",
  }));

  app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });
}

