import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/health.test.ts"],
    setupFiles: ["./tests/setup.ts"],
  },
});
