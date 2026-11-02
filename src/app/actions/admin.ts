"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AppointmentStatus, StaffRole } from "@prisma/client";
import { requireStaff } from "@/lib/staff-session";
import { forTenant } from "@/lib/tenant-db";
import { prisma } from "@/lib/db";
import { parseBRLToCents } from "@/lib/money";
import { hhmmToMinutes, isIsoDate, localDateMinutesToInstant } from "@/lib/time";
import { normalizePhoneBR } from "@/lib/phone";
import { siteContentSchema, parseSiteContent } from "@/lib/site-content";
import { audit } from "@/domain/audit";
import { createBooking, rescheduleAppointment, transitionAppointment } from "@/domain/booking";
import { DomainError } from "@/domain/errors";
import { createStaffUser, resetStaffPassword, setStaffActive, setStaffRole } from "@/domain/staff";
import { processOutbox, retryDeadMessage } from "@/domain/outbox";
import { after } from "next/server";

const flushSoon = () => after(() => processOutbox({ limit: 10 }).catch((e) => console.error("[outbox]", e)));

export type AdminState = { error?: string; ok?: string };
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const fail = (e: unknown): AdminState => {
  if (e instanceof DomainError) return { error: e.message };
  if (e instanceof z.ZodError) return { error: e.issues[0].message };
  if (e instanceof Error && /Horário inválido|Valor inválido/.test(e.message)) return { error: e.message };
  console.error(e);
  return { error: "Não foi possível salvar. Verifique os dados." };
};

// ---------- Serviços ----------

const serviceSchema = z.object({
  name: z.string().min(2, "Nome obrigatório").max(120),
  description: z.string().max(1000).optional(),
  durationMin: z.coerce.number().int().min(5, "Duração mínima de 5 min").max(600),
  bufferMin: z.coerce.number().int().min(0).max(240),
  sortOrder: z.coerce.number().int().min(0).max(999),
  active: z.boolean(),
});

