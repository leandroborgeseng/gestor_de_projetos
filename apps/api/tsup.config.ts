import { defineConfig } from "tsup";

// Configuração sem geração de tipos TypeScript
export default defineConfig((options) => ({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false, // Explicitamente desabilitado
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  skipNodeModulesBundle: true,
  tsconfig: "./tsconfig.build.json",
  // Forçar não gerar tipos mesmo se detectar necessidade
  onSuccess: async () => {
    console.log("Build completed successfully - no types generated");
  },
}));

