import dotenv from "dotenv";

dotenv.config();

// Validar variáveis de ambiente críticas
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set!");
  process.exit(1);
}

export const env = {
  DATABASE_URL: DATABASE_URL!,
  PORT: parseInt(process.env.PORT || "4000", 10),
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret",
  NODE_ENV: process.env.NODE_ENV || "development",
};

// Log de configuração (sem mostrar secrets)
console.log("🔧 Environment configuration:");
console.log(`   NODE_ENV: ${env.NODE_ENV}`);
console.log(`   PORT: ${env.PORT}`);
console.log(`   DATABASE_URL: ${DATABASE_URL ? "✅ Set" : "❌ Not set"}`);
console.log(`   JWT_SECRET: ${env.JWT_SECRET ? "✅ Set" : "⚠️ Using default"}`);
