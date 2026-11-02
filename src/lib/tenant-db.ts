import { Prisma } from "@prisma/client";
import { prisma } from "./db";

/** Modelos que pertencem a um estabelecimento e precisam de isolamento. */
export const TENANT_MODELS = new Set<string>([
  "Membership",
  "Customer",
  "Consent",
  "Professional",
  "Service",
  "ProfessionalService",
  "WorkingHours",
  "TimeOff",
  "Appointment",
  "AppointmentEvent",
  "SiteContent",
  "OutboxMessage",
  "AuditLog",
  "StaffUser",
  "StaffSession",
]);

const WHERE_MANY = new Set(["findMany", "findFirst", "findFirstOrThrow", "count", "aggregate", "groupBy", "updateMany", "deleteMany", "updateManyAndReturn"]);
const WHERE_UNIQUE = new Set(["findUnique", "findUniqueOrThrow", "update", "delete"]);

/**
 * Cliente Prisma restrito a um estabelecimento.
 * - Toda leitura/alteração recebe `tenantId` no filtro.
 * - Toda criação recebe `tenantId` nos dados (sobrescrevendo qualquer valor enviado).
 * Assim, mesmo um bug na tela não consegue ler ou alterar dados de outro estabelecimento.
 */
export function forTenant(tenantId: string) {
  if (!tenantId) throw new Error("tenantId obrigatório");
  return prisma.$extends({
    name: "tenant-scope",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!model || !TENANT_MODELS.has(model)) return query(args);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a: any = args ?? {};
          if (WHERE_MANY.has(operation)) {
            a.where = a.where ? { AND: [a.where, { tenantId }] } : { tenantId };
          } else if (WHERE_UNIQUE.has(operation)) {
            a.where = { ...a.where, tenantId };
          } else if (operation === "upsert") {
            a.where = { ...a.where, tenantId };
            a.create = { ...a.create, tenantId };
            if (a.update && "tenantId" in a.update) delete a.update.tenantId;
          } else if (operation === "create") {
            a.data = { ...a.data, tenantId };
          } else if (operation === "createMany" || operation === "createManyAndReturn") {
            a.data = (Array.isArray(a.data) ? a.data : [a.data]).map((d: object) => ({ ...d, tenantId }));
          }
          if ((operation === "update" || operation === "updateMany") && a.data && "tenantId" in a.data) {
            delete a.data.tenantId; // nunca permitir mover registro entre estabelecimentos
          }
          return query(a);
        },
      },
    },
  });
}

export type TenantDb = ReturnType<typeof forTenant>;
export type TenantTx = Parameters<Parameters<TenantDb["$transaction"]>[0]>[0];

export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/** Violação da restrição appointment_no_overlap (SQLSTATE 23P01). */
export function isOverlapViolation(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("appointment_no_overlap") || msg.includes("23P01");
}
