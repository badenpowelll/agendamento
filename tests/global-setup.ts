import { execSync } from "node:child_process";

/** Aplica as migrations no banco de TESTE (nunca aponte TEST_DATABASE_URL para produção). */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/milly_test";
  if (!/test/i.test(url)) throw new Error("TEST_DATABASE_URL precisa apontar para um banco de teste (nome contendo 'test').");
  execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DATABASE_URL: url } });
}
