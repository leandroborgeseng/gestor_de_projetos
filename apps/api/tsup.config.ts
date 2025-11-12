import { defineConfig } from "tsup";

// Configuração SEM geração de tipos TypeScript para produção
// dts: false deve ser suficiente, mas se não funcionar, o tsconfig.build.json
// também tem declaration: false
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false, // NUNCA gerar tipos
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  skipNodeModulesBundle: true,
  tsconfig: "./tsconfig.build.json",
  // Não incluir tipos em nenhuma circunstância
  noExternal: [],
  external: [],
});

