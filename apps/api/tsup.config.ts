import { defineConfig } from "tsup";

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
  onSuccess: "echo 'Build completed successfully'",
});

