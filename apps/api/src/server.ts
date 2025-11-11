import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { router as authRoutes } from "./modules/auth/auth.routes.js";
import { router as userRoutes } from "./modules/users/user.routes.js";
import { router as projectRoutes } from "./modules/projects/project.routes.js";
import { router as sprintRoutes } from "./modules/sprints/sprint.routes.js";
import { router as taskRoutes } from "./modules/tasks/task.routes.js";
import { router as kanbanRoutes } from "./modules/kanban/kanban.routes.js";
import { router as resourceRoutes } from "./modules/resources/resource.routes.js";
import { router as skillRoutes } from "./modules/skills/skill.routes.js";
import { router as timeRoutes } from "./modules/time/time.routes.js";
import { router as financialRoutes } from "./modules/reports/financial.routes.js";
import { router as settingsRoutes } from "./modules/settings/settings.routes.js";
import { router as activityRoutes } from "./modules/activities/activity.routes.js";
import { router as notificationRoutes } from "./modules/notifications/notification.routes.js";
import { router as attachmentRoutes } from "./modules/attachments/attachment.routes.js";
import { router as commentRoutes } from "./modules/comments/comment.routes.js";
import { router as tagRoutes } from "./modules/tags/tag.routes.js";
import { router as analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { router as searchRoutes } from "./modules/search/search.routes.js";
import { router as alertRoutes } from "./modules/alerts/alert.routes.js";
import { router as templateRoutes } from "./modules/templates/template.routes.js";
import { router as filterRoutes } from "./modules/filters/filter.routes.js";
import { router as webhookRoutes } from "./modules/webhooks/webhook.routes.js";
import { router as calendarRoutes } from "./modules/calendar/calendar.routes.js";
import { router as companyRoutes } from "./modules/companies/company.routes.js";
import { setupSwagger } from "./config/swagger.js";
import { generalLimiter } from "./middleware/rateLimiter.js";

export const app = express();

// Segurança: Helmet para headers de segurança
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false, // Permite uploads e recursos externos
  })
);

// CORS
app.use(cors());

// Rate limiting geral
app.use(generalLimiter);

// Body parser
app.use(express.json({ limit: "10mb" })); // Limite de 10MB para JSON
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(morgan("dev"));

app.use((req, _res, next) => {
  if (req.originalUrl.startsWith("/companies")) {
    console.log(`[request] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Servir arquivos estáticos de uploads
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/companies", companyRoutes);
app.use("/projects", projectRoutes);
app.use("/projects", sprintRoutes);
app.use("/projects", taskRoutes);
app.use("/projects", kanbanRoutes);
app.use("/projects", financialRoutes);
app.use("/resources", resourceRoutes);
app.use("/skills", skillRoutes);
app.use("/time", timeRoutes);
app.use("/settings", settingsRoutes);
app.use("/activities", activityRoutes);
app.use("/notifications", notificationRoutes);
app.use("/attachments", attachmentRoutes);
app.use("/comments", commentRoutes);
app.use("/tags", tagRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/search", searchRoutes);
app.use("/alerts", alertRoutes);
app.use("/templates", templateRoutes);
app.use("/filters", filterRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/calendar", calendarRoutes);

// Configurar Swagger
setupSwagger(app);

app.get("/health", (_req, res) => res.json({ ok: true }));

