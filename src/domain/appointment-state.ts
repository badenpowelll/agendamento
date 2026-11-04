import type { AppointmentStatus, ActorType } from "@prisma/client";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  PENDING: "Aguardando sinal",
  CONFIRMED: "Confirmado",
  RECONFIRMED: "Presença reconfirmada",
  CHECKED_IN: "Cliente chegou",
  IN_SERVICE: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
  RESCHEDULED: "Reagendado",
};

/** Estados que ainda ocupam a agenda e podem receber lembretes. */
export const ACTIVE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "RECONFIRMED", "CHECKED_IN", "IN_SERVICE"];
export const UPCOMING_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "RECONFIRMED"];

/** Transições permitidas para a equipe. RESCHEDULED só é aplicado pelo fluxo de reagendamento. */
const STAFF_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["RECONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  RECONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["IN_SERVICE", "CANCELLED"],
  IN_SERVICE: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  RESCHEDULED: [],
};

/** A cliente só pode reconfirmar a presença ou cancelar. */
const CUSTOMER_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
  PENDING: ["CANCELLED"],
  CONFIRMED: ["RECONFIRMED", "CANCELLED"],
  RECONFIRMED: ["CANCELLED"],
};

/** O sistema não cancela nem marca falta sozinho (regra do negócio). */
const SYSTEM_TRANSITIONS: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {};

export function allowedTransitions(from: AppointmentStatus, actor: ActorType): AppointmentStatus[] {
  if (actor === "STAFF") return STAFF_TRANSITIONS[from];
  if (actor === "CUSTOMER") return CUSTOMER_TRANSITIONS[from] ?? [];
  return SYSTEM_TRANSITIONS[from] ?? [];
}

export function canTransition(from: AppointmentStatus, to: AppointmentStatus, actor: ActorType): boolean {
  return allowedTransitions(from, actor).includes(to);
}