export async function saveService(_p: AdminState, f: FormData): Promise<AdminState> {
  const ctx = await requireStaff("ADMIN");
  try {
    const data = serviceSchema.parse({
      name: str(f, "name"),
      description: str(f, "description") || undefined,
      durationMin: str(f, "durationMin"),
      bufferMin: str(f, "bufferMin") || 0,
      sortOrder: str(f, "sortOrder") || 0,
      active: f.get("active") === "on",
    });
    const priceCents = parseBRLToCents(str(f, "price"));
    const db = forTenant(ctx.tenant.id);
    const id = str(f, "id");
    const row = id
      ? await db.service.update({ where: { id }, data: { ...data, description: data.description ?? null, priceCents } })
      : await db.service.create({ data: { ...data, priceCents } as never });
    // Primeiro serviço: habilita para todas as profissionais ativas
    if (!id) {
      const pros = await db.professional.findMany({ where: { active: true }, select: { id: true } });
      if (pros.length) await db.professionalService.createMany({ data: pros.map((p) => ({ professionalId: p.id, serviceId: row.id })) as never, skipDuplicates: true });
    }
    await audit(ctx.tenant.id, ctx.user.id, id ? "service.update" : "service.create", "Service", row.id, { ...data, priceCents });
    revalidatePath("/admin/servicos");
    revalidatePath("/");
    return { ok: "Serviço salvo." };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Profissionais e horários ----------

export async function saveProfessional(_p: AdminState, f: FormData): Promise<AdminState> {
  const ctx = await requireStaff("ADMIN");
  try {
    const name = z.string().min(2, "Nome obrigatório").max(120).parse(str(f, "name"));
    const db = forTenant(ctx.tenant.id);
    const id = str(f, "id");
    const active = f.get("active") === "on";
    const serviceIds = f.getAll("serviceIds").map(String);
    const validServices = await db.service.findMany({ where: { id: { in: serviceIds } }, select: { id: true } });

    // Horários: para cada dia, até duas janelas "HH:MM"-"HH:MM"
    const hours: { weekday: number; startMin: number; endMin: number }[] = [];
    for (let d = 0; d < 7; d++) {
      for (const w of [1, 2]) {
        const s = str(f, `h${d}_${w}_start`);
        const e = str(f, `h${d}_${w}_end`);
        if (!s && !e) continue;
        const startMin = hhmmToMinutes(s);
        const endMin = hhmmToMinutes(e);
        if (startMin >= endMin) throw new DomainError("HOURS", "O fim do expediente precisa ser depois do início.");
        hours.push({ weekday: d, startMin, endMin });
      }
    }

    const pro = await db.$transaction(async (tx) => {
      const p = id
        ? await tx.professional.update({ where: { id }, data: { name, active, bio: str(f, "bio") || null } })
        : await tx.professional.create({ data: { name, active, bio: str(f, "bio") || null } as never });
      await tx.professionalService.deleteMany({ where: { professionalId: p.id } });
      if (validServices.length) await tx.professionalService.createMany({ data: validServices.map((s) => ({ professionalId: p.id, serviceId: s.id })) as never });
      await tx.workingHours.deleteMany({ where: { professionalId: p.id } });
      if (hours.length) await tx.workingHours.createMany({ data: hours.map((h) => ({ ...h, professionalId: p.id })) as never });
      return p;
    });
    await audit(ctx.tenant.id, ctx.user.id, id ? "professional.update" : "professional.create", "Professional", pro.id, { name, active, services: validServices.length, hours });
    revalidatePath("/admin/profissionais");
    if (!id) redirect(`/admin/profissionais/${pro.id}?ok=1`);
    return { ok: "Profissional salva." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect
    return fail(e);
  }
}

// ---------- Bloqueios (folgas, feriados, férias) ----------

export async function createTimeOff(_p: AdminState, f: FormData): Promise<AdminState> {
  const ctx = await requireStaff("STAFF");
  try {
    const date = str(f, "date");
    const endDate = str(f, "endDate") || date;
    if (!isIsoDate(date) || !isIsoDate(endDate) || endDate < date) throw new DomainError("DATE", "Datas inválidas.");
    const allDay = f.get("allDay") === "on";
    const tz = ctx.tenant.timezone;
    const startAt = localDateMinutesToInstant(date, allDay ? 0 : hhmmToMinutes(str(f, "start")), tz);
    const endAt = allDay ? localDateMinutesToInstant(endDate, 1440, tz) : localDateMinutesToInstant(endDate, hhmmToMinutes(str(f, "end")), tz);
    if (endAt <= startAt) throw new DomainError("DATE", "O fim precisa ser depois do início.");
    const professionalId = str(f, "professionalId") || null;
    const db = forTenant(ctx.tenant.id);
    if (professionalId && !(await db.professional.findFirst({ where: { id: professionalId } }))) throw new DomainError("PRO", "Profissional inválida.");
    const row = await db.timeOff.create({ data: { professionalId, startAt, endAt, reason: str(f, "reason") || null } as never });
    await audit(ctx.tenant.id, ctx.user.id, "timeoff.create", "TimeOff", row.id, { startAt, endAt, professionalId });
    revalidatePath("/admin/agenda");
    return { ok: "Bloqueio criado. Reservas já existentes nesse período não foram alteradas." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteTimeOff(id: string) {
  const ctx = await requireStaff("STAFF");
  await forTenant(ctx.tenant.id).timeOff.deleteMany({ where: { id } });
  await audit(ctx.tenant.id, ctx.user.id, "timeoff.delete", "TimeOff", id);
  revalidatePath("/admin/agenda");
}

// ---------- Agendamentos pela equipe ----------

export async function staffTransition(appointmentId: string, to: AppointmentStatus, note?: string): Promise<AdminState> {
  const ctx = await requireStaff("STAFF");
  try {
    await transitionAppointment(ctx.tenant.id, appointmentId, to, { type: "STAFF", userId: ctx.user.id }, { note });
    flushSoon();
    await audit(ctx.tenant.id, ctx.user.id, "appointment.status", "Appointment", appointmentId, { to, note });
    revalidatePath("/admin/agenda");
    revalidatePath("/admin");
    return { ok: "Atualizado." };
  } catch (e) {
    return fail(e);
  }
}

export async function staffBook(_p: AdminState, f: FormData): Promise<AdminState> {
  const ctx = await requireStaff("STAFF");
  try {
    const db = forTenant(ctx.tenant.id);
    const date = str(f, "date");
    if (!isIsoDate(date)) throw new DomainError("DATE", "Data inválida.");
    const startAt = localDateMinutesToInstant(date, hhmmToMinutes(str(f, "time")), ctx.tenant.timezone);
    let customerId = str(f, "customerId");
    if (!customerId) {
      const name = z.string().min(3, "Informe o nome da cliente.").max(120).parse(str(f, "newName"));
      const phone = normalizePhoneBR(str(f, "newPhone"));
      if (!phone) throw new DomainError("PHONE", "WhatsApp da cliente inválido.");
      const existing = await db.customer.findFirst({ where: { phone } });
      customerId = existing?.id ?? (await db.customer.create({ data: { name, phone, allowEmail: false, allowWhatsapp: false, profileComplete: false } as never })).id;
    }
    const rescheduleId = str(f, "rescheduleId");
    const common = { professionalId: str(f, "professionalId") || null, startAt, idempotencyKey: str(f, "idempotencyKey") || randomUUID(), allowOutsideHours: f.get("encaixe") === "on" };
    const appt = rescheduleId
      ? await rescheduleAppointment(ctx.tenant.id, rescheduleId, common, { type: "STAFF", userId: ctx.user.id })
      : (await createBooking(ctx.tenant.id, { ...common, serviceId: str(f, "serviceId"), customerId, source: "admin", notes: str(f, "notes") || null }, { type: "STAFF", userId: ctx.user.id })).appointment;
    flushSoon();
    await audit(ctx.tenant.id, ctx.user.id, rescheduleId ? "appointment.reschedule" : "appointment.create", "Appointment", appt.id, { encaixe: common.allowOutsideHours });
    revalidatePath("/admin/agenda");
    return { ok: rescheduleId ? "Reagendado." : "Agendamento criado." };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Conteúdo do site ----------

const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);

export async function saveSiteContent(_p: AdminState, f: FormData): Promise<AdminState> {
  const ctx = await requireStaff("ADMIN");
  try {
    const db = forTenant(ctx.tenant.id);
    const current = parseSiteContent((await db.siteContent.findFirst())?.data);
    const authorized = f.get("mediaAuthorized") === "on";
    const whatsapp = str(f, "whatsapp") ? normalizePhoneBR(str(f, "whatsapp")) : "";
    if (whatsapp === null) throw new DomainError("PHONE", "WhatsApp inválido.");
    const policiesChanged = current.policies.privacy !== str(f, "privacy") || current.policies.terms !== str(f, "terms");
    const data = siteContentSchema.parse({
      brand: { displayName: str(f, "displayName") || "Milly Rodrigues", tagline: str(f, "tagline"), logoUrl: str(f, "logoUrl"), primaryColor: str(f, "primaryColor") || "#9d5c63" },
      about: { title: str(f, "aboutTitle"), text: str(f, "aboutText") },
      contact: { whatsapp, instagram: str(f, "instagram"), email: str(f, "email"), address: str(f, "address"), mapsUrl: str(f, "mapsUrl"), hoursText: str(f, "hoursText") },
      gallery: lines(str(f, "gallery")).map((l) => { const [url, alt = ""] = l.split("|").map((x) => x.trim()); return { url, alt, authorized }; }),
      testimonials: lines(str(f, "testimonials")).map((l) => { const [author, ...rest] = l.split("|"); return { author: author.trim(), text: rest.join("|").trim(), authorized }; }),
      faq: str(f, "faq").split(/\n-{3,}\n/).map((b) => b.trim()).filter(Boolean).map((b) => { const [q, ...a] = b.split("\n"); return { q: q.trim(), a: a.join("\n").trim() }; }),
      policies: {
        cancellation: str(f, "cancellation"),
        privacy: str(f, "privacy"),
        terms: str(f, "terms"),
        version: policiesChanged ? String(Number(current.policies.version || "1") + 1) : current.policies.version,
      },
      legal: { companyName: str(f, "companyName"), document: str(f, "document") },
    });
    for (const u of [data.brand.logoUrl, data.contact.instagram, data.contact.mapsUrl, ...data.gallery.map((g) => g.url)]) {
      if (u && !/^https:\/\//.test(u)) throw new DomainError("URL", `Endereço precisa começar com https:// (${u.slice(0, 40)})`);
    }
    await db.siteContent.upsert({ where: { tenantId: ctx.tenant.id }, create: { data } as never, update: { data } });
    await audit(ctx.tenant.id, ctx.user.id, "site.update", "SiteContent", null, { policiesVersion: data.policies.version });
    revalidatePath("/", "layout");
    return { ok: "Site atualizado." };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Configurações ----------

export async function saveSettings(_p: AdminState, f: FormData): Promise<AdminState> {
  const ctx = await requireStaff("OWNER");
  try {
    const data = z
      .object({
        name: z.string().min(2).max(120),
        timezone: z.string().refine((tz) => { try { new Intl.DateTimeFormat("pt-BR", { timeZone: tz }); return true; } catch { return false; } }, "Fuso horário inválido"),
        minLeadMinutes: z.coerce.number().int().min(0).max(10080),
        cancelMinHours: z.coerce.number().int().min(0).max(168),
        slotStepMinutes: z.coerce.number().int().min(5).max(120),
        maxDaysAhead: z.coerce.number().int().min(1).max(365),
        notificationEmail: z.union([z.literal(""), z.string().email("E-mail inválido")]),
      })
      .parse(Object.fromEntries(["name", "timezone", "minLeadMinutes", "cancelMinHours", "slotStepMinutes", "maxDaysAhead", "notificationEmail"].map((k) => [k, str(f, k)])));
    await prisma.tenant.update({ where: { id: ctx.tenant.id }, data: { ...data, notificationEmail: data.notificationEmail || null } });
    await audit(ctx.tenant.id, ctx.user.id, "tenant.settings", "Tenant", ctx.tenant.id, data);
    revalidatePath("/admin/configuracoes");
    return { ok: "Configurações salvas." };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Equipe e licenças ----------

export type StaffState = AdminState & { tempPassword?: string; forEmail?: string };

export async function createStaffAction(_p: StaffState, f: FormData): Promise<StaffState> {
  const ctx = await requireStaff("ADMIN");
  try {
    const role = (["OWNER", "ADMIN", "STAFF"].includes(str(f, "role")) ? str(f, "role") : "STAFF") as StaffRole;
    const { staff, tempPassword } = await createStaffUser(ctx.tenant.id, ctx.staff, { name: str(f, "name"), email: str(f, "email"), role, professionalId: str(f, "professionalId") || null });
    await audit(ctx.tenant.id, ctx.user.id, "staff.create", "StaffUser", staff.id, { email: staff.email, role });
    revalidatePath("/admin/equipe");
    return { ok: "Acesso criado. Envie a senha provisória para a colaboradora; ela vai trocar no primeiro acesso.", tempPassword, forEmail: staff.email };
  } catch (e) {
    return fail(e);
  }
}

export async function setStaffActiveAction(staffId: string, active: boolean): Promise<AdminState> {
  const ctx = await requireStaff("ADMIN");
  try {
    await setStaffActive(ctx.tenant.id, ctx.staff, staffId, active);
    await audit(ctx.tenant.id, ctx.user.id, active ? "staff.activate" : "staff.deactivate", "StaffUser", staffId);
    revalidatePath("/admin/equipe");
    return { ok: active ? "Licença liberada." : "Acesso desativado." };
  } catch (e) {
    return fail(e);
  }
}

export async function resetStaffPasswordAction(staffId: string): Promise<StaffState> {
  const ctx = await requireStaff("ADMIN");
  try {
    const tempPassword = await resetStaffPassword(ctx.tenant.id, ctx.staff, staffId);
    await audit(ctx.tenant.id, ctx.user.id, "staff.reset_password", "StaffUser", staffId);
    return { ok: "Senha redefinida.", tempPassword };
  } catch (e) {
    return fail(e);
  }
}

export async function setStaffRoleAction(staffId: string, role: StaffRole): Promise<AdminState> {
  const ctx = await requireStaff("OWNER");
  try {
    await setStaffRole(ctx.tenant.id, ctx.staff, staffId, role);
    await audit(ctx.tenant.id, ctx.user.id, "staff.role", "StaffUser", staffId, { role });
    revalidatePath("/admin/equipe");
    return { ok: "Papel atualizado." };
  } catch (e) {
    return fail(e);
  }
}

// ---------- Mensagens ----------

export async function retryMessage(id: string) {
  const ctx = await requireStaff("ADMIN");
  await retryDeadMessage(ctx.tenant.id, id);
  await audit(ctx.tenant.id, ctx.user.id, "outbox.retry", "OutboxMessage", id);
  revalidatePath("/admin/mensagens");
}

export async function markPhoneVerified(customerId: string) {
  const ctx = await requireStaff("STAFF");
  await forTenant(ctx.tenant.id).customer.updateMany({ where: { id: customerId }, data: { phoneVerifiedAt: new Date() } });
  await audit(ctx.tenant.id, ctx.user.id, "customer.phone_verified", "Customer", customerId);
  revalidatePath(`/admin/clientes/${customerId}`);
}
