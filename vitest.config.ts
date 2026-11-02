import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    globalSetup: ["tests/global-setup.ts"],
    // Testes de integração compartilham um banco; rodar arquivos em sequência
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/milly_test",
      AUTH_SECRET: "test-secret",
      EMAIL_PROVIDER: "console",
      APP_URL: "http://localhost:3000",
    },
  },
});
