#!/usr/bin/env node

// Script de build alternativo usando esbuild diretamente
// Usa este script se o tsup continuar tentando gerar tipos

import { build } from "esbuild";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProduction = process.env.NODE_ENV === "production";

build({
  entryPoints: [resolve(__dirname, "src/index.ts")],
  bundle: true, // Fazer bundle do código da aplicação
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: resolve(__dirname, "dist/index.js"),
  sourcemap: true,
  minify: isProduction,
  // Dependências do node_modules não são bundladas (ficam externas)
  packages: "external",
  banner: {
    js: "// Built with esbuild - no type declarations",
  },
  logLevel: "info",
  // Configurações adicionais
  keepNames: true, // Manter nomes de funções para debugging
  treeShaking: true, // Remover código não utilizado
})
  .then(() => {
    console.log("✅ Build completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Build failed:", error);
    process.exit(1);
  });

