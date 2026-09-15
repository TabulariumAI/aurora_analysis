import { fileURLToPath, URL } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "aurora-core": path.resolve(rootDir, "../aurora_core/src/public-api.ts"),
      react: path.resolve(rootDir, "node_modules/react"),
      "react-dom": path.resolve(rootDir, "node_modules/react-dom"),
      "@radix-ui/react-collapsible": path.resolve(rootDir, "node_modules/@radix-ui/react-collapsible"),
    },
    dedupe: ["react", "react-dom", "@radix-ui/react-collapsible"],
    preserveSymlinks: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
  },
});
