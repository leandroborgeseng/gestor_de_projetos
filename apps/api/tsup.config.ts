import { defineConfig } from "tsup";

// Configuração SEM geração de tipos TypeScript para produção
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  skipNodeModulesBundle: true,
  tsconfig: "./tsconfig.build.json",
  // Não gerar tipos de forma alguma
  banner: {
    js: "// Built without type declarations",
  },
});

