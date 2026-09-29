import { defineConfig } from "vitest/config";

export default defineConfig({
  root: ".",
  test: { include: ["src/**/*.test.ts", "src/**/*.test.tsx"], environment: "jsdom", setupFiles: ["./src/test/setup.ts"] },
});
