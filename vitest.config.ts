import { fileURLToPath, URL } from "node:url";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(rootDir, "node_modules/react"),
      "react-dom": path.resolve(rootDir, "node_modules/react-dom"),
      "@radix-ui/react-collapsible": path.resolve(rootDir, "node_modules/@radix-ui/react-collapsible"),
      "@radix-ui/react-progress": path.resolve(rootDir, "node_modules/@radix-ui/react-progress"),
      "aurorra-index": fileURLToPath(new URL("../aurorra_index/src/public-api.ts", import.meta.url)),
    },
    dedupe: ["react", "react-dom", "@radix-ui/react-collapsible", "@radix-ui/react-progress"],
    preserveSymlinks: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist"],
  },
});
