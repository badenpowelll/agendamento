/**
 * Cadastro prévio da gestora (ou de qualquer acesso da equipe) pela linha de comando.
 * Uso: npm run staff:create -- --email gestora@exemplo.com --name "Nome" [--role OWNER|ADMIN|STAFF]
 * Mostra uma senha provisória; no primeiro acesso ela é trocada.
 */
import { prisma } from "../src/lib/db";
import { createStaffUser } from "../src/domain/staff";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("email");
  const name = arg("name");
  const role = (arg("role") ?? "OWNER").toUpperCase() as "OWNER" | "ADMIN" | "STAFF";
  if (!email || !name || !["OWNER", "ADMIN", "STAFF"].includes(role)) {
    console.error('Uso: npm run staff:create -- --email gestora@exemplo.com --name "Nome" [--role OWNER|ADMIN|STAFF]');
    process.exit(1);
  }
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.DEFAULT_TENANT_SLUG ?? "milly-rodrigues" } });
  const { staff, tempPassword } = await createStaffUser(tenant.id, { role: "OWNER" }, { name, email, role });
  console.info(`Acesso criado: ${staff.email} (${staff.role})\nSenha provisória: ${tempPassword}\nEntre em ${process.env.APP_URL ?? "http://localhost:3000"}/admin/entrar e troque a senha.`);
}

main().catch((e) => { console.error(e.message ?? e); process.exit(1); }).finally(() => prisma.$disconnect());
