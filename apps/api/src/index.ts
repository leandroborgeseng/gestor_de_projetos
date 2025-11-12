import { app } from "./server.js";
import { env } from "./env.js";

const PORT = env.PORT;

// Adicionar tratamento de erros
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
}).on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use`);
    process.exit(1);
  } else {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
});

// Log de inicialização
console.log(`📦 Starting API server...`);
console.log(`📋 Environment: ${env.NODE_ENV}`);
console.log(`🔌 Port: ${PORT}`);

